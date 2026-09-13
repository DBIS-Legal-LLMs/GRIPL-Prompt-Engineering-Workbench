"use client";

import { PromptVersion, classificationScopeLabels } from "@/models/dto/PromptVersion";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";
import DeletePromptVersionButton from "@/components/prompts/delete-prompt-version-button";

interface PromptVersionItemProps {
    version: PromptVersion;
    isDefault: boolean;
    isLatestVersion: boolean;
    disabled?: boolean;
    onVersionDeleted: (promptVersionId: number) => void;
}

/**
 * Displays a prompt version card that is collapsible. In closed state, the version number, 
 * classification scope, default status and commit message are visible. When expanded, the 
 * prompt template and its variables are displayed.
 * 
 * The default status is supplied separately because the full prompt version may have been 
 * loaded before the default selection changed.
 * 
 * @param {PromptVersionItemProps} props - The prompt version object that should be displayed.
 * @returns {JSX.Element} The rendered prompt version item component.
 */
export default function PromptVersionItem({ version, isDefault, isLatestVersion, disabled, onVersionDeleted }: PromptVersionItemProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="grid w-full grid-cols-[minmax(0,1fr)_178px_157px] items-start gap-x-2">
            <Collapsible open={isOpen} onOpenChange={setIsOpen} className="ml-8">
                <Card className="w-full">
                    <div className="w-full text-left">
                        <CardHeader className="grid grid-cols-[17rem__auto_minmax(0,1fr)] items-center gap-3 py-4">
                            <CollapsibleTrigger>
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <CardTitle>Version {version.versionNumber}</CardTitle>
                                    <Badge>{classificationScopeLabels[version.classificationScope]}</Badge>
                                    {isDefault ? <Badge>Default</Badge> : <Badge className="invisible">Default</Badge>}
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
                        <CardContent className="space-y-6 pt-1">
                            <div className="space-y-3">
                                <p className="text-sm font-medium">Template</p>
                                <pre className="whitespace-pre-wrap rounded-md border bg-gray-100 p-3 text-sm">
                                    {version.template}
                                </pre>
                            </div>

                            <div className="space-y-2">
                                {version.variables.length !== 0 && (
                                    <>
                                        <p className="text-sm font-medium">Variables</p>
                                        <div className="grid grid-cols-[fit-content(14rem)_minmax(0,1fr)] gap-x-2 gap-y-2 px-3 pb-3 text-sm">
                                            {version.variables.map((variable) => (
                                                <div key={variable.name} className="contents">
                                                    <span className="min-w-0 whitespace-normal break-words font-mono font-semibold">{`{${variable.name}}:`}</span>
                                                    <span className="min-w-0 whitespace-pre-wrap break-words">{variable.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </CollapsibleContent>
                </Card>
            </Collapsible>

            {isLatestVersion ? (
                <DeletePromptVersionButton promptVersion={version} disabled={disabled} onVersionDeleted={onVersionDeleted} className="h-[76px] w-full" />
            ) : (
                <div />
            )}

            <div />
        </div>
    );
}