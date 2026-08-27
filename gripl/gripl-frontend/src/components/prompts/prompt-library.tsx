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
 * If fetching the prompts failed, an error toast notification is shown.
 * 
 * @param {PromptLibraryProps} props - The list of prompts to be displayed or null if fetching failed.
 * @returns {JSX.Element} The rendered prompt library component.
 */
export default function PromptLibrary({ initialPrompts }: PromptLibraryProps) {
    const [prompts, setPrompts] = useState<Prompt[] | null>(initialPrompts);

    function handlePromptCreated(newPrompt: Prompt) {
        setPrompts((currentPrompts) => (currentPrompts ? [...currentPrompts, newPrompt] : [newPrompt]));
    }

    return (
        <div className="h-full w-full p-6 overflow-y-auto">
            <div className="container mx-auto">
                <div className="flex flex-row justify-between items-start">
                    <h2 className="font-bold text-3xl mb-6">Prompt Library</h2>
                    <CreatePromptButton onPromptCreated={handlePromptCreated} />
                </div>

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