package de.mertendieckmann.griplbackend.ai

import dev.langchain4j.memory.chat.ChatMemoryProvider
import dev.langchain4j.model.chat.ChatModel
import dev.langchain4j.service.AiServices

object PromptBpmnAnalysisAiServiceFactory {

    fun create(
        llm: ChatModel,
        memoryProvider: ChatMemoryProvider,
        systemPrompt: String
    ): PromptBpmnAnalysisAiService {
        return AiServices
            .builder(PromptBpmnAnalysisAiService::class.java)
            .chatModel(llm)
            .chatMemoryProvider(memoryProvider)
            .systemMessageProvider { _ -> systemPrompt }
            .build()
    }
}
