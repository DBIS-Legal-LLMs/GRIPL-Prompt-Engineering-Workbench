import { Prompt } from "@/models/dto/Prompt";
import PromptItem from "./prompt-item";

interface PromptListProps {
    prompts: Prompt[];
    promptIdWithVersionDraft: number | null;
    startVersionCreation: (promptId: number) => boolean;
    finishVersionCreation: () => void;
    onPromptDeleted: (promptId: number) => void;
}

/**
 * Displays a list of prompts by rendering one PromptItem for each entry.
 * Displays an empty-state message when no prompts are available.
 * 
 * Forwards the centrally managed version-creation state and handlers, as well
 * as the deletion callback, to every prompt item.
 * 
 * @param {PromptListProps} props - The prompts to display, version-creation
 * state and handlers, and the callback invoked after a prompt is deleted.
 * @returns {JSX.Element} The rendered prompt list component.
 */
export default function PromptList({ prompts, promptIdWithVersionDraft, startVersionCreation, finishVersionCreation, onPromptDeleted }: PromptListProps) {
    if (prompts.length === 0) {
        return <p>No prompts available yet.</p>;
    }

    return (
        <div>
            {prompts.map((prompt) => (
                <PromptItem
                    key={prompt.id}
                    prompt={prompt}
                    className="mb-4"
                    promptIdWithVersionDraft={promptIdWithVersionDraft}
                    startVersionCreation={startVersionCreation}
                    finishVersionCreation={finishVersionCreation}
                    onPromptDeleted={onPromptDeleted}
                />
            ))}
        </div>
    );
}