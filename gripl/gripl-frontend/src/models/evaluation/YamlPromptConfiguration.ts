import { ClassificationScope, Variable } from "@/models/dto/PromptVersion";

/**
 * Prompt configuration as persisted in an YAML configuration file.
 *
 * Unlike EvaluationPromptConfiguration, this type contains the complete prompt
 * content so an export can be imported independently of the current database.
 */
export interface YamlPromptConfiguration {
    promptId?: number | null;
    promptVersionId?: number | null;
    promptLabel: string;
    template?: string | null;
    variables?: Variable[] | null;
    classificationScope?: ClassificationScope | null;
}
