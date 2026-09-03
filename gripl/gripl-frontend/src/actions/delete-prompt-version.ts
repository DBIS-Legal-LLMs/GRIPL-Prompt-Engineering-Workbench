"use server";

/**
 * Deletes a prompt version through the backend API.
 * The backend only permits deletion of the latest version of a prompt.
 *
 * @param {number} promptVersionId - The ID of the prompt version to delete.
 * @throws {Error} An error if the backend request fails or the response is not OK.
 */
export default async function deletePromptVersion(promptVersionId: number): Promise<void> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/gdpr/prompts/versions/${promptVersionId}`,
        {
            method: "DELETE"
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to delete prompt version: ${response.status} ${response.statusText}`);
    }
}