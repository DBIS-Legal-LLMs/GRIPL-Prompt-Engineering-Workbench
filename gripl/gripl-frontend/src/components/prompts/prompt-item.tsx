"use client";

import { useRef, useState } from "react";
import { Prompt } from "@/models/dto/Prompt";
import { PromptVersion } from "@/models/dto/PromptVersion";
import { DefaultPromptSelection } from "@/models/dto/DefaultPromptSelectionOverview";
import getPromptVersions from "@/actions/get-prompt-versions";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import PromptVersionItem from "@/components/prompts/prompt-version-item";
import { Button } from "@/components/ui/button";
import CreatePromptVersionCard from "./create-prompt-version-card";
import DeletePromptButton from "@/components/prompts/delete-prompt-button";

interface PromptItemProps {
    prompt: Prompt;
    promptIdWithVersionDraft: number | null;
    startVersionCreation: (promptId: number) => boolean;
    finishVersionCreation: () => void;
    onPromptDeleted: (promptId: number) => void;
    onVersionCreated: () => void;
    onVersionDeleted: () => void;
    defaultSelection: DefaultPromptSelection | null;
}

/**
 * Displays a collapsible prompt item with its versions and the editor for a
 * new version.
 * 
 * Prompt versions are lazy loaded when the item is opened for the first time.
 * The loaded versions remain in local component state so subsequent opens and
 * version creations do not issue another request.  
 * The current default selection is passed from PromptLibrary so loaded prompt
 * versions can display their default status without being fetched again.
 * 
 * The active version creation is managed centrally by PromptLibrary and passed
 * through PromptList to this component. This component compares 
 * `promptIdWithVersionDraft` with its own prompt ID:
 *
 * - If both IDs match, this item renders CreatePromptVersionCard. 
 * - If another prompt ID is stored, this item disables its create button, 
 *   because another prompt is currently creating a version.
 * - When no ID is stored, this item may start a new version creation.
 * 
 * @param {PromptItemProps} props - The prompt to display, centrally managed 
 * version-creation state and handlers, and the callback invoked after a 
 * successful deletion.
 * @returns {JSX.Element} The rendered prompt item component.
 */
