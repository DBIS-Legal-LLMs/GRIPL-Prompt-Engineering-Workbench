import { Prompt } from "@/models/dto/Prompt";
import { DefaultPromptSelection } from "@/models/dto/DefaultPromptSelectionOverview";
import PromptItem from "./prompt-item";

interface PromptListProps {
    prompts: Prompt[];
    promptIdWithVersionDraft: number | null;
    startVersionCreation: (promptId: number) => boolean;
    finishVersionCreation: () => void;
    onPromptDeleted: (promptId: number) => void;
    onVersionCreated: () => void;
    onVersionDeleted: () => void;
    promptIdWithRenameDraft: number | null;
    startPromptRename: (promptId: number) => boolean;
    finishPromptRename: () => void;
    onPromptRenamed: (promptId: number, newName: string) => void;
    defaultSelection: DefaultPromptSelection | null;
}

/**
 * Displays a list of prompts by rendering one PromptItem for each entry.
 * Displays an empty-state message when no prompts are available.
 * 
 * Forwards the centrally managed version-creation and rename state, mutation 
 * callbacks, and the current default selection to every prompt item.
 * 
 * @param {PromptListProps} props - The prompts to display, version-creation
 * state and handlers, mutation callbacks, and the current default selection.
 * @returns {JSX.Element} The rendered prompt list component.
 */
export default function PromptList({ prompts, promptIdWithVersionDraft, startVersionCreation, finishVersionCreation, onPromptDeleted, onVersionCreated, onVersionDeleted, promptIdWithRenameDraft, startPromptRename, finishPromptRename, onPromptRenamed, defaultSelection }: PromptListProps) {
    if (prompts.length === 0) {
        return <p>No prompts available yet.</p>;
    }

    return (
        <div>
            {prompts.map((prompt) => (
                <PromptItem
                    key={prompt.id}
                    prompt={prompt}
                    promptIdWithVersionDraft={promptIdWithVersionDraft}
                    startVersionCreation={startVersionCreation}
                    finishVersionCreation={finishVersionCreation}
                    onPromptDeleted={onPromptDeleted}
                    onVersionCreated={onVersionCreated}
                    onVersionDeleted={onVersionDeleted}
                    promptIdWithRenameDraft={promptIdWithRenameDraft}
                    startPromptRename={startPromptRename}
                    finishPromptRename={finishPromptRename}
                    onPromptRenamed={onPromptRenamed}
                    defaultSelection={defaultSelection}
                />
            ))}
        </div>
    );
}