"use client";

import React, { JSX, useCallback, useState } from "react";
import { Dataset } from "@/models/dto/Dataset";
import { EvaluationPromptConfiguration, MultiEvaluationRequest } from "@/models/dto/MultiEvaluationRequest";
import { useEvaluationConfig } from "@/hooks/evaluation/use-evaluation-config";
import { useYamlImportExport } from "@/hooks/evaluation/use-yaml-import-export";
import EvaluationConfigHeader from "@/components/evaluation/config/evaluation-config-header";
import EvaluationConfigDefaultSettings from "@/components/evaluation/config/evaluation-config-default-settings";
import EvaluationConfigDatasetSettings from "@/components/evaluation/config/evaluation-config-dataset-settings";
import EvaluationConfigModelsSettings from "@/components/evaluation/config/evaluation-config-models-settings";
import { nextLabel } from "@/lib/evaluation-config-utils";
import { Prompt } from "@/models/dto/Prompt";
import EvaluationConfigPromptSettings from "./evaluation-config-prompt-settings";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface EvaluationConfigCardMultiProps {
    className?: string;
    children?: JSX.Element;
    datasets: Dataset[];
    prompts: Prompt[];
    onPromptCreated: (createdPrompt: Prompt) => void;
    onMultiConfigChanged: (config: MultiEvaluationRequest) => void;
}

export default function EvaluationConfig({ className, children, datasets, prompts, onPromptCreated, onMultiConfigChanged }: EvaluationConfigCardMultiProps) {
    const config = useEvaluationConfig(datasets, onMultiConfigChanged);

    const [isComparisonPromptOpen, setIsComparisonPromptOpen] = useState(false);

    const handlePrimaryPromptConfigChanged = useCallback((promptConfiguration: EvaluationPromptConfiguration | null) => {
        config.setPromptConfiguration(0, promptConfiguration);
    },
        [config.setPromptConfiguration]
    );

    const handleComparisonPromptConfigChanged = useCallback((promptConfiguration: EvaluationPromptConfiguration | null) => {
        config.setPromptConfiguration(1, promptConfiguration);
    },
        [config.setPromptConfiguration]
    );

    const { fileInputRef, onClickImportYaml, onFileChange, onClickExportYaml } = useYamlImportExport({
        availableEvaluationEndpoints: config.availableEvaluationEndpoints,
        effectiveDefaultEndpoint: config.effectiveDefaultEndpoint,
        models: config.models,
        selectedDatasets: config.selectedDatasets,
        seed: config.seed,
        maxConcurrent: config.maxConcurrent,
        repetitions: config.repetitions,
        useRag: config.useRag,
        ragMode: config.ragMode,
        evaluateRag: config.evaluateRag,
        setDefaultEndpointChoice: (v) => config.setDefaultEndpointChoice(v),
        setDefaultPresetEndpoint: config.setDefaultPresetEndpoint,
        setDefaultCustomEndpoint: config.setDefaultCustomEndpoint,
        setSeed: config.setSeed,
        setMaxConcurrent: config.setMaxConcurrent,
        setRepetitions: config.setRepetitions,
        setSelectedDatasets: config.setSelectedDatasets,
        setModels: config.setModels,
        setUseRag: config.setUseRag,
        setRagMode: config.setRagMode,
        setEvaluateRag: config.setEvaluateRag,
    });

    return (
        <div className={`bg-background dark ${className ?? ""}`}>
            <div className="border-b border-border bg-card">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-card-foreground">Evaluation Config</h1>
                            <p className="text-sm text-muted-foreground mt-1">Multiple Models</p>
                        </div>
                        <EvaluationConfigHeader
                            fileInputRef={fileInputRef}
                            onFileChange={onFileChange}
                            onClickImportYaml={onClickImportYaml}
                            onClickExportYaml={onClickExportYaml}
                        />
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-8 space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <EvaluationConfigDefaultSettings
                        availableEvaluationEndpoints={config.availableEvaluationEndpoints}
                        defaultEndpointChoice={config.defaultEndpointChoice}
                        defaultPresetEndpoint={config.defaultPresetEndpoint}
                        defaultCustomEndpoint={config.defaultCustomEndpoint}
                        seed={config.seed}
                        maxConcurrent={config.maxConcurrent}
                        repetitions={config.repetitions}
                        useRag={config.useRag}
                        ragMode={config.ragMode}
                        evaluateRag={config.evaluateRag}
                        setDefaultEndpointChoice={config.setDefaultEndpointChoice}
                        setDefaultPresetEndpoint={config.setDefaultPresetEndpoint}
                        setDefaultCustomEndpoint={config.setDefaultCustomEndpoint}
                        setSeed={config.setSeed}
                        onMaxConcurrentChange={(v) => config.setMaxConcurrent(v)}
                        onRepetitionsChange={(v) => config.setRepetitions(v)}
                        setUseRag={config.setUseRag}
                        setRagMode={config.setRagMode}
                        setEvaluateRag={config.setEvaluateRag}
                    />

                    <EvaluationConfigDatasetSettings
                        datasets={datasets}
                        selectedDatasets={config.selectedDatasets}
                        selectedTestCaseIds={config.selectedTestCaseIds}
                        onDatasetsChange={config.setSelectedDatasets}
                        onTestCasesChange={config.setSelectedTestCaseIds}
                    />
                </div>

                <div className="flex flex-row gap-8">
                    <EvaluationConfigPromptSettings
                        instanceId="a"
                        title={isComparisonPromptOpen ? "Prompt A Settings" : "Prompt Settings"}
                        loadDefaultPrompt
                        prompts={prompts}
                        onPromptConfigChanged={handlePrimaryPromptConfigChanged}
                        onPromptCreated={onPromptCreated}
                        onAddPrompt={() => setIsComparisonPromptOpen(true)}
                        canAddPrompt={!isComparisonPromptOpen}
                    />

                    {isComparisonPromptOpen && (
                        <EvaluationConfigPromptSettings
                            instanceId="b"
                            title="Prompt B Settings"
                            prompts={prompts}
                            selectNewPromptOnMount={true}
                            onPromptConfigChanged={handleComparisonPromptConfigChanged}
                            onPromptCreated={onPromptCreated}
                            onRemove={() => {
                                config.setPromptConfiguration(1, null);
                                setIsComparisonPromptOpen(false);
                            }}
                        />
                    )}
                </div>

                <EvaluationConfigModelsSettings
                    models={config.models}
                    effectiveDefaultEndpoint={config.effectiveDefaultEndpoint}
                    availableEvaluationEndpoints={config.availableEvaluationEndpoints}
                    addModel={config.addModel}
                    updateModel={config.updateModel}
                    duplicateModel={(id) => config.duplicateModel(id, nextLabel)}
                    removeModel={config.removeModel}
                />

                {children}
            </div>
        </div>
    );
}
