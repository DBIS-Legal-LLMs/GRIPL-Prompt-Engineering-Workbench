"use client";

import { Prompt } from "@/models/dto/Prompt";
import { useEffect, useState } from "react";
import CreatePromptButton from "@/components/prompts/create-prompt-button";
import PromptLoadErrorToast from "@/components/prompts/prompt-load-error-toast";
import PromptList from "@/components/prompts/prompt-list";
import { DefaultPromptSelection, DefaultPromptSelectionOverview } from "@/models/dto/DefaultPromptSelectionOverview";
import getDefaultPromptSelectionOverview from "@/actions/get-default-prompt-selection-overview";
import DefaultPromptSelector from "@/components/prompts/default-prompt-selector";

interface PromptLibraryProps {
    initialPrompts: Prompt[] | null;
}

/**
 * Displays the prompt library page, containing a list of prompts and controls for selecting the default prompt version.
 * 
 * Manages the local prompt list after prompt creation and deletion, centrally coordinates prompt-version drafts,
 * ensuring that only one prompt version can be created at a time, and loads the compact default-selection overview only 
 * when prompts are available. The overview is refreshed after prompt or prompt-version mutations so the selector remains 
 * up to date.
 * 
 * @param {PromptLibraryProps} props - The prompts initially loaded from the backend, or null when loading failed.
 * @returns {JSX.Element} The rendered prompt library component.
 */
export default function PromptLibrary({ initialPrompts }: PromptLibraryProps) {
    const [prompts, setPrompts] = useState<Prompt[] | null>(initialPrompts);
    const [selectionOverview, setSelectionOverview] = useState<DefaultPromptSelectionOverview | null>(null);
    const [isLoadingSelectionOverview, setIsLoadingSelectionOverview] = useState<boolean>(false);

    /**
     * Identifies the prompt for which a version is currently being created. A null value means no draft is active.
     * This state is passed through PromptList to all PromptItem components, which use it to determine whether to
     * render the CreatePromptVersionCard themselves or disable their create button.
     */
    const [promptIdWithVersionDraft, setPromptIdWithVersionDraft] = useState<number | null>(null);

    async function refreshSelectionOverview() {
        if (prompts === null || prompts.length === 0) {
            setSelectionOverview(null);
            return;
        }

        setIsLoadingSelectionOverview(true);
        try {
            const overview = await getDefaultPromptSelectionOverview();
            setSelectionOverview(overview);
        } catch (error) {
            console.error("Failed to load default prompt selection overview:", error);
            setSelectionOverview(null);
        } finally {
            setIsLoadingSelectionOverview(false);
        }
    }

    useEffect(() => {
        refreshSelectionOverview();
    }, [prompts]);

    function handleDefaultSelectionChanged(defaultSelection: DefaultPromptSelection) {
        setSelectionOverview((currentOverview) => {
            if (currentOverview === null) {
                return null;
            }
            return { ...currentOverview, defaultSelection };
        });
    }

    function handlePromptCreated(newPrompt: Prompt) {
        setPrompts((currentPrompts) => (currentPrompts ? [...currentPrompts, newPrompt] : [newPrompt]));
    }

    function handlePromptDeleted(deletedPromptId: number) {
        setPrompts((currentPrompts) => currentPrompts?.filter(prompt => prompt.id !== deletedPromptId) ?? null);
        if (promptIdWithVersionDraft === deletedPromptId) {
            setPromptIdWithVersionDraft(null);
        }
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

    function handleVersionCreated() {
        refreshSelectionOverview();
    }

    function handleVersionDeleted() {
        refreshSelectionOverview();
    }

    return (
        <div className="h-full w-full p-6 overflow-y-auto">
            <div className="container mx-auto">
                <div className="mb-6 grid w-full grid-cols-[minmax(0,1fr)_178px_157px] items-start gap-x-2">
                    <div className="flex min-w-0 items-start justify-between gap-4">
                        <h2 className="font-bold text-3xl self-center">Prompt Library</h2>

                        {prompts !== null && selectionOverview !== null && (
                            <DefaultPromptSelector
                                prompts={prompts}
                                selectionOverview={selectionOverview}
                                onDefaultSelectionChanged={handleDefaultSelectionChanged} />
                        )}
                    </div>

                    <div />

                    <CreatePromptButton
                        onPromptCreated={handlePromptCreated}
                        disabled={promptIdWithVersionDraft !== null} />

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
                        onPromptDeleted={handlePromptDeleted}
                        onVersionCreated={handleVersionCreated}
                        onVersionDeleted={handleVersionDeleted}
                        defaultSelection={selectionOverview?.defaultSelection ?? null}
                    />
                )}
            </div>
        </div >
    );
}