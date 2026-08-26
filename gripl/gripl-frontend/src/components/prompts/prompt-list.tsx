import { Prompt } from "@/models/dto/Prompt";
import PromptItem from "./prompt-item";

interface PromptListProps {
    prompts: Prompt[];
}

/**
 * Displays a list of prompts, by rendering a PromptItem for each prompt in the list it gets passed. 
 * If the list is empty (there are no prompts yet), a message is displayed instead. 
 * 
 * @param {PromptListProps} props - The list of prompts to be displayed.
 * @returns {JSX.Element} The rendered prompt list component.
 */
export default function PromptList({ prompts }: PromptListProps) {
    if (prompts.length === 0) {
        return <p>No prompts available yet.</p>;
    }

    return (
        <div>
            {prompts.map((prompt) => (
                <PromptItem key={prompt.id} prompt={prompt} className="mb-4" />
            ))}
        </div>
    );
}