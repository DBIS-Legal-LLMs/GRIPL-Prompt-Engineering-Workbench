/**
 * Represents a prompt as received from the backend API.
 * A prompt is a named collection of prompt versions.
 * 
 * @property {number} id - The unique identifier of the prompt.
 * @property {string} name - The name of the prompt.
 * @property {string} createdAt - The timestamp when the prompt was created.
 * @property {string} updatedAt - The timestamp when the prompt was last modified.
 */
export interface Prompt {
    id: number;
    name: string;
    createdAt: string;
    updatedAt: string;
}