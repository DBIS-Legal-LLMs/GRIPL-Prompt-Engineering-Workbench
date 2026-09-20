package de.mertendieckmann.griplbackend.model.dto

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue

/**
 * Represents a specific version of a prompt.
 *
 * Parsing of JSON variables and classification scope is done during fromRow() construction.
 *
 * @property id Unique identifier of this version
 * @property promptId Foreign key to the parent prompt
 * @property versionNumber Version number (must be > 0)
 * @property template The actual prompt template text
 * @property variables List of variables (name-value pairs) used by this version
 * @property classificationScope Either ACTIVITIES_ONLY for classification of just activities or ALL_BPMN_ELEMENTS for classification of all BPMN elements
 * @property commitMessage Description of changes in this version
 * @property isDefault Indicates whether this version is the default version used for regular GRIPL analyses
 * @property createdAt Timestamp when this version was created
 */
data class PromptVersion(
    val id: Long,
    val promptId: Long,
    val versionNumber: Int,
    val template: String,
    val variables: List<Variable>,
    val classificationScope: ClassificationScope,
    val commitMessage: String,
    val isDefault: Boolean,
    val createdAt: String
) {
    companion object {
        private val mapper = jacksonObjectMapper()

        private fun parseVariables(variablesJson: String): List<Variable> {
            val trimmed = variablesJson.trim()
            if (trimmed.isEmpty() || trimmed == "[]") return emptyList()

            return try {
                mapper.readValue(trimmed)
            } catch (e: Exception) {
                emptyList()
            }
        }

        /**
         * Factory method to construct a PromptVersion object from a database row.
         *
         * @param id Unique identifier of this version
         * @param promptId Foreign key to the parent prompt
         * @param versionNumber Version number (must be > 0)
         * @param template The actual prompt template text
         * @param variablesJson JSON string containing the list of variables
         * @param classificationScopeRaw Raw string from database containing the classification scope of this prompt version
         * @param commitMessage Description of changes in this version
         * @param isDefault Indicates whether this version is the default version used for regular GRIPL analyses
         * @param createdAt Timestamp when this version was created
         * @throws IllegalArgumentException if classification scope is unknown
         */
        fun fromRow(
            id: Long,
            promptId: Long,
            versionNumber: Int,
            template: String,
            variablesJson: String,
            classificationScopeRaw: String,
            commitMessage: String,
            isDefault: Boolean,
            createdAt: String
        ): PromptVersion {
            val variables = parseVariables(variablesJson)
            val classificationScope = ClassificationScope.fromString(classificationScopeRaw)

            return PromptVersion(
                id = id,
                promptId = promptId,
                versionNumber = versionNumber,
                template = template,
                variables = variables,
                classificationScope = classificationScope,
                commitMessage = commitMessage,
                isDefault = isDefault,
                createdAt = createdAt
            )
        }
    }

    /**
     * Creates the effective analysis configuration for this prompt version, 
     * containing only the data required by the analysis layer.
     *
     * The baseline prompt is recognized by its reserved parent prompt ID.
     */
    fun toAnalysisPrompt(): AnalysisPrompt =
        AnalysisPrompt(
            template = template,
            variables = variables,
            classificationScope = classificationScope,
            isBaseline = promptId == 0L
        )
}

/**
 * A single injectable variable in a prompt template represented by a name-value pair.
 *
 * @property name Variable name
 * @property value The variable value to inject into the prompt template
 */
data class Variable(
    val name: String,
    val value: String
)

/**
 * Specifies whether a prompt classifies only activities or all BPMN elements (activities, events, gateways, data objects/stores).
 */
enum class ClassificationScope {
    ACTIVITIES_ONLY,
    ALL_BPMN_ELEMENTS;

    companion object {
        /**
         * Parses a string into a ClassificationScope enum value.
         *
         * @param raw Raw string from database containing the classification scope
         * @return The matching enum value
         * @throws IllegalArgumentException if the string does not match any classification scope
         */
        fun fromString(raw: String): ClassificationScope {
            return ClassificationScope.entries
                .firstOrNull { it.name == raw.trim().uppercase() }
                ?: throw IllegalArgumentException("Unknown classification scope: $raw")
        }
    }
}

