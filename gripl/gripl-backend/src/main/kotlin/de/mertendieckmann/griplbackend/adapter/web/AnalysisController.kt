package de.mertendieckmann.griplbackend.adapter.web

import de.mertendieckmann.griplbackend.adapter.web.utils.ControllerUtils
import de.mertendieckmann.griplbackend.application.DefaultPromptVersionNotConfiguredException
import de.mertendieckmann.griplbackend.application.PromptManagementService
import de.mertendieckmann.griplbackend.application.PromptTemplateRenderer
import de.mertendieckmann.griplbackend.application.analyzer.BpmnAnalyzerFactory
import de.mertendieckmann.griplbackend.config.LlmConfig
import de.mertendieckmann.griplbackend.model.dto.AnalysisEndpoint
import de.mertendieckmann.griplbackend.model.dto.AnalysisPrompt
import de.mertendieckmann.griplbackend.model.dto.AnalysisResponse
import de.mertendieckmann.griplbackend.model.dto.PromptVersionOverride
import de.mertendieckmann.griplbackend.model.dto.RagMode
import io.swagger.v3.oas.annotations.Operation
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.core.env.Environment
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.http.codec.multipart.FilePart
import org.springframework.http.codec.multipart.FormFieldPart
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import reactor.core.publisher.Mono
import reactor.core.scheduler.Schedulers

@RestController
@RequestMapping("/gdpr/analysis")
class AnalysisController(
    private val analyzerFactory: BpmnAnalyzerFactory,
    private val promptManagementService: PromptManagementService,
    private val llmConfig: LlmConfig,
    @Qualifier("analysisEndpoints") private val analysisEndpoints: List<AnalysisEndpoint>,
    private val env: Environment
) {

    @Operation(
        summary = "Get all available analysis endpoints",
        description = "Returns a list of all available analysis endpoints that can be used for GDPR analysis."
    )
    @GetMapping("/endpoints", produces = [MediaType.APPLICATION_JSON_VALUE])
    fun getAnalysisEndpoints(): ResponseEntity<List<AnalysisEndpoint>> {
        return ResponseEntity(analysisEndpoints, HttpStatus.OK)
    }

    @Operation(
        summary = "Analyzes BPMN-XML for GDPR relevance",
        description = "Analyzes a BPMN XML document using the selected prompt version " +
                "or prompt draft. Regular prompts may use RAG; the persisted baseline " +
                "prompt ignores RAG and receives the raw BPMN XML."
    )
    @PostMapping(
        "",
        consumes = [MediaType.MULTIPART_FORM_DATA_VALUE],
        produces = [MediaType.APPLICATION_JSON_VALUE]
    )
    fun analyzeBpmnForGdpr(
        @RequestPart("bpmnFile") file: FilePart,
        @RequestPart("promptVersionId", required = false) promptVersionIdPart: FormFieldPart?,
        @RequestPart("promptVersionOverride", required = false) promptVersionOverride: PromptVersionOverride?,
        @RequestPart("llmProps", required = false) llmPropsOverrides: LlmConfig.Companion.LlmPropsOverride? = null,
        @RequestPart("useRag", required = false) useRagPart: FormFieldPart?,
        @RequestPart("ragMode", required = false) ragModePart: FormFieldPart?
    ): Mono<ResponseEntity<AnalysisResponse>> {
        val useRag = useRagPart?.value()?.toBooleanStrictOrNull() ?: false
        val ragMode = parseRagMode(ragModePart)
        val analysisPrompt = getAnalysisPrompt(promptVersionIdPart, promptVersionOverride)
        val bpmnXmlMono: Mono<String> = ControllerUtils.getBpmnXmlMono(file)
        val resolvedLlmPropsOverride = ControllerUtils.resolveEnvironmentVariables(llmPropsOverrides, env)

        return bpmnXmlMono.flatMap { bpmnXml ->
            Mono.fromCallable {
                val llm = llmConfig.buildStrictJsonModelWithOverride(resolvedLlmPropsOverride)
                val analyzer = analyzerFactory.createBpmnAnalyzer(llm, analysisPrompt)
                analyzer.analyzeBpmnForGdpr(
                    bpmnXml = bpmnXml,
                    useRag = useRag,
                    ragMode = ragMode
                )
            }.subscribeOn(Schedulers.boundedElastic())
        }.map { ResponseEntity.ok(it) }
    }

    private fun parseRagMode(ragModePart: FormFieldPart?): RagMode {
        val raw = ragModePart?.value() ?: return RagMode.HYBRID
        return try {
            RagMode.fromString(raw)
        } catch (e: IllegalArgumentException) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, e.message)
        }
    }

    /**
     * Resolves the effective prompt for one analysis request.
     *
     * An override takes precedence over a persisted prompt version. If no override
     * or version ID is provided, the configured default version is used. Baseline
     * behavior can only be selected through a persisted baseline prompt version and
     * cannot be overridden.
     */
    private fun getAnalysisPrompt(
        promptVersionIdPart: FormFieldPart?,
        promptVersionOverride: PromptVersionOverride?
    ): AnalysisPrompt {
        val promptVersionId = promptVersionIdPart
            ?.value()
            ?.takeIf { it.isNotBlank() }
            ?.toLongOrNull()
            ?: if (promptVersionIdPart != null) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "promptVersionId must be a valid number")
            } else {
                null
            }

        val storedPromptVersion = promptVersionId?.let { promptManagementService.getPromptVersionById(it) }

        val isBaseline = storedPromptVersion?.promptId == 0L

        if (isBaseline && promptVersionOverride != null) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "The baseline prompt cannot be overridden.")
        }

        if (promptVersionOverride != null) {
            if (promptVersionOverride.template.isBlank()) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "The prompt template must not be blank.")
            }
            PromptTemplateRenderer.validate(promptVersionOverride.template)

            return promptVersionOverride.toAnalysisPrompt()
        }

        if (storedPromptVersion != null) {
            return storedPromptVersion.toAnalysisPrompt()
        }

        val defaultPromptVersion = promptManagementService.getDefaultPromptVersion()
            ?: throw DefaultPromptVersionNotConfiguredException()

        return defaultPromptVersion.toAnalysisPrompt()
    }
}