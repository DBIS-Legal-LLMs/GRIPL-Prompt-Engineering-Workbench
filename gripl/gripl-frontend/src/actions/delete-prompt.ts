"use server";

/**
 * Deletes a prompt and all of its associated prompt versions through the backend API.
 *
 * @param {number} promptId - The ID of the prompt to delete.
 * @throws {Error} An error if the backend request fails or the response is not OK.
 */
export default async function deletePrompt(promptId: number): Promise<void> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/gdpr/prompts/${promptId}`,
        {
            method: "DELETE"
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to delete prompt: ${response.status} ${response.statusText}`);
    }
}