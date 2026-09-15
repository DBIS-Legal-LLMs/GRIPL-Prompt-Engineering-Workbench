"use client";

import createPrompt from "@/actions/create-prompt";
import createPromptVersion from "@/actions/create-prompt-version";
import getDefaultPromptSelectionOverview from "@/actions/get-default-prompt-selection-overview";
import getPromptVersions from "@/actions/get-prompt-versions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { EvaluationPromptConfiguration } from "@/models/dto/MultiEvaluationRequest";
import { Prompt } from "@/models/dto/Prompt";
import { ClassificationScope, Variable, PromptVersion, classificationScopeLabels } from "@/models/dto/PromptVersion";
import { Check, ChevronDown, ChevronUp, Pencil, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface EvaluationConfigPromptSettingsProps {
    prompts: Prompt[];
    instanceId: "a" | "b";
    title: string;
    loadDefaultPrompt?: boolean;
    selectNewPromptOnMount?: boolean;
    onPromptConfigChanged: (promptConfig: EvaluationPromptConfiguration | null) => void;
    onPromptCreated: (createdPrompt: Prompt) => void;
    onRemove?: () => void;
    onAddPrompt?: () => void;
    canAddPrompt?: boolean;
}

/**
 * Displays the prompt settings consisting of a prompt selector and a prompt editor.
 * 
 * @param {EvaluationConfigPromptSettingsProps} props - The selectable prompts, and callback functions 
 * for handling prompt configuration changes and prompt creation.
 * @returns {JSX.Element} The rendered evaluation config prompt settings component.
 */
export default function EvaluationConfigPromptSettings({ prompts, instanceId, title, loadDefaultPrompt, selectNewPromptOnMount = false, onPromptConfigChanged, onPromptCreated, onRemove, onAddPrompt, canAddPrompt }: EvaluationConfigPromptSettingsProps) {
    const { showToast, showError } = useToast();

    const [selectedPromptId, setSelectedPromptId] = useState<number | null>(null);
    const [isNewPrompt, setIsNewPrompt] = useState(selectNewPromptOnMount);
    const [newPromptName, setNewPromptName] = useState("");
    const [versions, setVersions] = useState<PromptVersion[]>([]);
    const [selectedVersion, setSelectedVersion] = useState<PromptVersion | null>(null);
    const [template, setTemplate] = useState("");
    const [variables, setVariables] = useState<Variable[]>([]);
    const [isLoadingVersions, setIsLoadingVersions] = useState(false);
    const [isAddingVariable, setIsAddingVariable] = useState(false);
    const [variableName, setVariableName] = useState("");
    const [variableValue, setVariableValue] = useState("");
    const [editingVariableName, setEditingVariableName] = useState<string | null>(null);
    const [classificationScope, setClassificationScope] = useState<ClassificationScope | null>(null);
    const [commitMessage, setCommitMessage] = useState("");
    const [isCommitDialogOpen, setIsCommitDialogOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(selectNewPromptOnMount);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const variableValueTextareaRef = useRef<HTMLTextAreaElement>(null);
    const hasUserSelectedPromptRef = useRef(false);

    const NEW_PROMPT_VALUE = "__new_prompt__";

    const canEditPrompt = (selectedPromptId !== null || isNewPrompt) && !isCreating;

    const hasPromptChanges = (selectedPromptId !== null || isNewPrompt) &&
        (
            selectedVersion === null
                ? (template !== "" || variables.length > 0 || classificationScope !== null)
                : template !== selectedVersion.template ||
                classificationScope !== selectedVersion.classificationScope ||
                variables.length !== selectedVersion.variables.length ||
                variables.some((variable, index) => {
                    const originalVariable = selectedVersion.variables[index];
                    return (
                        originalVariable === undefined ||
                        variable.name !== originalVariable.name ||
                        variable.value !== originalVariable.value
                    );
                })
        );

    function cloneVariables(variables: Variable[]): Variable[] {
        return variables.map(variable => ({ ...variable }));
    }

    useEffect(() => {
        if (!loadDefaultPrompt) return;

        let isActive = true;

        async function selectDefaultPromptVersion() {
            try {
                const overview = await getDefaultPromptSelectionOverview();
                const defaultSelection = overview.defaultSelection;
                if (!defaultSelection || !isActive || hasUserSelectedPromptRef.current) return;

                const loadedVersions = await getPromptVersions(defaultSelection.promptId);
                if (!isActive || hasUserSelectedPromptRef.current) return;

                setSelectedPromptId(defaultSelection.promptId);
                setVersions(loadedVersions);

                const defaultVersion = loadedVersions.find(
                    version => version.id === defaultSelection.promptVersionId
                );
                if (defaultVersion) {
                    applyVersion(defaultVersion);
                }
            } catch (error) {
                console.error("Failed to load default prompt version:", error);
                showError("Failed to load default prompt version.");
            }
        }

        selectDefaultPromptVersion();

        return () => {
            isActive = false;
        };
    }, [loadDefaultPrompt]);

    useEffect(() => {
        if (selectedPromptId === null && !isNewPrompt) {
            onPromptConfigChanged(null);
            return;
        }

        onPromptConfigChanged({
            sourcePromptVersionId: selectedVersion?.id ?? null,
            template,
            variables: cloneVariables(variables),
            classificationScope,
        });
    }, [selectedPromptId, selectedVersion, template, variables, classificationScope, isNewPrompt, onPromptConfigChanged]);

    function resizeTextarea() {
        const textarea = textareaRef.current;
        if (!textarea) return;

        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
    }

    function applyVersion(version: PromptVersion) {
        setSelectedVersion(version);
        setTemplate(version.template);
        setVariables(cloneVariables(version.variables));
        setClassificationScope(version.classificationScope);
        setIsAddingVariable(false);
        setEditingVariableName(null);
    }

    async function handlePromptSelectionChanged(promptId: string) {
        hasUserSelectedPromptRef.current = true;
        setSelectedVersion(null);
        setVersions([]);
        setTemplate("");
        setVariables([]);
        setClassificationScope(null);
        setIsAddingVariable(false);
        setEditingVariableName(null);

        if (promptId === NEW_PROMPT_VALUE) {
            setSelectedPromptId(null);
            setIsNewPrompt(true);
            setNewPromptName("");
            setIsEditorOpen(true);
            return;
        }

        const parsedPromptId = Number(promptId);
        setSelectedPromptId(parsedPromptId);
        setIsNewPrompt(false);
        setNewPromptName("");

        setIsLoadingVersions(true);
        try {
            const loadedVersions = await getPromptVersions(parsedPromptId);
            setVersions(loadedVersions);

            if (loadedVersions.length === 0) {
                setIsEditorOpen(true);
            }

            const latestVersion = loadedVersions.reduce((latest, current) => current.versionNumber > latest.versionNumber ? current : latest, loadedVersions[0]);

            if (latestVersion) {
                applyVersion(latestVersion);
            }
        } catch (error) {
            console.error("Failed to load prompt versions:", error);
            showError("Failed to load prompt versions.");
        } finally {
            setIsLoadingVersions(false);
        }
    }

    function handleVersionSelectionChanged(versionId: string) {
        const version = versions.find(version => version.id.toString() === versionId);
        if (version) {
            applyVersion(version);
        }
    }

    function handleRevert() {
        if (selectedVersion) {
            applyVersion(selectedVersion);
            return;
        }

        setTemplate("");
        setVariables([]);
        setClassificationScope(null);
        setIsAddingVariable(false);
        setEditingVariableName(null);
        setVariableName("");
        setVariableValue("");
    }

    function handleStartAddingVariable() {
        setVariableName("");
        setVariableValue("");
        setEditingVariableName(null);
        setIsAddingVariable(true);
    }

    function handleStartEditingVariable(variable: Variable) {
        setVariableName(variable.name);
        setVariableValue(variable.value);
        setEditingVariableName(variable.name);
        setIsAddingVariable(true);
    }

    function handleCancelAddingVariable() {
        setVariableName("");
        setVariableValue("");
        setEditingVariableName(null);
        setIsAddingVariable(false);
    }

    function handleSaveVariable() {
        const trimmedName = variableName.trim();

        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedName)) {
            showToast({ title: "Variable names may contain only letters, numbers, and underscores and must start with a letter or underscore.", variant: "info", duration: 8000 });
            return;
        }

        if (!variableValue.trim()) {
            showToast({ title: "Please enter a variable value.", variant: "info" });
            return;
        }

        const isDuplicate = variables.some(variable =>
            variable.name === trimmedName &&
            variable.name !== editingVariableName
        );

        if (isDuplicate) {
            showToast({ title: `{${trimmedName}} already exists.`, variant: "info" });
            return;
        }

        if (editingVariableName === null) {
            setVariables((currentVariables) => [...currentVariables, { name: trimmedName, value: variableValue }]);
        } else {
            setVariables((currentVariables) => currentVariables.map(variable =>
                variable.name === editingVariableName ? { name: trimmedName, value: variableValue } : variable
            ));
        }

        handleCancelAddingVariable();
    }

    function handleDeleteVariable(name: string) {
        setVariables((currentVariables) => currentVariables.filter(variable => variable.name !== name));
    }

    function handleOpenCommitDialog() {
        if (classificationScope === null) {
            showToast({ title: "Please select a classification scope before committing.", variant: "info" });
            return;
        }

        if (!template.trim()) {
            showToast({ title: "Please enter prompt text before committing.", variant: "info" });
            return;
        }

        setIsCommitDialogOpen(true);
    }

    async function handleCommit() {
        const trimmedCommitMessage = commitMessage.trim();

        if (selectedPromptId === null && !isNewPrompt) {
            showToast({ title: "Please select a prompt or create a new Prompt.", variant: "info" });
            return;
        }

        if (!trimmedCommitMessage) {
            showToast({ title: "Please enter a commit message.", variant: "info" });
            return;
        }

        if (classificationScope === null) {
            showError("Classification scope is not selected. Cannot commit.", "Please select a classification scope before committing.");
            return;
        }

        if (!template.trim()) {
            showError("Prompt text is empty. Cannot commit.", "Please enter the prompt text before committing.");
            return;
        }

        let createdPromptName: string | null = null;

        setIsCreating(true);
        try {
            let promptId = selectedPromptId;

            if (isNewPrompt) {
                const trimmedPromptName = newPromptName.trim();

                if (!trimmedPromptName) {
                    showToast({ title: "Please enter a name for the new prompt.", variant: "info" });
                    return;
                }

                const createdPrompt = await createPrompt(trimmedPromptName);
                onPromptCreated(createdPrompt);
                createdPromptName = createdPrompt.name;

                promptId = createdPrompt.id;
                setSelectedPromptId(createdPrompt.id);
                setIsNewPrompt(false);
                setNewPromptName("");
            }

            if (promptId === null) {
                return;
            }

            const createdVersion = await createPromptVersion(promptId, {
                template,
                variables,
                classificationScope,
                commitMessage: trimmedCommitMessage
            });

            setVersions((currentVersions) => [createdVersion, ...currentVersions]);
            applyVersion(createdVersion);
            setCommitMessage("");
            setIsCommitDialogOpen(false);
        } catch (error) {
            console.error("There was an error committing the prompt version:", error);
            showError(
                "Failed to commit prompt version.",
                createdPromptName
                    ? `Prompt \"${createdPromptName}\" was created, but its first version could not be saved.`
                    : "The prompt changes were not saved."
            );
        } finally {
            setIsCreating(false);
        }
    }

    useEffect(() => {
        if (isEditorOpen) {
            resizeTextarea();
        }
    }, [template, isEditorOpen, canAddPrompt]);

    function handleTemplateChange(templateValue: string) {
        setTemplate(templateValue);
    }

    function resizeVariableValueTextarea() {
        const textarea = variableValueTextareaRef.current;
        if (!textarea) return;

        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
    }

    useEffect(() => {
        if (isAddingVariable) {
            resizeVariableValueTextarea();
        }
    }, [isAddingVariable, variableValue]);

    function handleVariableValueChange(variableValue: string) {
        setVariableValue(variableValue);
    }

    return (
        <>
            <Card className="w-full h-fit">
                <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                        <CardTitle className="text-lg">{title}</CardTitle>

                        <div className="flex items-center gap-2 h-8">
                            {canAddPrompt && (
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={onAddPrompt}
                                    disabled={isCreating}
                                    className="gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Prompt
                                </Button>
                            )}

                            {onRemove && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={onRemove}
                                    disabled={isCreating}
                                    title="Remove prompt"
                                    className="gap-2"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Remove
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    <Label>Prompt</Label>

                    <div className="flex flex-wrap items-end justify-between gap-3">
                        {/*________________________ Prompt Selection and Version Selection Controls ________________________*/}
                        <div className="flex flex-wrap gap-2">
                            <Select
                                value={isNewPrompt ? NEW_PROMPT_VALUE : selectedPromptId?.toString() ?? ""}
                                onValueChange={handlePromptSelectionChanged}
                                disabled={isLoadingVersions || isCreating}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select prompt" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem key={NEW_PROMPT_VALUE} value={NEW_PROMPT_VALUE}>
                                        Create new prompt ...
                                    </SelectItem>
                                    {prompts.map((prompt) => (
                                        <SelectItem key={prompt.id} value={prompt.id.toString()}>
                                            {prompt.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={selectedVersion?.id.toString() ?? ""}
                                onValueChange={handleVersionSelectionChanged}
                                disabled={isLoadingVersions || versions.length === 0 || isCreating}>
                                <SelectTrigger className="disabled:cursor-default">
                                    <SelectValue placeholder={versions.length === 0 ? "No versions available" : "Select version"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {versions.map(version => (
                                        <SelectItem key={version.id} value={version.id.toString()}>
                                            V{version.versionNumber}
                                            {version.id === selectedVersion?.id && hasPromptChanges
                                                ? " (changed)"
                                                : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                    </div>

                    <Collapsible open={isEditorOpen} onOpenChange={setIsEditorOpen}>
                        <CollapsibleTrigger className="flex w-full items-center gap-3 py-2 text-left text-sm font-medium">
                            <span>Prompt Editor</span>
                            <span className="h-px flex-1 bg-border" />
                            {isEditorOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </CollapsibleTrigger>

                        <CollapsibleContent className="space-y-4 pt-4">
                            {/*________________________ Classification Scope Controls ________________________*/}
                            <div className="flex flex-wrap items-start gap-4" role="radiogroup" >
                                <span className="pt-1 text-sm font-medium leading-none">Classification Scope:</span>
                                <div className="flex flex-wrap gap-6">
                                    {Object.values(ClassificationScope).map((scope) => (
                                        <label
                                            key={scope}
                                            htmlFor={`evaluation-${instanceId}-classification-scope-${scope}`}
                                            className="flex cursor-pointer flex-col items-center gap-2">
                                            <input
                                                id={`evaluation-${instanceId}-classification-scope-${scope}`}
                                                type="radio"
                                                name={`evaluation-${instanceId}-classification-scope`}
                                                value={scope}
                                                checked={classificationScope === scope}
                                                onChange={() => setClassificationScope(scope)}
                                                disabled={!canEditPrompt}
                                                className="h-4 w-4 cursor-pointer accent-primary"
                                            />
                                            <Badge>{classificationScopeLabels[scope]}</Badge>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/*________________________ Template ________________________*/}
                            <div className="space-y-2">
                                <Label htmlFor={`evaluation-${instanceId}-prompt-template`}>Template</Label>
                                <Textarea
                                    id={`evaluation-${instanceId}-prompt-template`}
                                    ref={textareaRef}
                                    value={template}
                                    onChange={(event) => handleTemplateChange(event.target.value)}
                                    disabled={!canEditPrompt}
                                    placeholder="Enter the prompt text here..."
                                    className="min-h-[20rem] resize-none overflow-hidden font-mono"
                                />
                            </div>

                            {/*________________________ Variables ________________________*/}
                            <div className="space-y-2">
                                <Label>Variables</Label>

                                <div className="grid grid-cols-[fit-content(14rem)_minmax(14rem,2fr)_auto_auto] items-start gap-x-2 gap-y-2 rounded-md border p-3">
                                    {variables.map((variable) => (
                                        editingVariableName === variable.name ? (
                                            <div key={variable.name} className="contents">
                                                <div className="flex h-9 min-w-0 items-center gap-1 font-mono text-sm">
                                                    <span>{"{"}</span>
                                                    <Input
                                                        value={variableName}
                                                        onChange={(event) => setVariableName(event.target.value)}
                                                        disabled={isCreating}
                                                        placeholder="Variable name"
                                                        className="min-w-0"
                                                    />
                                                    <span>{"}:"}</span>
                                                </div>

                                                <Textarea
                                                    ref={variableValueTextareaRef}
                                                    value={variableValue}
                                                    onChange={event => handleVariableValueChange(event.target.value)}
                                                    disabled={isCreating}
                                                    placeholder="Variable value"
                                                    className="min-h-9 resize-none overflow-hidden"
                                                />

                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={handleCancelAddingVariable}
                                                    disabled={isCreating}
                                                >
                                                    Cancel
                                                </Button>

                                                <Button
                                                    type="button"
                                                    onClick={handleSaveVariable}
                                                    disabled={isCreating}
                                                >
                                                    Save
                                                </Button>
                                            </div>
                                        ) : (
                                            <div key={variable.name} className="contents">

                                                <span className="min-w-0 whitespace-normal break-words font-mono text-sm font-semibold">{`{${variable.name}}:`}</span>

                                                <span className="min-w-0 whitespace-pre-wrap break-words font-mono text-sm">{variable.value}</span>

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleStartEditingVariable(variable)}
                                                    disabled={!canEditPrompt}
                                                    title={`Edit variable`}
                                                >
                                                    <Pencil />
                                                </Button>

                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    onClick={() => handleDeleteVariable(variable.name)}
                                                    disabled={!canEditPrompt}
                                                    title={`Delete variable`}
                                                >
                                                    <Trash2 />
                                                </Button>
                                            </div>
                                        )
                                    ))}

                                    {isAddingVariable && editingVariableName === null && (
                                        <div className="contents">
                                            <div className="flex h-9 min-w-0 items-center gap-1 font-mono text-sm">
                                                <span>{"{"}</span>
                                                <Input
                                                    value={variableName}
                                                    onChange={(event) => setVariableName(event.target.value)}
                                                    disabled={isCreating}
                                                    placeholder="Variable name"
                                                    className="min-w-0"
                                                />
                                                <span>{"}:"}</span>
                                            </div>

                                            <Textarea
                                                ref={variableValueTextareaRef}
                                                value={variableValue}
                                                onChange={event => handleVariableValueChange(event.target.value)}
                                                disabled={isCreating}
                                                placeholder="Variable value"
                                                className="min-h-9 resize-none overflow-hidden"
                                            />

                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={handleCancelAddingVariable}
                                                title="Cancel"
                                                disabled={isCreating}
                                                className="hover:bg-muted hover:text-foreground"
                                            >
                                                <X />
                                            </Button>

                                            <Button
                                                type="button"
                                                size="icon"
                                                onClick={handleSaveVariable}
                                                title="Save"
                                                disabled={isCreating}
                                            >
                                                <Check />
                                            </Button>
                                        </div>
                                    )}

                                    {!isAddingVariable && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={handleStartAddingVariable}
                                            disabled={!canEditPrompt}
                                            title="Add variable"
                                            className="col-start-1"
                                        >
                                            <Plus />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/*________________________ Revert and Commit Buttons ________________________*/}
                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleRevert}
                                    disabled={!hasPromptChanges || isAddingVariable || isCreating}>
                                    <RotateCcw className="h-4 w-4" />
                                    Revert Changes
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleOpenCommitDialog}
                                    disabled={!hasPromptChanges || !canEditPrompt || isAddingVariable || isCreating}>
                                    <Save className="h-4 w-4" />
                                    Commit Changes
                                </Button>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                </CardContent>
            </Card>

            {/*________________________ Commit Dialog ________________________*/}
            <Dialog open={isCommitDialogOpen} onOpenChange={setIsCommitDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Commit Prompt Version</DialogTitle>
                        <DialogDescription>Describe the changes made in this prompt version.</DialogDescription>
                    </DialogHeader>

                    {isNewPrompt && (
                        <div className="space-y-2">
                            <Label htmlFor={`evaluation-${instanceId}-prompt-new-prompt-name`}>Prompt name</Label>
                            <Input
                                id={`evaluation-${instanceId}-prompt-new-prompt-name`}
                                value={newPromptName}
                                onChange={(event) => setNewPromptName(event.target.value)}
                                disabled={isCreating}
                                placeholder="Enter a name for the new prompt..."
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor={`evaluation-${instanceId}-prompt-commit-message`}>Commit message</Label>
                        <Input
                            id={`evaluation-${instanceId}-prompt-commit-message`}
                            value={commitMessage}
                            onChange={(event) => setCommitMessage(event.target.value)}
                            disabled={isCreating}
                            placeholder="Enter a commit message..."
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsCommitDialogOpen(false)} disabled={isCreating}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleCommit} disabled={isCreating || !hasPromptChanges}>
                            {isCreating ? "Committing..." : "Commit"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}