export default function PromptItem({ prompt, promptIdWithVersionDraft, startVersionCreation, finishVersionCreation, onPromptDeleted, onVersionCreated, onVersionDeleted, defaultSelection }: PromptItemProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [promptVersions, setPromptVersions] = useState<PromptVersion[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const isCreatingVersion = promptIdWithVersionDraft === prompt.id;
    const isAnotherPromptCreatingVersion = promptIdWithVersionDraft !== null && !isCreatingVersion;
    const wasOpenBeforeVersionCreation = useRef<boolean>(false);
    const { showError } = useToast();

    const latestPromptVersion = promptVersions?.reduce((latest, current) =>
        current.versionNumber > latest.versionNumber ? current : latest,
        promptVersions?.[0]
    );

    async function loadPromptVersions(): Promise<PromptVersion[] | null> {
        setIsLoading(true);
        setLoadError(null);

        try {
            const versions = await getPromptVersions(prompt.id);
            setPromptVersions(versions);
            return versions;
        } catch (error) {
            console.error(`Failed to load versions for prompt ${prompt.id}:`, error);
            setLoadError("Failed to load prompt versions.");
            return null;
        } finally {
            setIsLoading(false);
        }
    }

    /**
    * Opens or closes this prompt item and lazy loads its versions when opened for
    * the first time. Closing is blocked while this prompt is creating a new version
    * so unsaved changes remain visible.
    *
    * @param {boolean} open - The open state requested by the collapsible control.
    */
    async function handleOpenChange(open: boolean) {
        if (isCreatingVersion && !open) {
            return;
        }

        setIsOpen(open);

        if (!open || promptVersions !== null || isLoading) {
            return;
        }

        const versions = await loadPromptVersions();

        if (versions === null) {
            showError("Failed to load prompt versions.");
        }
    }

    /**
     * Starts a new version creation for this prompt.
     * 
     * This will signal a version creation to the prompt library, preventing other prompt items
     * from starting another creation. It then opens opens the item and loads its versions only 
     * when they have not been fetched before. 
     */
    async function handleCreateVersion() {
        if (startVersionCreation(prompt.id) === false) return;

        wasOpenBeforeVersionCreation.current = isOpen;
        setIsOpen(true);

        if (promptVersions !== null) return;

        const versions = await loadPromptVersions();
        if (versions === null) {
            showError("Cannot create new version", "The existing prompt versions could not be loaded.");
            finishVersionCreation();
            setIsOpen(wasOpenBeforeVersionCreation.current);
        }
    }

    function handleVersionCreated(createdVersion: PromptVersion) {
        setPromptVersions((currentVersions) => [createdVersion, ...(currentVersions ?? [])]);
        finishVersionCreation();
        onVersionCreated();
    }

    function handleVersionCreationCancelled() {
        finishVersionCreation();
        setIsOpen(wasOpenBeforeVersionCreation.current);
    }

    function handleVersionDeleted(deletedVersionId: number) {
        setPromptVersions((currentVersions) => currentVersions?.filter(version => version.id !== deletedVersionId) ?? null);
        onVersionDeleted();
    }

    return (
        <Collapsible open={isOpen} onOpenChange={handleOpenChange} className="mb-4">
            <div className="grid w-full grid-cols-[minmax(0,1fr)_178px_157px] items-start gap-x-2">
                <CollapsibleTrigger className="min-w-0 text-left">
                    <Card className={`w-full`}>
                        <CardHeader className="flex-row items-center justify-between">
                            <CardTitle>
                                {prompt.name}
                            </CardTitle>
                            {isOpen ? <ChevronDown /> : <ChevronUp />}
                        </CardHeader>
                    </Card>
                </CollapsibleTrigger>

                <Button
                    type="button"
                    onClick={handleCreateVersion}
                    disabled={isLoading || isCreatingVersion || isAnotherPromptCreatingVersion}
                    className="h-20 w-full"
                >
                    <Plus />
                    Create new Version
                </Button>

                <DeletePromptButton
                    prompt={prompt}
                    disabled={isLoading || isCreatingVersion || isAnotherPromptCreatingVersion}
                    onPromptDeleted={onPromptDeleted}
                    className="h-20 w-full"
                />
            </div>

            <CollapsibleContent className="space-y-3 pb-0">
                <div className="grid w-full grid-cols-[minmax(0,1fr)_178px_157px] items-start gap-x-2">
                    <div className="min-w-0 ml-8">
                        {isLoading && (
                            <Card>
                                <CardContent className="mt-3 py-6 text-sm text-muted-foreground">
                                    Loading versions ...
                                </CardContent>
                            </Card>
                        )}

                        {loadError && <p className="text-red-500">{loadError}</p>}

                        {promptVersions !== null && promptVersions.length === 0 &&
                            !isCreatingVersion && (
                                <Card className="mt-3">
                                    <CardContent className="py-6 text-sm text-muted-foreground">
                                        There are no versions of this prompt yet.
                                    </CardContent>
                                </Card>
                            )}

                        {isCreatingVersion && promptVersions !== null && (
                            <CreatePromptVersionCard
                                idOfParentPrompt={prompt.id}
                                previousVersion={promptVersions[0] ?? undefined}
                                onVersionCreated={handleVersionCreated}
                                onCancel={handleVersionCreationCancelled}
                            />
                        )}
                    </div>

                    <div />
                    <div />
                </div>

                {promptVersions?.map((version) => (
                    <PromptVersionItem
                        key={version.id}
                        version={version}
                        isDefault={defaultSelection?.promptVersionId === version.id}
                        isLatestVersion={version.id === latestPromptVersion?.id}
                        disabled={isLoading || isCreatingVersion || isAnotherPromptCreatingVersion}
                        onVersionDeleted={handleVersionDeleted}
                    />
                ))}
            </CollapsibleContent>
        </Collapsible>
    );
}