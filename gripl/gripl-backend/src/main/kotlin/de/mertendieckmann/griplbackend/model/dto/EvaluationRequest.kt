package de.mertendieckmann.griplbackend.model.dto

import de.mertendieckmann.griplbackend.config.LlmConfig

data class EvaluationRequest(
    var llmProps: LlmConfig.Companion.LlmPropsOverride? = null,
    val maxConcurrent: Int = 4,
    val datasets: List<Int>,
    val evaluationDataIds: List<Int> = emptyList(),
    val useRag: Boolean = false,
    val ragMode: RagMode = RagMode.HYBRID,
    val evaluateRag: Boolean = true,
    val promptConfiguration: EvaluationPromptConfiguration
) {
    override fun toString(): String =
        "EvaluationRequest(useRag=$useRag, ragMode=$ragMode, evaluateRag=$evaluateRag, promptConfiguration=$promptConfiguration, llmProps=${llmProps?.copy(apiKey = llmProps?.apiKey?.let { "\"****\"" })})"
}
