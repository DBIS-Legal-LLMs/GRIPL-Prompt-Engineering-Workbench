/**
 * Compact data required to populate the default prompt selector.
 *
 * It contains the selectable versions for every prompt and the currently
 * configured default selection. The default selection is null when no prompt
 * version has been configured as the default.
 */
export interface DefaultPromptSelectionOverview {
    prompts: PromptSelectionOption[];
    defaultSelection: DefaultPromptSelection | null;
}

/**
 * Represents the available prompt-version choices for one prompt in the
 * default prompt selector.
 */
export interface PromptSelectionOption {
    promptId: number;
    versions: PromptVersionSelectionOption[];
}

/**
 * Represents lightweight metadata for a prompt version selectable as default.
 */
export interface PromptVersionSelectionOption {
    id: number;
    versionNumber: number;
}

/**
 * Identifies the prompt and prompt version configured as the current default.
 */
export interface DefaultPromptSelection {
    promptId: number;
    promptVersionId: number;
}