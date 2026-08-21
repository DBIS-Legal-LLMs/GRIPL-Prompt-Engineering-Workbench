package de.mertendieckmann.griplbackend.model.dto

/**
 * Represents a prompt, which is a named collection of prompt versions.
 *
 * @property id Unique identifier
 * @property name Descriptive name of the prompt
 * @property createdAt Timestamp when the prompt was created
 * @property updatedAt Timestamp when the prompt was last modified
 */
data class Prompt(
    val id: Long,
    val name: String,
    val createdAt: String, 
    val updatedAt: String
) {
    companion object {
        fun fromRow(id: Long, name: String, createdAt: String, updatedAt: String): Prompt {
            return Prompt(id, name, createdAt, updatedAt)
        }
    }
}