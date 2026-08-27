import getPrompts from "@/actions/get-prompts";
import PromptLibrary from "@/components/prompts/prompt-library";

/**
 * Displays the prompts page, which contains the prompt library component.
 *
 * @returns The prompts page component.
 */
export default async function PromptsPage() {
    const prompts = await getPrompts();

    return <PromptLibrary initialPrompts={prompts} />;
}