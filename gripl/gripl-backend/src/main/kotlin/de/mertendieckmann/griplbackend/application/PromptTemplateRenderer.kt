package de.mertendieckmann.griplbackend.application

import de.mertendieckmann.griplbackend.model.dto.Variable

/**
 * Renders and validates prompt templates.
 *
 * Templates support regular variables in the form `{{variableName}}` and a
 * conditional block type: `{{#if USE_RAG}} ... {{/if}}`. The content of a
 * conditional block is included only when RAG is enabled for an analysis.
 *
 * Conditional blocks cannot be nested, must be closed in their original order,
 * and no conditions other than `USE_RAG` are supported.
 */
object PromptTemplateRenderer {

    private val ragBlockPattern =
        Regex("""\{\{#if\s+USE_RAG\s*}}(.*?)\{\{/if\s*}}""", setOf(RegexOption.DOT_MATCHES_ALL))
    private val directivePattern = Regex("""\{\{(?:#if\s+[^}]+|/if\s*)}}""")

    private const val RAG_START_TAG = "{{#if USE_RAG}}"
    private const val RAG_END_TAG = "{{/if}}"

    /**
     * Renders a prompt template.
     *
     * Validates the conditional block syntax, includes or removes `USE_RAG` blocks
     * according to [useRag], and then replaces each configured variable occurrence
     * in the form `{{variableName}}` with its configured value.
     *
     * @param template The prompt template to render
     * @param variables List of variables configured for the prompt version
     * @param useRag Whether the analysis uses RAG
     * @return The fully rendered system prompt
     * @throws IllegalArgumentException if the template contains invalid directives
     */
    fun render(template: String, variables: List<Variable>, useRag: Boolean): String {
        validate(template)

        val renderedConditionsTemplate = ragBlockPattern.replace(template) { match ->
            if (useRag) match.groupValues[1] else ""
        }

        return variables.fold(renderedConditionsTemplate) { renderedTemplate, variable ->
            renderedTemplate.replace("{{${variable.name}}}", variable.value)
        }
    }

    /**
     * Validates the conditional directives contained in a prompt template.
     *
     * Only `{{#if USE_RAG}}` and `{{/if}}` are supported. Each opening directive
     * must be closed, closing directives must follow an opening directive, and
     * nested conditional blocks are not allowed.
     *
     * @param template The template whose directives are validated
     * @throws IllegalArgumentException if a directive is unsupported, unclosed,
     * nested, or appears in an invalid order
     */
    fun validate(template: String) {
        var ragBlockOpen = false

        directivePattern.findAll(template).forEach { match ->
            when (val directive = match.value) {
                RAG_START_TAG -> {
                    require(!ragBlockOpen) { "Nested $RAG_START_TAG blocks are not allowed." }
                    ragBlockOpen = true
                }

                RAG_END_TAG -> {
                    require(ragBlockOpen) { "Found $RAG_END_TAG without a corresponding $RAG_START_TAG." }
                    ragBlockOpen = false
                }

                else -> throw IllegalArgumentException("Unsupported directive: $directive")
            }
        }

        require(!ragBlockOpen) { "Unclosed $RAG_START_TAG block found." }
    }
}