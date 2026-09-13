"use client";

import { useRef, useState } from "react";
import { Prompt } from "@/models/dto/Prompt";
import { PromptVersion } from "@/models/dto/PromptVersion";
import { DefaultPromptSelection } from "@/models/dto/DefaultPromptSelectionOverview";
import getPromptVersions from "@/actions/get-prompt-versions";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Plus, X, Check, Pencil } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import PromptVersionItem from "@/components/prompts/prompt-version-item";
import { Button } from "@/components/ui/button";
import CreatePromptVersionCard from "./create-prompt-version-card";
import DeletePromptButton from "@/components/prompts/delete-prompt-button";
import renamePrompt from "@/actions/rename-prompt";
import { Input } from "@/components/ui/input";

interface PromptItemProps {
    prompt: Prompt;
    promptIdWithVersionDraft: number | null;
    startVersionCreation: (promptId: number) => boolean;
    finishVersionCreation: () => void;
    onPromptDeleted: (promptId: number) => void;
    onVersionCreated: () => void;
    onVersionDeleted: () => void;
    promptIdWithRenameDraft: number | null;
    startPromptRename: (promptId: number) => boolean;
    finishPromptRename: () => void;
    onPromptRenamed: (promptId: number, newName: string) => void;
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
 * Similarly, prompt renaming is managed centrally by PromptLibrary and only 
 * the item whose ID matches `promptIdWithRenameDraft` renders the rename input.
 * 
 * @param {PromptItemProps} props - The prompt to display, centrally managed 
 * version-creation and renaming state, handlers and mutation callbacks.
 * @returns {JSX.Element} The rendered prompt item component.
 */
export default function PromptItem({ prompt, promptIdWithVersionDraft, startVersionCreation, finishVersionCreation, onPromptDeleted, onVersionCreated, onVersionDeleted, promptIdWithRenameDraft, startPromptRename, finishPromptRename, onPromptRenamed, defaultSelection }: PromptItemProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [promptVersions, setPromptVersions] = useState<PromptVersion[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const isRenaming = promptIdWithRenameDraft === prompt.id;
    const isAnotherPromptRenaming = promptIdWithRenameDraft !== null && !isRenaming;
    const [editedPromptName, setEditedPromptName] = useState(prompt.name);
    const [isSavingName, setIsSavingName] = useState(false);
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

    function handleStartRename() {
        if (startPromptRename(prompt.id) === false) return;

        setEditedPromptName(prompt.name);
    }

    function handleCancelRename() {
        setEditedPromptName(prompt.name);
        finishPromptRename();
    }

    async function handleSaveRename() {
        const trimmedName = editedPromptName.trim();

        if (!trimmedName) {
            showError("Invalid prompt name", "The prompt name must not be empty.");
            return;
        }

        if (trimmedName === prompt.name) {
            finishPromptRename();
            return;
        }

        setIsSavingName(true);
        try {
            await renamePrompt(prompt.id, trimmedName);
            onPromptRenamed(prompt.id, trimmedName);
            finishPromptRename();
        } catch (error) {
            console.error(`Failed to rename prompt ${prompt.id}:`, error);
            showError("Failed to rename prompt", "The prompt name could not be updated.");
        } finally {
            setIsSavingName(false);
        }
    }

    return (
        <Collapsible open={isOpen} onOpenChange={handleOpenChange} className="mb-4">
            <div className="grid w-full grid-cols-[minmax(0,1fr)_178px_157px] items-start gap-x-2">
                <CollapsibleTrigger className="min-w-0 text-left" asChild>
                    <Card className="w-full">
                        <CardHeader className="flex-row items-center justify-between">
                            {isRenaming ? (
                                <div className="flex min-w-0 items-center gap-2">
                                    <Input
                                        value={editedPromptName}
                                        onChange={(event) => setEditedPromptName(event.target.value)}
                                        onClick={(event) => event.stopPropagation()}
                                        onKeyDown={(event) => event.stopPropagation()}
                                        disabled={isSavingName}
                                        className="h-[30px] min-w-40 max-w-full [field-sizing:content]"
                                    />

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            handleCancelRename();
                                        }}
                                        disabled={isSavingName}
                                        title="Cancel"
                                        className="mt-0 shrink-0 h-[30px] w-[30px] hover:bg-muted hover:text-foreground"
                                    >
                                        <X />
                                    </Button>

                                    <Button
                                        type="button"
                                        size="icon"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            handleSaveRename();
                                        }}
                                        disabled={isSavingName}
                                        title="Save"
                                        className="mt-0 shrink-0 h-[30px] w-[30px]"
                                    >
                                        <Check />
                                    </Button>
                                </div>
                            ) : (
                                <div className="group/name flex min-w-0 items-center">
                                    <CardTitle>
                                        {prompt.name}
                                    </CardTitle>

                                    {!isAnotherPromptRenaming && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                handleStartRename();
                                            }}
                                            disabled={isLoading}
                                            title="Rename prompt"
                                            className="ml-1 h-7 w-7 opacity-0 transition-opacity group-hover/name:opacity-50 hover:!opacity-100 hover:bg-transparent hover:text-foreground"
                                        >
                                            <Pencil />
                                        </Button>
                                    )}
                                </div>
                            )}

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
                            <Card className="mt-3">
                                <CardContent className="py-6 text-sm text-muted-foreground">
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