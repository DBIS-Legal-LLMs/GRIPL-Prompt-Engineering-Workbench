package de.mertendieckmann.griplbackend.repository

import de.mertendieckmann.griplbackend.model.dto.Prompt
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.core.RowMapper
import org.springframework.stereotype.Repository

/**
 * Repository for managing prompts.
 * 
 * Provides methods to store, retrieve and delete prompts from the database.
 */
@Repository
class PromptRepository(
    private val jdbc: JdbcTemplate
) { 
    /**
     * RowMapper converts database rows into Prompt objects.
     */
    private val mapper = RowMapper { rs, _ ->
        Prompt.fromRow(
            id = rs.getLong("id"),
            name = rs.getString("name"),
            createdAt = rs.getString("created_at"),
            updatedAt = rs.getString("updated_at")
        )
    }
    
    /**
     * Returns a List of all prompts in the database, ordered by ascending creation date.
     *
     * @return List of all prompts in the database
     */
    fun getAllPrompts(): List<Prompt> {
        val sql = "SELECT * FROM prompt ORDER BY created_at ASC"
        return jdbc.query(sql, mapper)
    }
    
    /**
     * Returns a prompt by its ID or null if not found.
     *
     * @param id The ID of the prompt
     * @return The prompt if found, null otherwise
     */
    fun getPromptById(id: Long): Prompt? {
        val sql = "SELECT * FROM prompt WHERE id = ?"
        return jdbc.query(sql, mapper, id).firstOrNull()
    }
    
    /**
     * Creates a new prompt and returns its generated ID.
     *
     * @param name The name of the prompt
     * @return The ID of the newly created prompt
     * @throws IllegalStateException if the database did not return an ID for the newly created prompt
     */
    fun createPrompt(name: String) : Long {
        val sql = "INSERT INTO prompt (name) VALUES (?) RETURNING id"
        return jdbc.queryForObject(sql, Long::class.java, name) 
            ?: throw IllegalStateException("Database did not return an ID for the created prompt.")
    }
    
    /**
     * Updates the name of an existing prompt and returns the number of rows updated.
     *
     * @param id The ID of the prompt
     * @param newName New name for the prompt
     * @return The number of rows updated (0 or 1)
     */
    fun updatePromptName(id: Long, newName: String): Int {
        val sql = "UPDATE prompt SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        return jdbc.update(sql, newName, id)
    }
    
    /**
     * Deletes a prompt and returns the number of rows deleted.
     * (Deletes also its versions via cascade-delete in the database.)
     *
     * @param id The ID of the prompt
     * @return The number of rows deleted (0 or 1)
     */
    fun deletePrompt(id: Long): Int {
        val sql = "DELETE FROM prompt WHERE id = ?"
        return jdbc.update(sql, id)
    }
}