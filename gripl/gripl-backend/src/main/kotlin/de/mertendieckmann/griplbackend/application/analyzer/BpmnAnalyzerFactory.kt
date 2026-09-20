package de.mertendieckmann.griplbackend.application.analyzer

import de.mertendieckmann.griplbackend.adapter.rag.RagApiClient
import de.mertendieckmann.griplbackend.model.dto.AnalysisPrompt
import dev.langchain4j.model.chat.ChatModel
import org.springframework.stereotype.Component

@Component
class BpmnAnalyzerFactory(
    private val ragApiClient: RagApiClient
) {
    fun createBpmnAnalyzer(chatModel: ChatModel, prompt: AnalysisPrompt): BpmnAnalyzer {
        return BpmnAnalyzer(chatModel, ragApiClient, prompt)
    }
}