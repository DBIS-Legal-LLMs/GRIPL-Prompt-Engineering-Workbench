package de.mertendieckmann.griplbackend.ai

import dev.langchain4j.memory.chat.ChatMemoryProvider
import dev.langchain4j.model.chat.ChatModel
import dev.langchain4j.service.AiServices

object BpmnAnalysisAiServiceFactory {

    fun create(
        llm: ChatModel,
        memoryProvider: ChatMemoryProvider,
        systemPrompt: String
    ): BpmnAnalysisAiService {
        return AiServices
            .builder(BpmnAnalysisAiService::class.java)
            .chatModel(llm)
            .chatMemoryProvider(memoryProvider)
            .systemMessageProvider { systemPrompt }
            .build()
    }
}
