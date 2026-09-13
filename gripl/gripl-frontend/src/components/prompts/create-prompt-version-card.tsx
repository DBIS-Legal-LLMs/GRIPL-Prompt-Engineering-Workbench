"use client";

import { ClassificationScope, classificationScopeLabels, PromptVersion, Variable } from "@/models/dto/PromptVersion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import createPromptVersion from "@/actions/create-prompt-version";
import { Badge } from "@/components/ui/badge";

interface CreatePromptVersionCardProps {
    idOfParentPrompt: number;
    previousVersion?: PromptVersion;
    onVersionCreated: (newVersion: PromptVersion) => void;
    onCancel: () => void;
}

/**
 * Displays the editor for a new prompt version.
 *
 * The editor initializes its template and variables with the template and 
 * variables of the previous version. It requires a classification scope and 
 * prompt text before opening the commit dialog, and requires a commit message 
 * before sending the creation request to the backend.
 *
 * @param {CreatePromptVersionCardProps} props - The parent prompt id, the previous
 * version, and callbacks for cancelling or handling a successful commit.
 * @returns {JSX.Element} The rendered prompt-version creation editor.
 */
export default function CreatePromptVersionCard({ idOfParentPrompt, previousVersion, onVersionCreated, onCancel }: CreatePromptVersionCardProps) {
    const { showToast, showError } = useToast();

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [template, setTemplate] = useState(previousVersion?.template ?? "");
    const [variables, setVariables] = useState<Variable[]>(previousVersion?.variables ?? []);
    const [isAddingVariable, setIsAddingVariable] = useState(false);
    const [variableName, setVariableName] = useState("");
    const [variableValue, setVariableValue] = useState("");
    const [editingVariableName, setEditingVariableName] = useState<string | null>(null);
    const variableValueTextareaRef = useRef<HTMLTextAreaElement>(null);
    const [classificationScope, setClassificationScope] = useState<ClassificationScope | null>(null);
    const [commitMessage, setCommitMessage] = useState("");
    const [isCommitDialogOpen, setIsCommitDialogOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    function handleStartAddingVariable() {
        setVariableName("");
        setVariableValue("");
        setEditingVariableName(null);
        setIsAddingVariable(true);

        requestAnimationFrame(resizeVariableValueTextarea);
    }

    function handleStartEditingVariable(variable: Variable) {
        setVariableName(variable.name);
        setVariableValue(variable.value);
        setEditingVariableName(variable.name);
        setIsAddingVariable(true);

        requestAnimationFrame(resizeVariableValueTextarea);
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

        setIsCreating(true);
        try {
            const createdVersion = await createPromptVersion(idOfParentPrompt, {
                template,
                variables: variables,
                classificationScope,
                commitMessage: trimmedCommitMessage
            });

            onVersionCreated(createdVersion);
            setIsCommitDialogOpen(false);
        } catch (error) {
            console.error("There was an error creating the prompt version:", error);
            showError("Failed to create prompt version.", "Make sure the backend is running.");
        } finally {
            setIsCreating(false);
        }
    }

    function resizeTextarea() {
        const textarea = textareaRef.current;
        if (!textarea) return;

        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
    }

    useEffect(() => {
        resizeTextarea();
    }, []);

    function handleTemplateChange(templateValue: string) {
        setTemplate(templateValue);
        requestAnimationFrame(resizeTextarea);
    }

    function resizeVariableValueTextarea() {
        const textarea = variableValueTextareaRef.current;
        if (!textarea) return;

        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
    }

    useEffect(() => {
        resizeVariableValueTextarea();
    }, []);

    function handleVariableValueChange(variableValue: string) {
        setVariableValue(variableValue);
        requestAnimationFrame(resizeVariableValueTextarea);
    }

    return (
        <>
            <Card className="w-full mt-3">
                <CardHeader className="flex-row items-center justify-between py-4">
                    <CardTitle>Create new Prompt Version</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-start gap-4" role="radiogroup" aria-label="Classification Scope">
                        <span className="pt-1 text-sm font-medium leading-none">Classification Scope:</span>
                        <div className="flex flex-wrap gap-6">
                            {Object.values(ClassificationScope).map((scope) => (
                                <label
                                    key={scope}
                                    htmlFor={`classificationScope-${idOfParentPrompt}-${scope}`}
                                    className="flex cursor-pointer flex-col items-center gap-2">
                                    <input
                                        id={`classificationScope-${idOfParentPrompt}-${scope}`}
                                        type="radio"
                                        name={`classificationScope-${idOfParentPrompt}`}
                                        value={scope}
                                        checked={classificationScope === scope}
                                        onChange={() => setClassificationScope(scope)}
                                        disabled={isCreating}
                                        className="h-4 w-4 cursor-pointer accent-primary" />
                                    <Badge>{classificationScopeLabels[scope]}</Badge>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor={`template-${idOfParentPrompt}`}>Template</Label>
                        <Textarea
                            id={`template-${idOfParentPrompt}`}
                            ref={textareaRef}
                            value={template}
                            onChange={(event) => handleTemplateChange(event.target.value)}
                            disabled={isCreating}
                            placeholder="Enter the prompt text here..."
                            className="min-h-[24rem] resize-none overflow-hidden font-mono"
                        />
                    </div>

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
                                            disabled={isCreating || isAddingVariable}
                                            title={`Edit variable`}
                                        >
                                            <Pencil />
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            onClick={() => handleDeleteVariable(variable.name)}
                                            disabled={isCreating || isAddingVariable}
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
                                    disabled={isCreating}
                                    title="Add variable"
                                    className="col-start-1"
                                >
                                    <Plus />
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onCancel} disabled={isCreating || isAddingVariable}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleOpenCommitDialog} disabled={isCreating || isAddingVariable}>
                            <Save />
                            Commit version
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isCommitDialogOpen} onOpenChange={setIsCommitDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Commit Prompt Version</DialogTitle>
                        <DialogDescription>Describe the changes made in this prompt version.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor={`commit-message-${idOfParentPrompt}`}>Commit message</Label>
                        <Input
                            id={`commit-message-${idOfParentPrompt}`}
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
                        <Button type="button" onClick={handleCommit} disabled={isCreating}>
                            {isCreating ? "Committing..." : "Commit"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}