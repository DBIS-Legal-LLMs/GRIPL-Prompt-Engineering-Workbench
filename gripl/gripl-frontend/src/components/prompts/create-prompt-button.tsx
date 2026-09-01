"use client"

import { Prompt } from "@/models/dto/Prompt";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import createPrompt from "@/actions/create-prompt";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface CreatePromptButtonProps {
    onPromptCreated: (prompt: Prompt) => void;
    disabled?: boolean;
}

/**
 * Displays a button that opens a dialog to create a new prompt.
 *
 * @param {CreatePromptButtonProps} props - The function to be called when a new prompt is created.
 * @returns {JSX.Element} The rendered create prompt button component.
 */
export default function CreatePromptButton({ onPromptCreated, disabled }: CreatePromptButtonProps) {
    const { showToast, showError } = useToast();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    async function handleCreate() {
        const promptName = (document.getElementById("prompt-name") as HTMLInputElement).value;
        
        const trimmedPromptName = promptName.trim();
        if (!trimmedPromptName) {
            showToast({ title: "Please enter a name for the prompt.", variant: "info" });
            return;
        }

        setIsCreating(true);
        try {
            const createdPrompt = await createPrompt(trimmedPromptName);
            onPromptCreated(createdPrompt);
            (document.getElementById("prompt-name") as HTMLInputElement).value = "";
            setIsDialogOpen(false);
        } catch (error) {
            console.error("There was an error creating the prompt:", error);
            showError("Failed to create prompt", "Make sure the backend is running and the API URL is correct.");
        } finally {
            setIsCreating(false);
        }
    }

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Button type="button" onClick={() => setIsDialogOpen(true)} disabled={disabled}>
                <Plus />
                <span className="pl-2 text-center">Create Prompt</span>
            </Button>

            <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Prompt</DialogTitle>
                        <DialogDescription>Create a new prompt to organize different prompt versions.</DialogDescription>
                    </DialogHeader>

                    <div>
                        <Label htmlFor="prompt-name">Name</Label>
                        <Input id="prompt-name" placeholder="name" disabled={isCreating} />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isCreating}>
                            Cancel
                        </Button>
                        <Button type="submit" onClick={() => handleCreate()} disabled={isCreating}>
                            {isCreating ? "Creating..." : "Create"}
                        </Button>
                    </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}