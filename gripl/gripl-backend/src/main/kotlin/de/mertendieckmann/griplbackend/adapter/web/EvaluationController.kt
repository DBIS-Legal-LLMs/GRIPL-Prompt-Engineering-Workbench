package de.mertendieckmann.griplbackend.adapter.web

import de.mertendieckmann.griplbackend.adapter.web.utils.ControllerUtils
import de.mertendieckmann.griplbackend.evaluation.MultiEvaluationRunner
import de.mertendieckmann.griplbackend.model.dto.EvaluationMetadataReport
import de.mertendieckmann.griplbackend.model.dto.EvaluationReportStepInfo
import de.mertendieckmann.griplbackend.model.dto.ModelReportEnvelope
import de.mertendieckmann.griplbackend.model.dto.MultiEvaluationRequest
import de.mertendieckmann.griplbackend.model.dto.PromptInfo
import io.swagger.v3.oas.annotations.Operation
import kotlinx.coroutines.flow.Flow
import org.springframework.core.env.Environment
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/gdpr/evaluation")
class EvaluationController(
    private val multiEvaluationRunner: MultiEvaluationRunner,
    private val env: Environment
) {

    @Operation(summary = "Evaluates the classification algorithm against the dataset (markdown)")
    @PostMapping("/markdown", produces = [MediaType.TEXT_MARKDOWN_VALUE])
    suspend fun evaluate(@RequestBody request: MultiEvaluationRequest): String {
        val sb = StringBuilder()
        var currentGroup: ReportGroup? = null
        val resolvedRequest = ControllerUtils.resolveEnvironmentVariables(request, env)
            ?: throw IllegalArgumentException("Invalid request after resolving environment variables.")

        multiEvaluationRunner.runAll(resolvedRequest).collect { envelope ->
            val report = envelope.report
            
            if (report is EvaluationMetadataReport) {
                sb.appendLine(report.toMarkdown()).appendLine()
                return@collect
            }
            
            if (report is EvaluationReportStepInfo) {
                return@collect
            }
            
            val group = ReportGroup(
                runNumber = envelope.runNumber,
                modelLabel = envelope.modelLabel,
                promptInfo = envelope.promptInfo
            )
            
            if (currentGroup != group) {
                if (currentGroup != null) sb.appendLine()
                
                sb.appendLine("# Modell: ${group.modelLabel}")
                group.promptInfo?.let { sb.appendLine("## Prompt: ${it.displayName()}") }
                
                if (group.runNumber > 1) { sb.appendLine("_Durchlauf: ${group.runNumber}_") }
                
                sb.appendLine()
                currentGroup = group
            }
            
            report.toMarkdown()
                .takeIf { it.isNotBlank() }
                ?.let { 
                    sb.appendLine(it).appendLine()
                }
        }

        return sb.toString().trimEnd()
    }

    @Operation(summary = "Evaluates the classification algorithm against the dataset (NDJSON stream)")
    @PostMapping("/stream", produces = [MediaType.APPLICATION_NDJSON_VALUE])
    suspend fun evaluateStream(@RequestBody request: MultiEvaluationRequest): Flow<ModelReportEnvelope> {
        val resolvedRequest = ControllerUtils.resolveEnvironmentVariables(request, env)
            ?: throw IllegalArgumentException("Invalid request after resolving environment variables.")
        return multiEvaluationRunner.runAll(resolvedRequest)
    }
    
    data class ReportGroup(
        val runNumber: Int,
        val modelLabel: String,
        val promptInfo: PromptInfo?
    )
}
