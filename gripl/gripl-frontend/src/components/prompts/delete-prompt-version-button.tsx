"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { Trash2 } from "lucide-react";
import deletePromptVersion from "@/actions/delete-prompt-version";
import { PromptVersion } from "@/models/dto/PromptVersion";

interface DeletePromptVersionButtonProps {
    promptVersion: PromptVersion;
    disabled?: boolean;
    onVersionDeleted: (promptVersionId: number) => void;
    className?: string;
}

/**
 * Displays a button with a confirmation dialog for deleting the latest version of a prompt.
 *
 * @param {DeletePromptVersionButtonProps} props - The version to delete, its disabled state, 
 * the callback for a successful deletion and optional styling.
 * @returns {JSX.Element} The rendered version deletion button and dialog.
 */
export default function DeletePromptVersionButton({ promptVersion, disabled, onVersionDeleted, className }: DeletePromptVersionButtonProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { showError } = useToast();

    async function handleVersionDeletion() {
        setIsDeleting(true);
        try {
            await deletePromptVersion(promptVersion.id);
            onVersionDeleted(promptVersion.id);
        } catch (error) {
            console.error(`Failed to delete prompt version ${promptVersion.id}:`, error);
            showError("Failed to delete prompt version.");
        } finally {
            setIsDeleting(false);
            setIsDialogOpen(false);
        }
    }

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Button type="button" variant="destructive" onClick={() => setIsDialogOpen(true)} disabled={disabled || isDeleting} className={className}>
                <Trash2 />
                <span className="pl-2 text-center">Delete Version</span>
            </Button>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Version {promptVersion.versionNumber}?</DialogTitle>
                    <DialogDescription>This will permanently delete this version of the prompt.<br />
                        This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isDeleting}>
                        Cancel
                    </Button>
                    <Button type="button" variant="destructive" onClick={handleVersionDeletion} disabled={isDeleting}>
                        {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}