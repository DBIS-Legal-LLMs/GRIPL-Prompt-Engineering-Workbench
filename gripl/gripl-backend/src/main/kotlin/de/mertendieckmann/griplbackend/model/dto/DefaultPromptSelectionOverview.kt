package de.mertendieckmann.griplbackend.model.dto

/**
 * Lists every prompt that has at least one version together with lightweight 
 * version metadata. The default selection is null when no prompt version is 
 * configured as the default for regular analyses.
 */
data class DefaultPromptSelectionOverview(
    val prompts: List<PromptSelectionOption>,
    val defaultSelection: DefaultPromptSelection?
)

/**
 * Represents the selectable prompt versions belonging to a prompt.
 */
data class PromptSelectionOption(
    val promptId: Long,
    val versions: List<PromptVersionSelectionOption>
)

/**
 * Represents lightweight metadata for a prompt version selectable as default.
 */
data class PromptVersionSelectionOption(
    val id: Long,
    val versionNumber: Int
)

/**
 * Identifies the prompt and prompt version configured as the current default.
 */
data class DefaultPromptSelection(
    val promptId: Long,
    val promptVersionId: Long
)

/**
 * Metadata of a prompt version used for building the DefaultPromptSelectionOverview.
 */
data class DefaultPromptSelectionCandidate(
    val promptId: Long,
    val promptVersionId: Long,
    val versionNumber: Int,
    val isDefault: Boolean
)