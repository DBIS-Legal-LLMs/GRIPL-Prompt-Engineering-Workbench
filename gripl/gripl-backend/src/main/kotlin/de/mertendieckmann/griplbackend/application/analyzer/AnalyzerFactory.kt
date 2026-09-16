package de.mertendieckmann.griplbackend.application.analyzer

import de.mertendieckmann.griplbackend.adapter.rag.RagApiClient
import de.mertendieckmann.griplbackend.model.dto.PromptVersion
import dev.langchain4j.model.chat.ChatModel
import org.springframework.stereotype.Component

@Component
class AnalyzerFactory(
    private val ragApiClient: RagApiClient
) {
    fun createPromptEngineeringAnalyzer(chatModel: ChatModel, promptVersion: PromptVersion): PromptBpmnAnalyzer {
        return PromptBpmnAnalyzer(chatModel, ragApiClient, promptVersion)
    }

    fun createBaselineAnalyzer(chatModel: ChatModel, activitiesOnly: Boolean): BaselineBpmnAnalyzer {
        return BaselineBpmnAnalyzer(chatModel, activitiesOnly )
    }
}