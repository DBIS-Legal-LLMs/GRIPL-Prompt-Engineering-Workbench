"use client";

import { ClassificationScope, classificationScopeLabels, PromptVersion } from "@/models/dto/PromptVersion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
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
 * The editor initializes its prompt text with the template of the previous
 * version, requires a classification scope and prompt text before opening the
 * commit dialog, and requires a commit message before sending the creation 
 * request to the backend.
 *
 * @param {CreatePromptVersionCardProps} props - The parent prompt id, the previous
 * version, and callbacks for cancelling or handling a successful commit.
 * @returns {JSX.Element} The rendered prompt-version creation editor.
 */
export default function CreatePromptVersionCard({ idOfParentPrompt, previousVersion, onVersionCreated, onCancel }: CreatePromptVersionCardProps) {
    const { showToast, showError } = useToast();

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [template, setTemplate] = useState(previousVersion?.template ?? "");
    const [classificationScope, setClassificationScope] = useState<ClassificationScope | null>(null);
    const [commitMessage, setCommitMessage] = useState("");
    const [isCommitDialogOpen, setIsCommitDialogOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

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
                variables: [],
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
                                        className="h-4 w-4 cursor-pointer accent-primary"/>
                                    <Badge>{classificationScopeLabels[scope]}</Badge>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor={`template-${idOfParentPrompt}`}>Prompt Text</Label>
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

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onCancel} disabled={isCreating}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleOpenCommitDialog} disabled={isCreating}>
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