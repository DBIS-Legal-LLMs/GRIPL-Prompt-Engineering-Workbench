"use server";

import {ClassificationScope, PromptVersion, Variable} from "@/models/dto/PromptVersion";

interface CreatePromptVersionRequest {
    template: string;
    variables: Variable[];
    classificationScope: ClassificationScope;
    commitMessage: string;
}

/**
 * Sends a request to the backend API to create a new immutable version for a prompt.
 *
 * @param {number} promptId - The ID of the prompt to which the version belongs.
 * @param {CreatePromptVersionRequest} request - The template, a list of variables, the classification scope, and commit message.
 * @returns {Promise<PromptVersion>} A promise that resolves to the newly created prompt version.
 * @throws {Error} An error if the backend request fails or the response is not ok.
 */
export default async function createPromptVersion(promptId: number, request: CreatePromptVersionRequest): Promise<PromptVersion> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/gdpr/prompts/${promptId}/versions`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request)
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to create prompt version: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<PromptVersion>;
}