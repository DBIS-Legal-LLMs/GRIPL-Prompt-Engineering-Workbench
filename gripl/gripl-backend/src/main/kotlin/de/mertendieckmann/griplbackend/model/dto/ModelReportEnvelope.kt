package de.mertendieckmann.griplbackend.model.dto

data class ModelReportEnvelope(
    val modelLabel: String,
    val report: EvaluationReport,
    val runNumber: Int = 1,
    val promptInfo: PromptInfo? = null
)

data class PromptInfo(
    val promptLabel: String?,
    val promptName: String?,
    val versionNumber: Int?,
    val classificationScope: ClassificationScope?,
    val isOverride: Boolean
) {
    fun displayName(): String = when {
        isOverride &&
            !promptName.isNullOrBlank() &&
            versionNumber != null ->
            "$promptName, Version $versionNumber (changed)"

        isOverride && !promptName.isNullOrBlank() ->
            "$promptName (unsaved)"

        isOverride ->
            "Unsaved Prompt"

        promptName != null && versionNumber != null ->
            "$promptName, Version $versionNumber"

        promptName != null ->
            promptName

        else ->
            "Unknown Prompt"
    }
}