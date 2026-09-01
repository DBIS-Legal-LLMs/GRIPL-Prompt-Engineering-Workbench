"use client";

import { PromptVersion, classificationScopeLabels } from "@/models/dto/PromptVersion";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";

interface PromptVersionItemProps {
    version: PromptVersion;
}

/**
 * Displays a prompt version card that is collapsible. In closed state, the version number, 
 * classification scope, default status and commit message is visible. When expanded, the 
 * prompt template is displayed.
 * 
 * @param {PromptVersionItemProps} props - The prompt version object that should be displayed.
 * @returns {JSX.Element} The rendered prompt version item component.
 */
export default function PromptVersionItem({ version }: PromptVersionItemProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <Card className="w-full">
                <div className="w-full text-left">
                    <CardHeader className="grid grid-cols-[16rem__auto_minmax(0,1fr)] items-center gap-3 py-4">
                        <CollapsibleTrigger>
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <CardTitle>Version {version.versionNumber}</CardTitle>
                                <Badge>{classificationScopeLabels[version.classificationScope]}</Badge>
                                {version.isDefault ? <Badge>Default</Badge> : <Badge className="invisible">Default</Badge>}
                            </div>
                        </CollapsibleTrigger>

                        <span className="max-w-[48rem] truncate select-text rounded-md text-sm">
                            {version.commitMessage || "No commit message provided."}
                        </span>

                        <CollapsibleTrigger className="flex min-h-9 min-w-10 justify-end px-2">
                            {isOpen ? <ChevronDown /> : <ChevronUp />}
                        </CollapsibleTrigger>
                    </CardHeader>
                </div>

                <CollapsibleContent>
                    <CardContent className="pt-2">
                        <pre className="whitespace-pre-wrap rounded-md border bg-gray-100 p-3 text-sm">
                            {version.template}
                        </pre>
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}