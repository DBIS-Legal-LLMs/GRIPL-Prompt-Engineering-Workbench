const RAG_START_TAG = "{{#if USE_RAG}}";
const RAG_END_TAG = "{{/if}}";
const directivePattern = /\{\{(?:#if\s+[^}]+|\/if\s*)}}/g;

/**
 * Validates conditional directives in a prompt-library template before it is saved.
 *
 * The supported syntax is `{{#if USE_RAG}} ... {{/if}}`. Opening and closing
 * directives must be correctly ordered, blocks cannot be nested, and conditions
 * other than `USE_RAG` are rejected.
 *
 * This validation mirrors the backend validation to provide immediate UI feedback.
 *
 * @param {string} template - The prompt template entered by the user.
 * @returns {string | null} - An error message when invalid; otherwise `null`.
 */
export function validatePromptTemplate(template: string): string | null {
  let ragBlockOpen = false;

  for (const match of template.matchAll(directivePattern)) {
    const directive = match[0];

    if (directive === RAG_START_TAG) {
      if (ragBlockOpen) {
        return `Nested ${RAG_START_TAG} blocks are not supported.`;
      }
      ragBlockOpen = true;
      continue;
    }

    if (directive === RAG_END_TAG) {
      if (!ragBlockOpen) {
        return `${RAG_END_TAG} must follow an open ${RAG_START_TAG} block.`;
      }
      ragBlockOpen = false;
      continue;
    }

    return `Only the conditional directive ${RAG_START_TAG} is supported.`;
  }

  return ragBlockOpen
    ? `Every ${RAG_START_TAG} must be closed with a ${RAG_END_TAG}.`
    : null;
}