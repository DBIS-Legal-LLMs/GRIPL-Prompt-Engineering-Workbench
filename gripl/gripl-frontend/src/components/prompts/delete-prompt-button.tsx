"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { Prompt } from "@/models/dto/Prompt";
import { Trash2 } from "lucide-react";
import deletePrompt from "@/actions/delete-prompt";

interface DeletePromptButtonProps {
    prompt: Prompt;
    disabled?: boolean;
    onPromptDeleted: (promptId: number) => void;
    className?: string;
}

/**
 * Displays a button that opens a confirmation dialog for deleting a prompt and all of its versions.
 * 
 * @param {DeletePromptButtonProps} props - The prompt to delete, its disabled
 * state, the callback for a successful deletion, and optional styling.
 * @returns {JSX.Element} The rendered prompt deletion button and confirmation dialog.
 */
export default function DeletePromptButton({ prompt, disabled, onPromptDeleted, className }: DeletePromptButtonProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { showError } = useToast();

    async function handlePromptDeletion() {
        setIsDeleting(true);
        try {
            await deletePrompt(prompt.id);
            onPromptDeleted(prompt.id);
        } catch (error) {
            console.error(`Failed to delete prompt ${prompt.id}:`, error);
            showError("Failed to delete prompt.");
        } finally {
            setIsDeleting(false);
            setIsDialogOpen(false);
        }
    }

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Button type="button" variant="destructive" onClick={() => setIsDialogOpen(true)} disabled={disabled || isDeleting} className={className}>
                <Trash2 />
                <span className="pl-2 text-center">Delete Prompt</span>
            </Button>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete prompt "{prompt.name}"?</DialogTitle>
                    <DialogDescription>This will permanently delete the prompt and all of its versions.<br />
                        This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isDeleting}>
                        Cancel
                    </Button>
                    <Button type="button" variant="destructive" onClick={handlePromptDeletion} disabled={isDeleting}>
                        {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}