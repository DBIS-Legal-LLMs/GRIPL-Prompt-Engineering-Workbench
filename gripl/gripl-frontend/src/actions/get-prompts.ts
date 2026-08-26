"use server";

import { Prompt } from "@/models/dto/Prompt";

/**
 * Fetches all of the prompts from the backend API.
 *
 * @returns A promise that resolves to an array of prompts, or null if the fetch fails.
 */
export default async function getPrompts(): Promise<Prompt[] | null> {
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/gdpr/prompts`,
            {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch prompts: ${response.status} ${response.statusText}`);
        }

        return response.json() as Promise<Prompt[]>;
    } catch (error) {
        console.error("Error fetching prompts:", error);
        return null;
    }
}