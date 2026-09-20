package de.mertendieckmann.griplbackend.application

import de.mertendieckmann.griplbackend.model.dto.ClassificationScope
import de.mertendieckmann.griplbackend.model.dto.DefaultPromptSelection
import de.mertendieckmann.griplbackend.model.dto.DefaultPromptSelectionOverview
import de.mertendieckmann.griplbackend.model.dto.Prompt
import de.mertendieckmann.griplbackend.model.dto.PromptSelectionOption
import de.mertendieckmann.griplbackend.model.dto.PromptVersion
import de.mertendieckmann.griplbackend.model.dto.PromptVersionSelectionOption
import de.mertendieckmann.griplbackend.model.dto.Variable
import de.mertendieckmann.griplbackend.repository.PromptRepository
import de.mertendieckmann.griplbackend.repository.PromptVersionRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * Service for managing the prompt library.
 *
 * Coordinates prompt and prompt-version use cases for the frontend, including
 * creation, renaming, versioning, deletion, and selecting the default version,
 * by delegating persistence operations to the prompt repositories and handling
 * business logic.
 */
@Service
class PromptManagementService(
    val promptRepository: PromptRepository,
    val promptVersionRepository: PromptVersionRepository
) {
    /**
     * Creates a new prompt with the given name and returns the newly created prompt.
     *
     * @param promptName The name of the prompt to create
     * @return The newly created prompt
     * @throws IllegalArgumentException if the prompt name is blank
     * @throws IllegalStateException if the prompt could not be retrieved after creation
     */
    @Transactional
    fun createPrompt(promptName: String): Prompt {
        require(promptName.isNotBlank()) { "Prompt name must not be blank" }

        val promptId = promptRepository.createPrompt(promptName)
        return promptRepository.getPromptById(promptId)
            ?: throw IllegalStateException("Prompt with ID $promptId was created but could not be retrieved")
    }

    /**
     * Creates a new prompt version for the given prompt and returns the newly created prompt version.
     *
     * @param promptId The ID of the parent prompt
     * @param template The prompt template text
     * @param variables The variables used by the prompt
     * @param classificationScope The classification scope for this version
     * @param commitMessage The description of this version
     * @return The newly created prompt version
     * @throws IllegalArgumentException if the template or commit message is blank
     * @throws PromptNotFoundException if the parent prompt does not exist
     * @throws IllegalStateException if the prompt version could not be retrieved after creation
     */
    @Transactional
    fun createPromptVersion(
        promptId: Long,
        template: String,
        variables: List<Variable>,
        classificationScope: ClassificationScope,
        commitMessage: String
    ): PromptVersion {
        require(template.isNotBlank()) { "Template must not be blank" }
        PromptTemplateRenderer.validate(template)
        require(commitMessage.isNotBlank()) { "Commit message must not be blank" }

        if (promptRepository.getPromptById(promptId) == null) {
            throw PromptNotFoundException(promptId)
        }

        val nextVersionNumber = (promptVersionRepository.getLatestPromptVersionNumber(promptId) ?: 0) + 1

        val promptVersionId = promptVersionRepository.createPromptVersion(
            promptId,
            nextVersionNumber,
            template,
            variables,
            classificationScope,
            commitMessage
        )
        return promptVersionRepository.getPromptVersionById(promptVersionId)
            ?: throw IllegalStateException("Prompt version with ID $promptVersionId was created but could not be retrieved")
    }

    /**
     * Renames an existing prompt.
     *
     * @param promptId The ID of the prompt to rename
     * @param newName The new name for the prompt
     * @throws IllegalArgumentException if the new name is blank
     * @throws PromptNotFoundException if the prompt does not exist
     */
    fun renamePrompt(promptId: Long, newName: String) {
        require(newName.isNotBlank()) { "New prompt name must not be blank" }

        if (promptRepository.updatePromptName(promptId, newName) != 1) {
            throw PromptNotFoundException(promptId)
        }
    }

    /**
     * Deletes a prompt and all its versions.
     *
     * @param promptId The ID of the prompt to delete
     */
    fun deletePrompt(promptId: Long) {
        promptRepository.deletePrompt(promptId)
    }

    /**
     * Deletes a prompt version, but only if it is the latest version.
     *
     * @param promptVersionId The ID of the prompt version to delete
     * @throws PromptVersionConflictException if the version is not the latest version
     */
    @Transactional
    fun deletePromptVersion(promptVersionId: Long) {
        val promptVersionToDelete = promptVersionRepository.getPromptVersionById(promptVersionId)
            ?: return

        val latestVersionNumber = promptVersionRepository.getLatestPromptVersionNumber(promptVersionToDelete.promptId)

        if (promptVersionToDelete.versionNumber != latestVersionNumber) {
            throw PromptVersionConflictException("Only the latest version of a prompt can be deleted. Prompt version $promptVersionId is not the latest version.")
        }

        promptVersionRepository.deletePromptVersion(promptVersionId)
    }

    /**
     * Sets a prompt version as the default prompt.
     *
     * @param promptVersionId The prompt version to be set as the default
     * @throws IllegalStateException if the version could not be set as default
     */
    @Transactional
    fun setDefaultPromptVersion(promptVersionId: Long) {
        val promptVersion = promptVersionRepository.getPromptVersionById(promptVersionId)
            ?: throw PromptVersionNotFoundException(promptVersionId)

        if (promptVersion.isDefault)
            return

        promptVersionRepository.unsetDefaultPromptVersion()
        check(promptVersionRepository.setDefaultPromptVersion(promptVersionId) == 1) {
            "Failed to set prompt version $promptVersionId as default."
        }
    }

    /**
     * Returns the currently configured default prompt version or null if no default prompt version has been set.
     *
     * @return The default PromptVersion or null if no default prompt version has been set
     */
    fun getDefaultPromptVersion(): PromptVersion? = promptVersionRepository.getDefaultPromptVersion()

    /**
     * Returns meta information about the prompt versions available for default prompt selection and the
     * currently selected default version. Prompts without versions are not included because they have 
     * no selectable version.
     *
     * @return Overview of selectable prompt versions and the active default selection
     */
    @Transactional(readOnly = true)
    fun getDefaultPromptSelectionOverview(): DefaultPromptSelectionOverview {
        val candidates = promptVersionRepository.getDefaultPromptSelectionCandidates()

        val prompts = candidates
            .groupBy { it.promptId }
            .map { (promptId, promptCandidates) ->
                PromptSelectionOption(
                    promptId = promptId,
                    versions = promptCandidates.map { candidate ->
                        PromptVersionSelectionOption(
                            id = candidate.promptVersionId,
                            versionNumber = candidate.versionNumber
                        )
                    }
                )
            }

        val defaultSelection = candidates
            .firstOrNull { it.isDefault }
            ?.let { candidate ->
                DefaultPromptSelection(
                    promptId = candidate.promptId,
                    promptVersionId = candidate.promptVersionId
                )
            }

        return DefaultPromptSelectionOverview(
            prompts = prompts,
            defaultSelection = defaultSelection
        )
    }

    /**
     * Returns a list of all prompts in the database.
     *
     * @return List of all prompts in the database
     */
    fun getAllPrompts(): List<Prompt> = promptRepository.getAllPrompts()

    /**
     * Returns a list of all prompt versions in the database belonging to a specific prompt.
     *
     * @param promptId The ID of the prompt whose versions are requested
     * @return List of all prompt versions in the database belonging to the specified prompt
     */
    @Transactional(readOnly = true)
    fun getPromptVersionsByPromptId(promptId: Long): List<PromptVersion> {
        if (promptRepository.getPromptById(promptId) == null) {
            throw PromptNotFoundException(promptId)
        }
        return promptVersionRepository.getPromptVersionsByPromptId(promptId)
    }
    
    fun getPromptVersionById(promptVersionId: Long): PromptVersion = 
        promptVersionRepository.getPromptVersionById(promptVersionId)
            ?: throw PromptVersionNotFoundException(promptVersionId)
}