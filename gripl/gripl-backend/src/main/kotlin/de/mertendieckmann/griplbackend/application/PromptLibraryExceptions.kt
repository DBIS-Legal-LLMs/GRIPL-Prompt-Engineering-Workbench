package de.mertendieckmann.griplbackend.application

class PromptNotFoundException(promptId: Long) : RuntimeException("Prompt with ID $promptId does not exist")

class PromptVersionNotFoundException(promptVersionId: Long) : RuntimeException("Prompt version with ID $promptVersionId does not exist")

class PromptVersionConflictException(message: String) : RuntimeException(message)