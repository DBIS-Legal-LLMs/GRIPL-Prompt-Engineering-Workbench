"use server";

import { PromptVersion } from "@/models/dto/PromptVersion";

/**
 * Fetches the versions of a given prompt from the backend API.
 *
 * @param promptId The ID of the prompt to fetch versions for.
 * @returns A promise that resolves to an array of prompt versions.
 * @throws An error if the fetch request fails or the response is not OK.
 */
export default async function getPromptVersions(promptId: number): Promise<PromptVersion[]> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/gdpr/prompts/${promptId}/versions`,
        {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch prompt versions: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<PromptVersion[]>;
}