"use client";

import { Prompt } from "@/models/dto/Prompt";
import { useState } from "react";
import CreatePromptButton from "@/components/prompts/create-prompt-button";
import PromptLoadErrorToast from "@/components/prompts/prompt-load-error-toast";
import PromptList from "@/components/prompts/prompt-list";

interface PromptLibraryProps {
    initialPrompts: Prompt[] | null;
}

/**
 * Displays the prompt library page, containing a list of prompts.
 * 
 * Also handles the state for creating new prompt versions, ensuring that only one version can be created at a time.
 * 
 * @param {PromptLibraryProps} props - The list of prompts to be displayed or null if fetching failed.
 * @returns {JSX.Element} The rendered prompt library component.
 */
export default function PromptLibrary({ initialPrompts }: PromptLibraryProps) {
    const [prompts, setPrompts] = useState<Prompt[] | null>(initialPrompts);

    /**
     * Identifies the prompt for which a version is currently being created. A null value means no draft is active.
     * This state is passed through PromptList to all PromptItem components, which use it to determine whether to
     * render the CreatePromptVersionCard themselves or disable their create button.
     */
    const [promptIdWithVersionDraft, setPromptIdWithVersionDraft] = useState<number | null>(null);

    function handlePromptCreated(newPrompt: Prompt) {
        setPrompts((currentPrompts) => (currentPrompts ? [...currentPrompts, newPrompt] : [newPrompt]));
    }

    /**
     * This handler is passed through PromptList to all PromptItem components, which use it to signal 
     * the creation of a new prompt version.
     * 
     * @param promptId The ID of the prompt for which a version is created.
     * @returns {boolean} True if creation was reserved for the given prompt; false if another prompt already has an active version draft.
     */
    function handleStartVersionCreation(promptId: number): boolean {
        if (promptIdWithVersionDraft !== null) {
            return false; // Another version creation is already in progress, do not start a new one.
        }

        setPromptIdWithVersionDraft(promptId);
        return true;
    }

    /**
     * This handler is passed through PromptList to all PromptItem components, which use it to signal
     * the completion of a prompt version creation.
     */
    function handleFinishVersionCreation() {
        setPromptIdWithVersionDraft(null);
    }

    return (
        <div className="h-full w-full p-6 overflow-y-auto">
            <div className="container mx-auto">
                <div className="flex flex-row justify-between items-start">
                    <h2 className="font-bold text-3xl mb-6">Prompt Library</h2>
                    <CreatePromptButton onPromptCreated={handlePromptCreated} disabled={promptIdWithVersionDraft !== null} />
                </div>

                {prompts === null ? (
                    <>
                        <PromptLoadErrorToast />
                        <p className="text-muted-foreground">Prompts could not be loaded.</p>
                    </>
                ) : (
                    <PromptList
                        prompts={prompts}
                        promptIdWithVersionDraft={promptIdWithVersionDraft}
                        startVersionCreation={handleStartVersionCreation}
                        finishVersionCreation={handleFinishVersionCreation}
                    />
                )}
            </div>
        </div>
    );
}