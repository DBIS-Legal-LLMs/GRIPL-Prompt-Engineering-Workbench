package de.mertendieckmann.griplbackend.repository

import com.fasterxml.jackson.databind.ObjectMapper
import de.mertendieckmann.griplbackend.model.dto.ClassificationScope
import de.mertendieckmann.griplbackend.model.dto.DefaultPromptSelectionCandidate
import de.mertendieckmann.griplbackend.model.dto.PromptVersion
import de.mertendieckmann.griplbackend.model.dto.Variable
import org.postgresql.util.PGobject
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.core.RowMapper
import org.springframework.stereotype.Repository

/**
 * Repository for managing prompt versions.
 *
 * Provides methods to retrieve prompt version history, retrieve a single version,
 * create new versions, manage the default version, and delete versions from the database.
 */
@Repository
class PromptVersionRepository(
    private val jdbc: JdbcTemplate,
    private val objectMapper: ObjectMapper
) {
    private val mapper = RowMapper { rs, _ ->
        PromptVersion.fromRow(
            id = rs.getLong("id"),
            promptId = rs.getLong("prompt_id"),
            versionNumber = rs.getInt("version_number"),
            template = rs.getString("template"),
            variablesJson = rs.getString("variables"),
            classificationScopeRaw = rs.getString("classification_scope"),
            commitMessage = rs.getString("commit_message"),
            isDefault = rs.getBoolean("is_default"),
            createdAt = rs.getString("created_at")
        )
    }

    /**
     * Returns a List of all versions for a single prompt, ordered by descending version number.
     *
     * @param promptId The ID of the prompt whose versions should be loaded
     * @return List of prompt versions for the given prompt
     */
    fun getPromptVersionsByPromptId(promptId: Long): List<PromptVersion> {
        val sql = "SELECT * FROM prompt_version WHERE prompt_id = ? ORDER BY version_number DESC"
        return jdbc.query(sql, mapper, promptId)
    }

    /**
     * Returns a single prompt version by its ID or null if not found.
     *
     * @param id The ID of the prompt version
     * @return The prompt version if found, otherwise null
     */
    fun getPromptVersionById(id: Long): PromptVersion? {
        val sql = "SELECT * FROM prompt_version WHERE id = ?"
        return jdbc.query(sql, mapper, id).firstOrNull()
    }

    /**
     * Returns the latest version number for a given prompt or null if no versions exist.
     *
     * @param promptId The ID of the parent prompt
     * @return The latest version number, or null if no versions of this prompt exist
     */
    fun getLatestPromptVersionNumber(promptId: Long): Int? {
        val sql = "SELECT MAX(version_number) FROM prompt_version WHERE prompt_id = ?"
        return jdbc.queryForObject(sql, Int::class.java, promptId)
    }


    /**
     * Creates a new prompt version and returns its generated ID.
     *
     * @param promptId The ID of the parent prompt to which this version belongs
     * @param versionNumber The version number to store
     * @param template The prompt template text
     * @param variables The list of variables used by this version
     * @param classificationScope The classification scope for this version
     * @param commitMessage The commit message for this version
     * @return The generated ID of the newly created prompt version
     * @throws IllegalStateException if the database did not return an ID for the newly created prompt version
     */
    fun createPromptVersion(
        promptId: Long,
        versionNumber: Int,
        template: String,
        variables: List<Variable>,
        classificationScope: ClassificationScope,
        commitMessage: String
    ): Long {
        val variablesJson = objectMapper.writeValueAsString(variables)
        val variablesValue = PGobject().apply {
            type = "jsonb"
            value = variablesJson
        }
        val classificationScopeRaw = classificationScope.name
        val sql = """
            INSERT INTO prompt_version (
                prompt_id, 
                version_number, 
                template, 
                variables, 
                classification_scope, 
                commit_message, 
                is_default)
            VALUES (?, ?, ?, ?::jsonb, ?::classification_scope, ?, FALSE)
            RETURNING id
        """.trimIndent()

        return jdbc.queryForObject(
            sql,
            Long::class.java,
            promptId,
            versionNumber,
            template,
            variablesValue,
            classificationScopeRaw,
            commitMessage
        ) ?: throw IllegalStateException("Database did not return an ID for the created prompt version.")
    }

    /**
     * Returns the default prompt version or null if no default version is set.
     *
     * @return The default prompt version if set, otherwise null
     */
    fun getDefaultPromptVersion(): PromptVersion? {
        val sql = "SELECT * FROM prompt_version WHERE is_default = TRUE"
        return jdbc.query(sql, mapper).firstOrNull()
    }

    /**
     * Sets the default status of the prompt version with the given ID and returns the number of rows updated.
     *
     * The caller is responsible for unsetting any previously configured default version before this method 
     * is invoked.
     * 
     * @param id The ID of the prompt version to set as default
     * @return The number of rows updated (should be 0 or 1)
     */
    fun setDefaultPromptVersion(id: Long): Int {
        val sql = "UPDATE prompt_version SET is_default = TRUE WHERE id = ?"
        return jdbc.update(sql, id)
    }

    /**
     * Removes the default status of the prompt version currently set as the default.
     *
     * @return The number of rows updated (should be 0 or 1)
     */
    fun unsetDefaultPromptVersion(): Int {
        val sql = "UPDATE prompt_version SET is_default = FALSE WHERE is_default = TRUE"
        return jdbc.update(sql)
    }

    /**
     * Returns the lightweight prompt version data required to build the DefaultPromptSelectionOverview.
     *
     * @return A list of default prompt selection candidates, ordered by prompt ID and descending version number
     */
    fun getDefaultPromptSelectionCandidates(): List<DefaultPromptSelectionCandidate> {
        val sql = """
            SELECT
                pv.prompt_id,
                pv.id AS prompt_version_id,
                pv.version_number,
                pv.is_default
            FROM prompt_version pv 
            JOIN prompt p ON p.id = pv.prompt_id
            ORDER BY p.created_at ASC, pv.version_number DESC
        """.trimIndent()

        return jdbc.query(sql) { rs, _ ->
            DefaultPromptSelectionCandidate(
                promptId = rs.getLong("prompt_id"),
                promptVersionId = rs.getLong("prompt_version_id"),
                versionNumber = rs.getInt("version_number"),
                isDefault = rs.getBoolean("is_default")
            )
        }
    }

    /**
     * Deletes a prompt version by its ID and returns the number of rows deleted.
     *
     * @param id The ID of the prompt version to delete
     * @return The number of rows deleted (0 or 1)
     */
    fun deletePromptVersion(id: Long): Int {
        val sql = "DELETE FROM prompt_version WHERE id = ?"
        return jdbc.update(sql, id)
    }
}