"use client";

import { useRef } from "react";
import { dump as yamlDump, load as yamlLoad } from "js-yaml";
import { MultiEvaluationRequest, ModelRunConfig } from "@/models/dto/MultiEvaluationRequest";
import { EvaluationPromptConfiguration } from "@/models/dto/MultiEvaluationRequest";
import { ClassificationScope, Variable, PromptVersion } from "@/models/dto/PromptVersion";
import {ModelRowState} from "@/models/evaluation/Config";
import {cryptoRandomId, findPreset, normalize, pruneNulls} from "@/lib/evaluation-config-utils";
import {useToast} from "@/components/ui/toast";
import {toErrorMessage} from "@/lib/http-error";
import getPromptVersions from "@/actions/get-prompt-versions";
import { Prompt } from "@/models/dto/Prompt";
import { YamlPromptConfiguration } from "@/models/evaluation/YamlPromptConfiguration";

export function useYamlImportExport(props: {
    availableEvaluationEndpoints: AnalysisEndpoint[];
    effectiveDefaultEndpoint: string;
    prompts: Prompt[];
    models: ModelRowState[];
    yamlPromptConfigurations: Array<YamlPromptConfiguration | null>;
    selectedDatasets: number[];
    seed: number | null;
    maxConcurrent: number;
    repetitions: number;
    useRag: boolean;
    ragMode: string;
    evaluateRag: boolean;
    setDefaultEndpointChoice: (v: "preset" | "custom") => void;
    setDefaultPresetEndpoint: (v: string) => void;
    setDefaultCustomEndpoint: (v: string) => void;
    setSeed: (v: number | null) => void;
    setMaxConcurrent: (v: number) => void;
    setRepetitions: (v: number) => void;
    setSelectedDatasets: (v: number[]) => void;
    setSelectedTestCaseIds: (v: number[]) => void;
    setModels: (v: ModelRowState[]) => void;
    setUseRag: (v: boolean) => void;
    setRagMode: (v: string) => void;
    setEvaluateRag: (v: boolean) => void;
    setPromptConfigurations: (v: Array<EvaluationPromptConfiguration | null>) => void;
    setYamlPromptConfigurations: (v: Array<YamlPromptConfiguration | null>) => void;
}) {
    const {
        availableEvaluationEndpoints,
        effectiveDefaultEndpoint,
        prompts,
        models,
        yamlPromptConfigurations,
        selectedDatasets,
        seed,
        maxConcurrent,
        repetitions,
        useRag,
        ragMode,
        evaluateRag,
        setDefaultEndpointChoice,
        setDefaultPresetEndpoint,
        setDefaultCustomEndpoint,
        setSeed,
        setMaxConcurrent,
        setRepetitions,
        setSelectedDatasets,
        setSelectedTestCaseIds,
        setModels,
        setUseRag,
        setRagMode,
        setEvaluateRag,
        setPromptConfigurations,
        setYamlPromptConfigurations,
    } = props;

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const {showError} = useToast();

    function onClickImportYaml() {
        fileInputRef.current?.click();
    }

    async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            const parsed = yamlLoad(text) as any;
            await applyYamlConfig(parsed);
        } catch (err) {
            console.error("YAML parse error:", err);
            showError("Failed to parse YAML", toErrorMessage(err));
        } finally {
            e.target.value = "";
        }
    }

    function variablesMatch(left: Variable[], right: Variable[]): boolean {
        return left.length === right.length && left.every((variable, index) =>
            variable.name === right[index]?.name && variable.value === right[index]?.value
        );
    }

    function normalizeAnalysisEndpoint(endpoint: string): string {
        return endpoint.replace(/\/(?:prompt-engineering|baseline)$/, "");
    }

    function promptVersionMatches(imported: any, stored: PromptVersion): boolean {
        const variables = imported.variables ?? imported.promptVersionOverride?.variables;
        return imported.template === stored.template &&
            imported.classificationScope === stored.classificationScope &&
            variablesMatch(Array.isArray(variables) ? variables : [], stored.variables);
    }

    function createYamlConfiguration(imported: any, promptLabel: string, promptId: number | null = null, promptVersionId: number | null = null): YamlPromptConfiguration | null {
        const template = imported?.template ?? imported?.promptVersionOverride?.template;
        const variables = imported?.variables ?? imported?.promptVersionOverride?.variables;
        const classificationScope = imported?.classificationScope ?? imported?.promptVersionOverride?.classificationScope;
        if (typeof template !== "string" || !template.trim()) return null;
        if (!Object.values(ClassificationScope).includes(classificationScope)) return null;

        return {
            promptId,
            promptLabel: String(imported.promptLabel ?? promptLabel),
            promptVersionId,
            template,
            variables: Array.isArray(variables) ? variables : [],
            classificationScope,
        };
    }

    function createBackendOverride(yamlConfiguration: YamlPromptConfiguration): EvaluationPromptConfiguration {
        return {
            promptLabel: yamlConfiguration.promptLabel,
            promptVersionId: null,
            promptVersionOverride: {
                template: yamlConfiguration.template ?? "",
                variables: yamlConfiguration.variables ?? [],
                classificationScope: yamlConfiguration.classificationScope!,
            },
        };
    }

    async function resolvePromptConfiguration(imported: any, fallbackLabel: string): Promise<{
        backend: EvaluationPromptConfiguration | null;
        yaml: YamlPromptConfiguration | null;
    }> {
        const promptId = Number.isInteger(imported?.promptId) ? imported.promptId : null;
        const promptVersionId = Number.isInteger(imported?.promptVersionId) ? imported.promptVersionId : null;

        if (promptId === null || promptVersionId === null) {
            const yaml = createYamlConfiguration(imported, fallbackLabel);
            return { backend: yaml ? createBackendOverride(yaml) : null, yaml };
        }

        try {
            const versions = await getPromptVersions(promptId);
            const storedVersion = versions.find((version) => version.id === promptVersionId);
            if (storedVersion && promptVersionMatches(imported, storedVersion)) {
                return {
                    backend: {
                        promptLabel: String(imported.promptLabel ?? `${fallbackLabel} V${storedVersion.versionNumber}`),
                        promptVersionId: storedVersion.id,
                        promptVersionOverride: null,
                    },
                    yaml: createYamlConfiguration(imported, fallbackLabel, promptId, storedVersion.id),
                };
            }

            if (storedVersion) {
                const yaml = createYamlConfiguration(imported, fallbackLabel, promptId, storedVersion.id);
                return { backend: yaml ? { ...createBackendOverride(yaml), promptVersionId: storedVersion.id } : null, yaml };
            }
        } catch (error) {
            console.warn("Could not load imported prompt version; using override.", error);
        }

        const yaml = createYamlConfiguration(imported, fallbackLabel);
        return { backend: yaml ? createBackendOverride(yaml) : null, yaml };
    }

    async function createLegacyPromptConfiguration(endpoint: string | undefined, activitiesOnly: boolean | undefined): Promise<{
        backend: EvaluationPromptConfiguration;
        yaml: YamlPromptConfiguration;
    } | null> {
        const promptId = endpoint === "/gdpr/analysis/baseline"
            ? 0
            : endpoint === "/gdpr/analysis/prompt-engineering"
                ? 1
                : null;
        if (promptId === null) return null;

        const versionNumber = activitiesOnly === true ? 1 : 2;
        try {
            const versions = await getPromptVersions(promptId);
            const version = versions.find((candidate) => candidate.versionNumber === versionNumber);
            if (!version) return null;

            const promptLabel = `${prompts.find((candidate) => candidate.id === promptId)?.name ?? `Prompt ${promptId}`} V${version.versionNumber}`;
            return {
                backend: {
                    promptLabel,
                    promptVersionId: version.id,
                    promptVersionOverride: null,
                },
                yaml: {
                    promptId,
                    promptLabel,
                    promptVersionId: version.id,
                },
            };
        } catch (error) {
            console.warn("Could not load legacy prompt version.", error);
            return null;
        }
    }

    async function applyYamlConfig(cfg: any) {
        const importedDefaultEvaluationEndpoint: string | undefined = cfg?.defaultEvaluationEndpoint;
        const defaultEvaluationEndpoint = importedDefaultEvaluationEndpoint
            ? normalizeAnalysisEndpoint(importedDefaultEvaluationEndpoint)
            : undefined;
        const seedString = cfg?.seed;
        const maxConc: number | undefined = cfg?.maxConcurrent ?? cfg?.maxConcurrency;
        const reps: number | undefined = cfg?.repetitions;
        const modelItems: any[] = Array.isArray(cfg?.models) ? cfg.models : [];
        const datasets: number[] = Array.isArray(cfg?.datasets) ? cfg.datasets.map((d: any) => parseInt(d)) : [];

        setDefaultEndpointChoice("preset");
        setDefaultPresetEndpoint(availableEvaluationEndpoints[0]?.endpoint ?? "");
        setDefaultCustomEndpoint("");
        setSeed(null);
        setMaxConcurrent(4);
        setRepetitions(1);
        setSelectedDatasets([]);
        setSelectedTestCaseIds([]);
        setModels([]);
        setUseRag(false);
        setRagMode("hybrid");
        setEvaluateRag(true);
        setPromptConfigurations([null, null]);
        setYamlPromptConfigurations([null, null]);

        setSelectedDatasets(datasets);

        if (defaultEvaluationEndpoint) {
            const presetHit = findPreset(defaultEvaluationEndpoint, availableEvaluationEndpoints);
            if (presetHit) {
                setDefaultEndpointChoice("preset");
                setDefaultPresetEndpoint(presetHit.endpoint);
            } else {
                setDefaultEndpointChoice("custom");
                setDefaultCustomEndpoint(defaultEvaluationEndpoint);
            }
        }

        if (typeof seedString === "number") {
            setSeed(seedString);
        }

        if (typeof maxConc === "number" && Number.isFinite(maxConc) && maxConc > 0) {
            setMaxConcurrent(maxConc);
        }

        if (typeof reps === "number" && Number.isFinite(reps) && reps > 0) {
            setRepetitions(reps);
        }

        if (typeof cfg?.useRag === "boolean") setUseRag(cfg.useRag);
        if (typeof cfg?.ragMode === "string" && cfg.ragMode) setRagMode(cfg.ragMode);
        if (typeof cfg?.evaluateRag === "boolean") setEvaluateRag(cfg.evaluateRag);

        {
            const next: ModelRowState[] = modelItems.map((model: any, idx: number) => {
                const label = String(model?.label ?? `Model ${idx + 1}`);

                const endpoint = typeof model?.evaluationEndpoint === "string"
                    ? normalizeAnalysisEndpoint(model.evaluationEndpoint)
                    : model?.evaluationEndpoint;
                let endpointChoice: "default" | "preset" | "custom" = "default";
                let selectedPresetEndpoint = "";
                let customEndpoint = "";

                if (endpoint && String(endpoint).trim() !== "") {
                    const preset = findPreset(endpoint, availableEvaluationEndpoints);
                    if (preset) {
                        endpointChoice = "preset";
                        selectedPresetEndpoint = preset.endpoint;
                    } else {
                        endpointChoice = "custom";
                        customEndpoint = endpoint;
                    }
                }

                const llmProps = model?.llmProps ?? {};
                const baseUrl = llmProps?.baseUrl ?? null;
                const modelName = (llmProps?.modelName ?? llmProps?.model) ?? null;
                const timeoutSeconds = typeof llmProps?.timeoutSeconds === "number" ? llmProps.timeoutSeconds : null;
                const temperature = typeof llmProps?.temperature === "number" ? llmProps.temperature : null;
                const topP = typeof llmProps?.topP === "number" ? llmProps.topP : null;

                return {
                    id: cryptoRandomId(),
                    label,
                    endpointChoice,
                    selectedPresetEndpoint,
                    customEndpoint,
                    baseUrl,
                    modelName,
                    apiKey: null,
                    timeoutSeconds,
                    temperature,
                    topP,
                } as ModelRowState;
            });

            setModels(next);
        }

        if (Array.isArray(cfg?.promptConfigurations)) {
            const resolved = await Promise.all(
                cfg.promptConfigurations.slice(0, 2).map((configuration: any, index: number) =>
                    resolvePromptConfiguration(configuration, `Prompt ${index === 0 ? "A" : "B"}`)
                )
            );
            setPromptConfigurations([resolved[0]?.backend ?? null, resolved[1]?.backend ?? null]);
            setYamlPromptConfigurations([resolved[0]?.yaml ?? null, resolved[1]?.yaml ?? null]);
        } else {
            const legacyConfiguration = await createLegacyPromptConfiguration(
                importedDefaultEvaluationEndpoint,
                typeof cfg?.activitiesOnly === "boolean" ? cfg.activitiesOnly : undefined
            );
            setPromptConfigurations([legacyConfiguration?.backend ?? null, null]);
            setYamlPromptConfigurations([legacyConfiguration?.yaml ?? null, null]);
        }
    }

    function buildRequestForExport(): MultiEvaluationRequest {
        const dtoModels: ModelRunConfig[] = models.map((m) => {
            const evaluationEndpoint =
                m.endpointChoice === "default"
                    ? null
                    : m.endpointChoice === "preset"
                        ? m.selectedPresetEndpoint || null
                        : m.customEndpoint?.trim() || null;

            const llmProps = {
                baseUrl: normalize(m.baseUrl),
                modelName: normalize(m.modelName),
                apiKey: null,
                timeoutSeconds: m.timeoutSeconds ?? null,
                temperature: m.temperature ?? null,
                topP: m.topP ?? null,
            } as const;

            return {
                label: m.label.trim() || "Model",
                evaluationEndpoint,
                llmProps: !llmProps.baseUrl && !llmProps.modelName && !llmProps.timeoutSeconds && !llmProps.temperature && !llmProps.topP ? null : llmProps,
            };
        });

        return {
            seed: seed || undefined,
            maxConcurrent: maxConcurrent || 1,
            repetitions: repetitions || 1,
            models: dtoModels,
            datasets: selectedDatasets,
            useRag,
            ragMode,
            evaluateRag: useRag && evaluateRag,
            promptConfigurations: [],
        };
    }

    function onClickExportYaml() {
        const req = buildRequestForExport();
        const exportConfig = {
            ...req,
            promptConfigurations: yamlPromptConfigurations.filter(
            (configuration): configuration is YamlPromptConfiguration => configuration !== null
            ),
        };
        const clean = pruneNulls(exportConfig);
        const text = yamlDump(clean, { noRefs: true, lineWidth: 120, indent: 2 });

        const blob = new Blob([text], { type: "text/yaml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `evaluation-config.yaml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    return { fileInputRef, onClickImportYaml, onFileChange, onClickExportYaml } as const;
}
