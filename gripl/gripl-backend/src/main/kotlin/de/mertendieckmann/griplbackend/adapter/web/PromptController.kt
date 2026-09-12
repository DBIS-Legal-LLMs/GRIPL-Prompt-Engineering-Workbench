package de.mertendieckmann.griplbackend.adapter.web

import de.mertendieckmann.griplbackend.application.PromptManagementService
import de.mertendieckmann.griplbackend.model.dto.ClassificationScope
import de.mertendieckmann.griplbackend.model.dto.DefaultPromptSelectionOverview
import de.mertendieckmann.griplbackend.model.dto.Prompt
import de.mertendieckmann.griplbackend.model.dto.PromptVersion
import de.mertendieckmann.griplbackend.model.dto.Variable
import io.swagger.v3.oas.annotations.Operation
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/gdpr/prompts")
class PromptController(
    private val promptManagementService: PromptManagementService
) {
    @Operation(
        summary = "Get all prompts", 
        description = "Returns all prompts in the prompt library, ordered by their creation date ascending. " +
            "Prompt versions are loaded separately through the versions endpoint.")
    @GetMapping("", produces = [MediaType.APPLICATION_JSON_VALUE])
    fun getAllPrompts(): List<Prompt> = promptManagementService.getAllPrompts()
    
    @Operation(
        summary = "Get all prompt versions for a prompt",
        description = "Returns all versions belonging to the prompt identified by promptId, " +
            "ordered from the latest version to the oldest version."
    )
    @GetMapping("/{promptId}/versions", produces = [MediaType.APPLICATION_JSON_VALUE])
    fun getPromptVersionsForPrompt(@PathVariable promptId: Long): List<PromptVersion> = 
        promptManagementService.getPromptVersionsByPromptId(promptId)
    
    @Operation(
        summary = "Create a new prompt",
        description = "Creates a named prompt in the prompt library and returns the newly created prompt. " +
            "The prompt initially has no versions."
    )
    @PostMapping("", consumes = [MediaType.APPLICATION_JSON_VALUE], produces = [MediaType.APPLICATION_JSON_VALUE])
    fun createPrompt(@RequestBody request: CreatePromptRequest): ResponseEntity<Prompt> {
        val prompt = promptManagementService.createPrompt(request.promptName)
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(prompt)
    }
    
    @Operation(
        summary = "Rename a prompt",
        description = "Changes the name of an existing prompt. The new name must not be blank."
    )
    @PatchMapping("/{promptId}", consumes = [MediaType.APPLICATION_JSON_VALUE])
    fun renamePrompt(@PathVariable promptId: Long, @RequestBody request: RenamePromptRequest): ResponseEntity<Void> {
        promptManagementService.renamePrompt(promptId, request.newName)
        
        return ResponseEntity.noContent().build()
    }
    
    @Operation(
        summary = "Delete a prompt",
        description = "Deletes a prompt and all of its versions. " +
            "The operation is idempotent: deleting an already absent prompt is successful."
    )
    @DeleteMapping("/{promptId}")
    fun deletePrompt(@PathVariable promptId: Long): ResponseEntity<Void> {
        promptManagementService.deletePrompt(promptId)
        
        return ResponseEntity.noContent().build()
    }
    
    @Operation(
        summary = "Create a new prompt version",
        description = "Creates the next version of the prompt identified by promptId and returns it. " +
            "The version number is assigned automatically. The template and commit message must not be blank. " +
            "The classification scope is required and must be either 'ACTIVITIES_ONLY' or 'ALL_BPMN_ELEMENTS'."
    )
    @PostMapping("/{promptId}/versions", consumes = [MediaType.APPLICATION_JSON_VALUE], produces = [MediaType.APPLICATION_JSON_VALUE])
    fun createPromptVersion(
        @PathVariable promptId: Long,
        @RequestBody request: CreatePromptVersionRequest
    ): ResponseEntity<PromptVersion> {
        val promptVersion = promptManagementService.createPromptVersion(
            promptId,
            request.template,
            request.variables,
            request.classificationScope,
            request.commitMessage
        )
        
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(promptVersion)
    }
    
    @Operation(
        summary = "Delete a prompt version",
        description = "Deletes the specified prompt version only when it is the latest version of its prompt. " +
            "The operation is idempotent if the version is already absent."
    )
    @DeleteMapping("/versions/{promptVersionId}")
    fun deletePromptVersion(@PathVariable promptVersionId: Long): ResponseEntity<Void> {
        promptManagementService.deletePromptVersion(promptVersionId)
        
        return ResponseEntity.noContent().build()
    }
    
    @Operation(
        summary = "Set one prompt version as default",
        description = "Sets the specified prompt version as the default version used for regular GRIPL analyses. " +
            "Any previously configured default version is unset."
    )
    @PutMapping("/versions/{promptVersionId}/default")
    fun setDefaultPromptVersion(@PathVariable promptVersionId: Long): ResponseEntity<Void> {
        promptManagementService.setDefaultPromptVersion(promptVersionId)
        
        return ResponseEntity.noContent().build()
    }

    @Operation(
        summary = "Get default prompt selector data",
        description = "Returns compact meta data about the prompt versions available for default prompt selection " +
            "and the currently configured default selection. " + 
            "The defaultSelection field is null when no default version is configured."
    )
    @GetMapping("/default-selection", produces = [MediaType.APPLICATION_JSON_VALUE])
    fun getDefaultPromptSelectionOverview(): DefaultPromptSelectionOverview =
        promptManagementService.getDefaultPromptSelectionOverview()
}


data class CreatePromptRequest(
    val promptName: String
)

data class RenamePromptRequest(
    val newName: String
)

data class CreatePromptVersionRequest(
    val template: String,
    val variables: List<Variable>,
    val classificationScope: ClassificationScope,
    val commitMessage: String
)