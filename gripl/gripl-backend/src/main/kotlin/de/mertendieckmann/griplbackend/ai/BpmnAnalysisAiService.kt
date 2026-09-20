package de.mertendieckmann.griplbackend.ai

import de.mertendieckmann.griplbackend.model.BpmnElement
import de.mertendieckmann.griplbackend.model.analysis.BpmnAnalysisResult
import dev.langchain4j.service.MemoryId
import dev.langchain4j.service.UserMessage

interface BpmnAnalysisAiService {
    
    /**
     * Analyzes a BPMN model provided as raw XML.
     *
     * This input form is used by the baseline analysis mode. The baseline mode
     * intentionally ignores RAG and sends the original BPMN XML to the model.
     */
    fun analyzeXml(
        @MemoryId sessionId: String,
        @UserMessage bpmnXml: String
    ): BpmnAnalysisResult
    
    /**
     * Analyzes the extracted elements of a BPMN model without RAG context.
     */
    fun analyzeElements(
        @MemoryId sessionId: String,
        @UserMessage bpmnElements: Set<BpmnElement>
    ): BpmnAnalysisResult

    /**
     * Analyzes extracted BPMN elements together with retrieved RAG context.
     *
     * The caller is responsible for constructing [formattedPrompt] from the 
     * BPMN elements and the retrieved GDPR-related context.
     */
    fun analyzeElementsWithRagContext(
        @MemoryId sessionId: String,
        @UserMessage formattedPrompt: String
    ): BpmnAnalysisResult
}