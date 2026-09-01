/**
 * Represents a prompt version as received from the backend API.
 * A prompt version is a specific iteration of a prompt.
 * 
 * @property {number} id - The unique identifier of the prompt version.
 * @property {number} promptId - The unique identifier of the prompt to which this version belongs.
 * @property {number} versionNumber - The version number.
 * @property {string} template - The prompt text of the version.
 * @property {Variable[]} variables - The variables used in the prompt template.
 * @property {ClassificationScope} classificationScope - Either ACTIVITIES_ONLY for classification of just activities or ALL_BPMN_ELEMENTS for classification of all BPMN elements.
 * @property {string} commitMessage - Description of changes in this version.
 * @property {boolean} isDefault - Indicates whether this version is the default version used for regular GRIPL analyses.
 * @property {string} createdAt - The timestamp when this version was created.
 */
export interface PromptVersion {
    id: number;
    promptId: number;
    versionNumber: number;
    template: string;
    variables: Variable[];
    classificationScope: ClassificationScope;
    commitMessage: string;
    isDefault: boolean;
    createdAt: string;
}

/**
 * A single injectable variable in a prompt template represented by a name-value pair.
 * 
 * @property {string} name - The name of the variable.
 * @property {string} value - The value to inject into the prompt template.
 */
export interface Variable {
    name: string;
    value: string;
}

/**
 * Specifies whether a prompt classifies only activities or all BPMN elements (activities, events, gateways, data objects/stores). 
 * This determines the classification universe used for calculating evaluation metrics in the backend.
 */
export enum ClassificationScope {
    ACTIVITIES_ONLY = "ACTIVITIES_ONLY",
    ALL_BPMN_ELEMENTS = "ALL_BPMN_ELEMENTS",
}

export const classificationScopeLabels: Record<ClassificationScope, string> = {
    [ClassificationScope.ACTIVITIES_ONLY]: "Activities only",
    [ClassificationScope.ALL_BPMN_ELEMENTS]: "All BPMN elements",
};