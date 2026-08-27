"use server"

import { Prompt } from "@/models/dto/Prompt";

/**
 * Sends a request to the backend API to create a new prompt.
 *
 * @param promptName - The name of the prompt to be created.
 * @returns A promise that resolves to the created prompt.
 * @throws An error if the fetch fails or the response is not ok.
 */
export default async function createPrompt(promptName: string): Promise<Prompt> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/gdpr/prompts`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ promptName })
    });

    if (!response.ok) {
        throw new Error(`Failed to create prompt: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<Prompt>;
}