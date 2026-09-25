package de.mertendieckmann.griplbackend.model.dto

import de.mertendieckmann.griplbackend.config.LlmConfig

data class MultiEvaluationRequest(
    val maxConcurrent: Int = 4,
    val models: List<ModelRunConfig>,
    val seed: Int?,
    val datasets: List<Int>,
    val evaluationDataIds: List<Int> = emptyList(),
    val repetitions: Int = 1,
    val useRag: Boolean = false,
    val ragMode: RagMode = RagMode.HYBRID,
    val evaluateRag: Boolean = true,
    val promptConfigurations: List<EvaluationPromptConfiguration>
)

data class ModelRunConfig(
    val label: String,
    val llmProps: LlmConfig.Companion.LlmPropsOverride? = null,
) {
    override fun toString(): String =
        "EvaluationRequest(label=$label, llmProps=${llmProps?.copy(apiKey = llmProps.apiKey?.let { "\"****\"" })})"
}

/**
 * Identifies one prompt configuration used during evaluation.
 *
 * If [promptVersionOverride] is present, its template, variables, and
 * classification scope take precedence over the persisted version. A completely
 * new unsaved prompt version has no prompt version ID.
 */
data class EvaluationPromptConfiguration(
    val promptLabel: String? = null,
    val promptVersionId: Long? = null,
    val promptVersionOverride: PromptVersionOverride? = null
)

/**
 * Unsaved prompt content used for testing before versioning it in the library.
 *
 * An override cannot represent the baseline prompt because the baseline behavior
 * should be immutable. 
 */
data class PromptVersionOverride(
    val template: String,
    val variables: List<Variable>,
    val classificationScope: ClassificationScope
) {
    fun toAnalysisPrompt(): AnalysisPrompt =
        AnalysisPrompt(
            template = template,
            variables = variables,
            classificationScope = classificationScope,
            isBaseline = false
        )
}
