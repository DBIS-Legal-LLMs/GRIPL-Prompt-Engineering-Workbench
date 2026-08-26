"use client";

import { useState } from "react";
import { Prompt } from "@/models/dto/Prompt";
import { PromptVersion } from "@/models/dto/PromptVersion";
import getPromptVersions from "@/actions/get-prompt-versions";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import PromptVersionItem from "@/components/prompts/prompt-version-item";

interface PromptItemProps {
    prompt: Prompt;
    className?: string;
}

/**
 * Displays a prompt item that is collapsible. In closed state, the prompt name is visible.
 * When expanded, the corresponding prompt versions are displayed. 
 * 
 * Uses lazy loading to fetch the prompt versions, meaning the prompt versions are only fetched 
 * when expanding the prompt item for the first time, avoiding requests for prompts the user 
 * never inspects. If loading fails, an error toast notification is shown.
 * 
 * @param {PromptItemProps} props - The prompt object that should be displayed and an optional CSS class name.
 * @returns {JSX.Element} The rendered prompt item component.
 */
export default function PromptItem({ prompt, className }: PromptItemProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [promptVersions, setPromptVersions] = useState<PromptVersion[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const { showError } = useToast();

    async function handleOpenChange(open: boolean) {
        setIsOpen(open);

        // Load versions only when this prompt is opened for the first time.
        if (!open || promptVersions !== null || isLoading) return;

        setIsLoading(true);
        setLoadError(null);

        try {
            const versions = await getPromptVersions(prompt.id);
            setPromptVersions(versions);
        } catch (error) {
            console.error(`Failed to load versions for prompt ${prompt.id}:`, error);
            setLoadError("Failed to load prompt versions.");
            showError("Failed to load prompt versions");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
            <CollapsibleTrigger className="w-full text-left">
                <Card className={`w-full ${className ?? ""}`}>
                    <CardHeader className="flex-row items-center justify-between">
                        <CardTitle>
                            {prompt.name}
                        </CardTitle>
                        {isOpen ? <ChevronDown/> : <ChevronUp/>}
                    </CardHeader>
                </Card>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="space-y-3 px-4 pb-4 pt-1">
                    {isLoading && (
                        <Card>
                            <CardContent className="py-6 text-sm text-muted-foreground">
                                Loading versions ...
                            </CardContent>
                        </Card>
                    )}

                    {loadError && <p className="text-red-500">{loadError}</p>}

                    {promptVersions !== null && promptVersions.length === 0 && (
                        <Card>
                            <CardContent className="py-6 text-sm text-muted-foreground">
                                There are no versions of this prompt yet.
                            </CardContent>
                        </Card>
                    )}

                    {promptVersions?.map((version) => (
                        <PromptVersionItem key={version.id} version={version} />
                    ))}

                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}