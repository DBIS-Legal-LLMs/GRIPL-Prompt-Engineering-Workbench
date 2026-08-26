import getPrompts from "@/actions/get-prompts";
import PromptList from "@/components/prompts/prompt-list";
import PromptLoadErrorToast from "@/components/prompts/prompt-load-error-toast";

/**
 * Displays the prompt library page, containing a list of prompts.
 * If fetching the prompts fails, an error toast notification is shown.
 *
 * @returns The prompts page component.
 */
export default async function PromptsPage() {
    const prompts = await getPrompts();

    return (
        <div className="h-full w-full p-6 overflow-y-auto">
            <div className="container mx-auto">
                <h2 className="font-bold text-3xl mb-6">Prompt Library</h2>

                {prompts === null ? (
                    <>
                        <PromptLoadErrorToast />
                        <p className="text-muted-foreground">Prompts could not be loaded.</p>
                    </>
                ) : (
                    <PromptList prompts={prompts} />
                )}
            </div>
        </div>
    );
}