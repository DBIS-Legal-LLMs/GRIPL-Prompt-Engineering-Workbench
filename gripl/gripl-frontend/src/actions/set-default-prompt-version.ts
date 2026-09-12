"use server";

/**
 * Sets a prompt version as the default version used for regular analyses.
 *
 * @param {number} promptVersionId The ID of the prompt version to set as default.
 * @throws {Error} If the backend request fails or the response is not OK.
 */
export default async function setDefaultPromptVersion(promptVersionId: number): Promise<void> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/gdpr/prompts/versions/${promptVersionId}/default`,
        {
            method: "PUT"
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to set default prompt version: ${response.status} ${response.statusText}`);
    }
}