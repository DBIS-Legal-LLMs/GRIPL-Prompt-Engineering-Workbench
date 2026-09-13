"use server";

/**
 * Renames the prompt with the given ID to the new name provided.
 * 
 * @param {number} promptId The ID of the prompt to rename.
 * @param {string} newName The new name for the prompt.
 * @throws {Error} If the backend request fails or returns a non-success status.
 */
export default async function renamePrompt(promptId: number, newName: string): Promise<void> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/gdpr/prompts/${promptId}`, 
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ newName })
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to rename prompt: ${response.status} ${response.statusText}`);
    }
}