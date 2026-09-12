"use client";

import { DefaultPromptSelection, DefaultPromptSelectionOverview, PromptVersionSelectionOption } from "@/models/dto/DefaultPromptSelectionOverview";
import { Prompt } from "@/models/dto/Prompt";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import setDefaultPromptVersion from "@/actions/set-default-prompt-version";
import { useToast } from "@/components/ui/toast";

interface DefaultPromptSelectorProps {
    prompts: Prompt[];
    selectionOverview: DefaultPromptSelectionOverview;
    onDefaultSelectionChanged: (selection: DefaultPromptSelection) => void;
}

/**
 * Displays controls for selecting the default prompt version used for regular GRIPL analyses.
 * 
 * The component uses the supplied selection overview to populate the selectable versions 
 * available for each prompt and initializes its selection based on the current default. 
 * Selecting a version persists the new default through the backend and reports the confirmed 
 * selection to its parent component.
 * 
 * Temporary selections are reset to the current default when the user clicks outside the selector.
 * 
 * @param {DefaultPromptSelectorProps} props - The prompts in the library, compact version
 * selection data, and callback used to update the default selection state.
 * @returns {JSX.Element} The rendered default prompt selector.
 */
export default function DefaultPromptSelector({ prompts, selectionOverview, onDefaultSelectionChanged }: DefaultPromptSelectorProps) {
    const [selectedPromptId, setSelectedPromptId] = useState<number | null>(selectionOverview.defaultSelection?.promptId ?? null);
    const [selectedVersionId, setSelectedVersionId] = useState<number | null>(selectionOverview.defaultSelection?.promptVersionId ?? null);
    const selectedPromptVersions: PromptVersionSelectionOption[] = selectionOverview
        .prompts
        .find(promptOption => promptOption.promptId === selectedPromptId)
        ?.versions ?? [];

    const [isSaving, setIsSaving] = useState(false);
    const [isPromptSelectOpen, setIsPromptSelectOpen] = useState(false);
    const [isVersionSelectOpen, setIsVersionSelectOpen] = useState(false);
    const { showToast, showError } = useToast();

    const selectorRef = useRef<HTMLDivElement | null>(null);

    function resetToDefaultSelection() {
        setSelectedPromptId(selectionOverview.defaultSelection?.promptId ?? null);
        setSelectedVersionId(selectionOverview.defaultSelection?.promptVersionId ?? null);
    }

    useEffect(() => {
        resetToDefaultSelection();
    }, [selectionOverview.defaultSelection]);

    useEffect(() => {
        function handlePointerDown(event: PointerEvent) {
            if (!(event.target instanceof Element)) {
                return;
            }

            if (isPromptSelectOpen || isVersionSelectOpen) {
                return;
            }

            const wasClickedInsideSelector = selectorRef.current?.contains(event.target);
            const wasClickedInsideSelectContent = event.target.closest('[data-slot="select-content"]') !== null;

            if (!wasClickedInsideSelector && !wasClickedInsideSelectContent) {
                resetToDefaultSelection();
            }
        }

        document.addEventListener("pointerdown", handlePointerDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, [
        isPromptSelectOpen,
        isVersionSelectOpen,
        selectionOverview.defaultSelection
    ]);

    function handlePromptSelectionChanged(promptId: string) {
        const newSelectedPromptId = Number(promptId);
        const defaultSelection = selectionOverview.defaultSelection;

        setSelectedPromptId(newSelectedPromptId);
        setSelectedVersionId(defaultSelection?.promptId === newSelectedPromptId ? defaultSelection.promptVersionId : null);
    }

    async function handleVersionSelectionChanged(promptVersionId: string) {
        if (selectedPromptId === null) {
            return;
        }

        const selectedVersionId = Number(promptVersionId);
        const currentDefaultSelection = selectionOverview.defaultSelection;

        if (currentDefaultSelection?.promptId === selectedPromptId && currentDefaultSelection?.promptVersionId === selectedVersionId) {
            return;
        }

        const newDefaultPromptSelection: DefaultPromptSelection = {
            promptId: selectedPromptId,
            promptVersionId: selectedVersionId
        }

        setIsSaving(true);
        try {
            await setDefaultPromptVersion(newDefaultPromptSelection.promptVersionId);

            setSelectedVersionId(newDefaultPromptSelection.promptVersionId);
            onDefaultSelectionChanged(newDefaultPromptSelection);

            showToast({ title: "Default prompt updated", description: "The selected prompt version is now used for analyses in the sandbox.", variant: "success" });
        } catch (error) {
            console.error("Failed to set default prompt:", error)
            showError("Failed to set default prompt", "The selected prompt version could not be set as the default.");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div ref={selectorRef} className="flex items-end gap-2">
            <div className="flex flex-wrap items-center gap-4">
                <Label htmlFor="default-prompt">Default Prompt:</Label>
                <Select
                    value={selectedPromptId?.toString() ?? ""}
                    onValueChange={handlePromptSelectionChanged}
                    onOpenChange={setIsPromptSelectOpen}
                    disabled={isSaving}>

                    <SelectTrigger id="default-prompt" className="max-w-[200px] overflow-hidden">
                        <SelectValue placeholder="Select default prompt" className="min-w-0 truncate"/>
                    </SelectTrigger>

                    <SelectContent>
                        {prompts.map((prompt) => (
                            <SelectItem key={prompt.id} value={prompt.id.toString()}>
                                {prompt.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Select
                value={selectedVersionId?.toString() ?? ""}
                onValueChange={handleVersionSelectionChanged}
                onOpenChange={setIsVersionSelectOpen}
                disabled={isSaving || selectedPromptId === null || selectedPromptVersions.length === 0}>

                <SelectTrigger>
                    <SelectValue
                        placeholder={
                            selectedPromptId === null
                                ? "Select a prompt first"
                                : selectedPromptVersions.length === 0
                                    ? "No versions available"
                                    : "Select version"
                        } />
                </SelectTrigger>

                <SelectContent>
                    {selectedPromptVersions.map(versionOption => (
                        <SelectItem key={versionOption.id} value={versionOption.id.toString()}>
                            V{versionOption.versionNumber}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}