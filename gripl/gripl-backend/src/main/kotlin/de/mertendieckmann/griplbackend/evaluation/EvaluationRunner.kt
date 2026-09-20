package de.mertendieckmann.griplbackend.evaluation

import de.mertendieckmann.griplbackend.application.BpmnExtractor
import de.mertendieckmann.griplbackend.application.PromptManagementService
import de.mertendieckmann.griplbackend.evaluation.metrics.MetricsAccumulator
import de.mertendieckmann.griplbackend.evaluation.service.Evaluator
import de.mertendieckmann.griplbackend.evaluation.service.RagasEvaluationService
import de.mertendieckmann.griplbackend.model.dto.*
import de.mertendieckmann.griplbackend.model.evaluation.EvaluationMetrics
import de.mertendieckmann.griplbackend.model.evaluation.EvaluationOutcome
import de.mertendieckmann.griplbackend.model.evaluation.RagMetrics
import de.mertendieckmann.griplbackend.repository.EvaluationDataRepository
import io.github.oshai.kotlinlogging.KotlinLogging
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.*
import org.springframework.stereotype.Component
import java.util.concurrent.atomic.AtomicInteger

@Component
class EvaluationRunner(
    private val evaluationDataRepository: EvaluationDataRepository,
    private val evaluator: Evaluator,
    private val ragasEvaluationService: RagasEvaluationService,
    private val promptManagementService: PromptManagementService
) {

    private val log = KotlinLogging.logger {}
    private val bpmnExtractor = BpmnExtractor()

    @OptIn(ExperimentalCoroutinesApi::class)
    fun run(request: EvaluationRequest): Flow<EvaluationReport> {
        val metricsAccumulator = MetricsAccumulator()
        val startedCounter = AtomicInteger(0)

        val classificationScope = resolveClassificationScope(request)
        val activitiesOnly = classificationScope == ClassificationScope.ACTIVITIES_ONLY
        val isBaseline = resolveIsBaseline(request)

        val entriesFlow = (if (request.evaluationDataIds.isNotEmpty()) {
            evaluationDataRepository.getEvaluationDataByIds(request.evaluationDataIds)
        } else {
            evaluationDataRepository.getEvaluationDataByDatasetIdsOrAll(request.datasets)
        }).sortedBy { it.id }.asFlow()

        log.info { "Starting evaluation with maxConcurrent=${request.maxConcurrent}; evaluateRag=${request.evaluateRag}" }

        return entriesFlow
            .flatMapMerge(concurrency = request.maxConcurrent.coerceAtLeast(1)) { entry ->
                flow {
                    val currentNumber = startedCounter.incrementAndGet()
                    emit(buildStepInfo(entry, currentNumber, entriesFlow.count()))

                    when (val outcome = evaluateSingleEntry(entry, request, activitiesOnly, isBaseline)) {
                        is EvaluationOutcome.Error -> {
                            metricsAccumulator.addError()
                            emit(outcome.errorReport)
                        }

                        is EvaluationOutcome.Success -> {
                            metricsAccumulator.add(outcome.metrics)
                            emit(outcome.testCaseReport)
                        }
                    }
                }
            }
            .onCompletion {
                emit(metricsAccumulator.toSummary())
            }
    }

    private suspend fun evaluateSingleEntry(
        entry: EvaluationData,
        evaluationRequest: EvaluationRequest,
        activitiesOnly: Boolean,
        isBaseline: Boolean
    ): EvaluationOutcome = try {
        evaluateEntryOrFailFast(entry, evaluationRequest, activitiesOnly, isBaseline)
    } catch (e: Exception) {
        EvaluationOutcome.Error(
            EvaluationReportError(
                testCaseId = entry.id,
                datasetId = entry.datasetId,
                testCaseName = entry.name ?: "Test Case ${entry.id}",
                errorMessage = e.message ?: "Unbekannter Fehler aufgetreten"
            )
        )
    }

    private suspend fun evaluateEntryOrFailFast(
        entry: EvaluationData,
        evaluationRequest: EvaluationRequest,
        activitiesOnly: Boolean,
        isBaseline: Boolean
    ): EvaluationOutcome {
        val actualResult = evaluator.evaluate(entry.bpmnXml, evaluationRequest)

        if (evaluationRequest.evaluateRag && actualResult.analysisResponse.ragPromptContext == null && !isBaseline) {
            return EvaluationOutcome.Error(
                EvaluationReportError(
                    testCaseId = entry.id,
                    datasetId = entry.datasetId,
                    testCaseName = entry.name ?: "Test Case ${entry.id}",
                    errorMessage = "RAG evaluation (evaluateRag=true) was requested, " +
                            "but the selected analysis did not return RAG context."
                )
            )
        }

        val bpmnModel = parseBpmn(entry.bpmnXml)
        val bpmnElements = bpmnExtractor.extractBpmnElements(bpmnModel)

        // With activitiesOnly, scoring is restricted to activities
        val scopeIds: Set<String>? = if (activitiesOnly) {
            classifiableElementIds(bpmnModel, activitiesOnly = true)
        } else null
        val expectedActivityIds = entry.expectedValues.map { it.value }
            .filter { scopeIds == null || it in scopeIds }
        val actualActivityIds = actualResult.expectedValues.map { it.value }
            .filter { scopeIds == null || it in scopeIds }

        // Display-name fallbacks for unnamed elements: names the analysis resolved take
        // precedence, then names derived from labeled flows (unnamed gateways/events) —
        // the same derivation the analyzer uses, so both report columns render alike.
        val labelOverrides = bpmnElements
            .mapNotNull { el -> el.derivedNameFromFlows()?.let { el.id to it } }
            .toMap() + actualResult.analysisResponse.criticalElements
            .mapNotNull { ce -> ce.name?.let { ce.id to it } }
            .toMap()

        val classification = computeClassificationSets(expectedActivityIds, actualActivityIds)
        val trueNegativesCount = computeTrueNegativesCount(
            bpmnModel = bpmnModel,
            truePositivesCount = classification.truePositiveIds.size,
            falsePositivesCount = classification.falsePositiveIds.size,
            falseNegativesCount = classification.falseNegativeIds.size,
            activitiesOnly = activitiesOnly
        )
        val perElementType = computePerElementTypeCounts(bpmnModel, classification, activitiesOnly)

        if (evaluationRequest.evaluateRag && actualResult.analysisResponse.ragContext.isNullOrEmpty() && !isBaseline) {
            log.warn { "RAG context missing or empty -> proceeding with evaluation but metrics might be affected for ${entry.id}" }
        }

        val ragMetrics: RagMetrics? =
            if (evaluationRequest.evaluateRag && actualActivityIds.isNotEmpty() && !isBaseline) {
                ragasEvaluationService.scoreTestCase(actualResult.analysisResponse, bpmnElements, scopeIds)
            } else {
                if (evaluationRequest.evaluateRag && actualActivityIds.isEmpty() && !isBaseline) {
                    log.info { "Skipping RAGAS evaluation for ${entry.id}: LLM returned no critical elements, nothing to score faithfulness against" }
                }
                null
            }

        val metrics = EvaluationMetrics(
            truePositives = classification.truePositiveIds.size,
            falsePositives = classification.falsePositiveIds.size,
            falseNegatives = classification.falseNegativeIds.size,
            trueNegatives = trueNegativesCount,
            isSuccessful = actualActivityIds.toSet() == expectedActivityIds.toSet(),
            amountOfRetries = actualResult.amountOfRetries,
            ragMetrics = ragMetrics,
            perElementType = perElementType
        )

        val testCaseReport = TestCaseReport(
            testCaseId = entry.id,
            testCaseName = entry.name,
            datasetId = entry.datasetId,
            imageSrc = buildPreviewUrl(
                testCaseId = entry.id,
                correctActivityIds = classification.truePositiveIds,
                falsePositiveIds = classification.falsePositiveIds,
                falseNegativeIds = classification.falseNegativeIds
            ),
            correctActivityIds = classification.truePositiveIds,
            falsePositiveIds = classification.falsePositiveIds,
            falseNegativeIds = classification.falseNegativeIds,
            expectedNamesWithIds = getNamesWithIds(bpmnModel, expectedActivityIds, labelOverrides),
            actualNamesWithIds = getNamesWithIds(bpmnModel, actualActivityIds, labelOverrides),
            isSuccessful = metrics.isSuccessful,
            result = actualResult.expectedValues,
            amountOfRetries = actualResult.amountOfRetries,
            perElementType = perElementType,
            ragMetrics = ragMetrics,
            // Expose the exact context bag sent to Ragas so the frontend can
            // display it next to each test case for manual audit.
            ragPromptContext = actualResult.analysisResponse.ragPromptContext
        )

        return EvaluationOutcome.Success(testCaseReport, metrics)
    }

    /**
     * Resolves the classification scope of the specified prompt in the evaluation request.
     *
     * Unsaved prompt content (promptVersionOverride) takes precedence over a persisted prompt version.
     */
    fun resolveClassificationScope(request: EvaluationRequest): ClassificationScope {
        val promptVersionOverride = request.promptConfiguration.promptVersionOverride

        if (promptVersionOverride != null) {
            return promptVersionOverride.classificationScope
        }

        val promptVersionId = request.promptConfiguration.promptVersionId
            ?: throw IllegalArgumentException("A promptVersionId is required when no prompt version override is provided.")

        return promptManagementService
            .getPromptVersionById(promptVersionId)
            .classificationScope
    }

    /**
     * Determines whether the specified prompt is the baseline prompt.
     *
     * Unsaved prompt overrides are never baseline prompts because the baseline 
     * behavior should remain immutable.
     */
    fun resolveIsBaseline(request: EvaluationRequest): Boolean {
        if (request.promptConfiguration.promptVersionOverride != null) {
            return false
        }

        val promptVersionId = request.promptConfiguration.promptVersionId
            ?: throw IllegalArgumentException("A promptVersionId is required when no prompt version override is provided.")

        return promptManagementService
            .getPromptVersionById(promptVersionId)
            .promptId == 0L
    }
}
