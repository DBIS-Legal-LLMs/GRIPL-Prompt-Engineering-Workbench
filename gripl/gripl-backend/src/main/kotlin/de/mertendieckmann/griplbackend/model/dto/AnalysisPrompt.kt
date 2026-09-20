package de.mertendieckmann.griplbackend.model.dto

import de.mertendieckmann.griplbackend.model.dto.ClassificationScope
import de.mertendieckmann.griplbackend.model.dto.Variable

/**
 * Effective prompt configuration used for one BPMN analysis.
 *
 * @property template Prompt template
 * @property variables Values that should beinjected into the template
 * @property classificationScope BPMN element types considered by the analysis
 * @property isBaseline Whether the baseline behavior must be used
 */
data class AnalysisPrompt(
    val template: String,
    val variables: List<Variable>,
    val classificationScope: ClassificationScope,
    val isBaseline: Boolean
)