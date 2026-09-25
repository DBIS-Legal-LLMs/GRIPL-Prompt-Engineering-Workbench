import { ClassificationScope, Variable } from "@/models/dto/PromptVersion";

export interface MultiEvaluationRequest {
    models: ModelRunConfig[];
    datasets: number[];
    evaluationDataIds?: number[];
    seed?: number;
    maxConcurrent: number | null;
    repetitions?: number;
    useRag: boolean;
    ragMode: string;
    evaluateRag: boolean;
    promptConfigurations: EvaluationPromptConfiguration[];
}

export interface ModelRunConfig {
    label: string;
    llmProps?: LlmPropsOverride | null;
}

export interface LlmPropsOverride {
    baseUrl?: string | null;
    modelName?: string | null;
    apiKey?: string | null;
    timeoutSeconds?: number | null;
}

export interface EvaluationPromptConfiguration {
    promptLabel: string;
    promptVersionId?: number | null;
    promptVersionOverride?: PromptVersionOverride | null;
}

export interface PromptVersionOverride {
    template: string;
    variables: Variable[];
    classificationScope: ClassificationScope;
}