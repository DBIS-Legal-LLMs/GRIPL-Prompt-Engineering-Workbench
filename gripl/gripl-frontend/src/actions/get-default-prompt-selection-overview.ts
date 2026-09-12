"use server";

import type { DefaultPromptSelectionOverview } from "@/models/dto/DefaultPromptSelectionOverview";

/**
 * Fetches the compact data required to render the default prompt selector.
 * 
 * The overview contains the prompt IDs, the IDs and version numbers available
 * for each prompt, and the currently configured default selection. It does not
 * include full prompt-version contents such as templates or variables.
 * 
 * @returns {Promise<DefaultPromptSelectionOverview>} The available prompt and
 * version options together with the current default selection, when configured.
 * @throws {Error} If the backend request fails or returns a non-success status.
 */
export default async function getDefaultPromptSelectionOverview(): Promise<DefaultPromptSelectionOverview> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/gdpr/prompts/default-selection`,
        {
            method: "GET",
            cache: "no-store"
        }
    );

    if (!response.ok) {
        throw new Error("Failed to fetch default prompt selection overview.");
    }
    
    return response.json() as Promise<DefaultPromptSelectionOverview>;
}