"use client";

import { Button } from "@/components/ui/button";
import React, { useEffect, useMemo, useState } from "react";
import {
    EvaluationMetadataReport,
    EvaluationReport,
    EvaluationReportError,
    EvaluationReportStepInfo,
    EvaluationReportSummary,
    PromptInfo,
    TestCaseReport
} from "@/models/dto/ReportData";
import TestCaseReportCard from "@/components/evaluation/test-case-report/test-case-report-card";
import EvaluationReportSummaryCard from "@/components/evaluation/evaluation-report-summary-card";
import MetricsCharts from "@/components/evaluation/metrics-charts";
import { Spinner } from "@/components/ui/spinner";
import { MultiEvaluationRequest } from "@/models/dto/MultiEvaluationRequest";
import TestCaseErrorCard from "@/components/evaluation/test-case-report/test-case-error-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import EvaluationConfig from "@/components/evaluation/config/evaluation-config";
import { Dataset } from "@/models/dto/Dataset";
import { FileText, Play } from "lucide-react";
import TestcaseResultsStacked from "@/components/evaluation/charts/aggregated/testcase-results-stacked";
import { AggregatedChartItem, AggregatedPromptEvaluationResults } from "@/models/evaluation/AggregatedEvaluationResult";
import MetricChart from "@/components/evaluation/charts/aggregated/metric-chart";
import { useColors } from "@/components/evaluation/charts/common/color-context";
import MetricsTable from "@/components/evaluation/charts/aggregated/metrics-table";
import { useToast } from "@/components/ui/toast";
import { toErrorMessage } from "@/lib/http-error";
import { Prompt } from "@/models/dto/Prompt";
import { ChartItem } from "@/models/evaluation/PromptChartData";
import { classificationScopeLabels } from "@/models/dto/PromptVersion";

type ModelReportEnvelope = {
    modelLabel: string;
    report: EvaluationReport;
    runNumber: number;
    promptInfo: PromptInfo | null;
};

type ReportContext = {
    modelLabel: string;
    promptInfo: PromptInfo | null;
    runNumber: number;
}

type TestCaseResult = TestCaseReport & ReportContext;
type ErrorResult = EvaluationReportError & ReportContext;
type StepInfoResult = EvaluationReportStepInfo & ReportContext;

type PromptSummaryMap = Map<string, EvaluationReportSummary>;
type ModelSummaryMap = Map<string, PromptSummaryMap>;
type RunSummaryMap = Map<number, ModelSummaryMap>;

interface EvaluationPageProps {
    datasets: Dataset[];
    prompts: Prompt[];
    onPromptCreated: (createdPrompt: Prompt) => void;
}

export default function EvaluationPage({ datasets, prompts, onPromptCreated }: EvaluationPageProps) {
    const [evaluationRequest, setEvaluationRequest] = useState<MultiEvaluationRequest | null>(null);

    const [metadata, setMetadata] = useState<EvaluationMetadataReport | null>(null);
    const [testCasesByRun, setTestCasesByRun] = useState<Map<number, TestCaseResult[]>>(new Map());
    const [summaryByRun, setSummaryByRun] = useState<RunSummaryMap>(new Map());
    const [currentStepInfos, setCurrentStepInfos] = useState<StepInfoResult[]>([]);
    const [errorsByRun, setErrorsByRun] = useState<Map<number, ErrorResult[]>>(new Map());
    const [isLoading, setIsLoading] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    const [selectedRun, setSelectedRun] = useState<number>(1);
    const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined);
    const [selectedDataset, setSelectedDataset] = useState<string | undefined>(undefined);

    const [isMetricsSummaryOpen, setIsMetricsSummaryOpen] = useState<boolean>(false);

    const { colors, setColors } = useColors()
    const { showToast, showError } = useToast()

    function getPromptKey(promptInfo: PromptInfo | null): string {
        return promptInfo?.promptLabel ?? "Unknown";
    }

    const processNdjsonStream = async (res: Response) => {
        if (!res.ok || !res.body) {
            console.error("Request failed:", res.status, res.statusText);
            setIsLoading(false);
            return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");

            for (let i = 0; i < lines.length - 1; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                try {
                    const env = JSON.parse(line) as ModelReportEnvelope;
                    const { modelLabel, report, runNumber, promptInfo } = env;
                    const promptKey = getPromptKey(promptInfo);

                    if (report.type === "metadata") {
                        setMetadata(report);
                    } else if (report.type === "testCase") {
                        setTestCasesByRun((prev) => {
                            const next = new Map(prev);
                            const runCases = next.get(runNumber) || [];
                            next.set(runNumber, [...runCases, { ...(report as TestCaseReport), modelLabel, promptInfo, runNumber }]);
                            return next;
                        });
                    } else if (report.type === "summary") {
                        setSummaryByRun((prev) => {
                            const next = new Map(prev);
                            const runSummaries = new Map(next.get(runNumber) || new Map());
                            const modelSummaries = new Map(runSummaries.get(modelLabel) || new Map());
                            modelSummaries.set(promptKey, report as EvaluationReportSummary);
                            runSummaries.set(modelLabel, modelSummaries);
                            next.set(runNumber, runSummaries);
                            return next;
                        });
                    } else if (report.type === "stepInfo") {
                        setCurrentStepInfos((prev) => [...prev, { ...(report as EvaluationReportStepInfo), modelLabel, promptInfo, runNumber }]);
                    } else if (report.type === "error") {
                        setErrorsByRun((prev) => {
                            const next = new Map(prev);
                            const runErrors = next.get(runNumber) || [];
                            next.set(runNumber, [...runErrors, { ...(report as EvaluationReportError), modelLabel, promptInfo, runNumber }]);
                            return next;
                        });
                    } else {
                        console.warn("Unknown report type:", report);
                    }
                } catch (e) {
                    console.error("Failed to parse NDJSON line:", e);
                }
            }

            buffer = lines[lines.length - 1];
        }

        setIsLoading(false);
        setIsFinished(true);
    };

    const resetState = () => {
        setMetadata(null);
        setTestCasesByRun(new Map());
        setSummaryByRun(new Map());
        setCurrentStepInfos([]);
        setErrorsByRun(new Map());
        setIsLoading(true);
        setIsFinished(false);
        setSelectedRun(1);
    };

    const handleEvaluationStart = async () => {
        if (!evaluationRequest) return;
        resetState();
        console.log("Sending request", evaluationRequest);
        const res = await fetch(`/api/gdpr/evaluation/stream`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(evaluationRequest)
        });
        await processNdjsonStream(res);
    };

    useEffect(() => {
        setCurrentStepInfos((infos) =>
            infos.filter((info) => {
                const runTestCases = testCasesByRun.get(info.runNumber) || [];
                const runErrors = errorsByRun.get(info.runNumber) || [];
                return !runTestCases.some(
                    (testCase) =>
                        testCase.modelLabel === info.modelLabel &&
                        testCase.testCaseId === info.currentTestCaseId
                ) && !runErrors.some(
                    (error) =>
                        error.modelLabel === info.modelLabel &&
                        error.testCaseId === info.currentTestCaseId
                );
            })
        );
    }, [testCasesByRun, errorsByRun]);

    const testCases = testCasesByRun.get(selectedRun) || [];
    const summary = summaryByRun.get(selectedRun) ?? new Map<string, PromptSummaryMap>();
    const errors = errorsByRun.get(selectedRun) || [];


    const involvedDatasets = useMemo(() => {
        const ids = new Set<number>();
        for (const tc of testCases) if (tc.datasetId != null) ids.add(tc.datasetId);
        for (const e of errors) if (e.datasetId != null) ids.add(e.datasetId);

        const nameById = new Map<number, string>();
        datasets.forEach((d) => nameById.set(d.id, d.name));
        metadata?.datasets.forEach((d) => nameById.set(d.id, d.name));

        const order = metadata?.datasets.map((d) => d.id) ?? [];
        return [...ids]
            .sort((a, b) => {
                const ia = order.indexOf(a);
                const ib = order.indexOf(b);
                if (ia !== -1 && ib !== -1) return ia - ib;
                if (ia !== -1) return -1;
                if (ib !== -1) return 1;
                return a - b;
            })
            .map((id) => ({ id, name: nameById.get(id) ?? `Dataset ${id}` }));
    }, [testCases, errors, metadata, datasets]);

    const aggregateStats = useMemo<AggregatedPromptEvaluationResults | null>(() => {
        if (summaryByRun.size === 0 || !metadata?.modelLabels) return null;

        const stats: AggregatedPromptEvaluationResults = {};

        for (const modelLabel of metadata.modelLabels) {
            const promptLabels = new Set<string>();

            for (const runSummaries of summaryByRun.values()) {
                for (const promptLabel of runSummaries.get(modelLabel)?.keys() ?? []) {
                    promptLabels.add(promptLabel);
                }
            }

            for (const promptLabel of promptLabels) {
                const precisions: number[] = [];
                const recalls: number[] = [];
                const f1Scores: number[] = [];
                const accuracies: number[] = [];
                const passedCounts: number[] = [];
                const failedCounts: number[] = [];
                const errorCounts: number[] = [];
                const amountOfRetries: number[] = [];
                const truePositives: number[] = [];
                const falsePositives: number[] = [];
                const falseNegatives: number[] = [];
                const trueNegatives: number[] = [];
                const contextUtilizations: number[] = [];
                const faithfulnesses: number[] = [];
                const perTypeValues = new Map<string, {
                    displayName: string;
                    precisions: number[];
                    recalls: number[];
                    f1Scores: number[];
                    tps: number[];
                    fps: number[];
                    fns: number[];
                    tns: number[];
                }>();

                for (const runSummaries of summaryByRun.values()) {
                    const modelSummary = runSummaries.get(modelLabel)?.get(promptLabel);

                    if (!modelSummary) {
                        continue;
                    }

                    precisions.push(modelSummary.precision);
                    recalls.push(modelSummary.recall);
                    f1Scores.push(modelSummary.f1Score);
                    accuracies.push(modelSummary.accuracy);
                    passedCounts.push(modelSummary.passed);
                    failedCounts.push(modelSummary.failed);
                    errorCounts.push(modelSummary.error);
                    if (modelSummary.amountOfRetries !== null && modelSummary.amountOfRetries !== undefined) {
                        amountOfRetries.push(modelSummary.amountOfRetries);
                    }
                    truePositives.push(modelSummary.totalTruePositives);
                    falsePositives.push(modelSummary.totalFalsePositives);
                    falseNegatives.push(modelSummary.totalFalseNegatives);
                    trueNegatives.push(modelSummary.totalTrueNegatives);
                    if (modelSummary.ragMetrics?.contextUtilizationMean !== null && modelSummary.ragMetrics?.contextUtilizationMean !== undefined) {
                        contextUtilizations.push(modelSummary.ragMetrics.contextUtilizationMean);
                    }
                    if (modelSummary.ragMetrics?.faithfulnessMean !== null && modelSummary.ragMetrics?.faithfulnessMean !== undefined) {
                        faithfulnesses.push(modelSummary.ragMetrics.faithfulnessMean);
                    }
                    if (modelSummary.perElementType) {
                        for (const [key, typeSummary] of Object.entries(modelSummary.perElementType)) {
                            let bucket = perTypeValues.get(key);
                            if (!bucket) {
                                bucket = { displayName: typeSummary.displayName, precisions: [], recalls: [], f1Scores: [], tps: [], fps: [], fns: [], tns: [] };
                                perTypeValues.set(key, bucket);
                            }
                            bucket.precisions.push(typeSummary.precision);
                            bucket.recalls.push(typeSummary.recall);
                            bucket.f1Scores.push(typeSummary.f1Score);
                            bucket.tps.push(typeSummary.truePositives);
                            bucket.fps.push(typeSummary.falsePositives);
                            bucket.fns.push(typeSummary.falseNegatives);
                            bucket.tns.push(typeSummary.trueNegatives);
                        }
                    }
                }

                if (precisions.length > 0) {
                    const avgPrecision = precisions.reduce((a, b) => a + b, 0) / precisions.length;
                    const avgRecall = recalls.reduce((a, b) => a + b, 0) / recalls.length;
                    const avgF1Score = f1Scores.reduce((a, b) => a + b, 0) / f1Scores.length;
                    const avgAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;

                    const stdPrecision = Math.sqrt(precisions.reduce((sum, val) => sum + Math.pow(val - avgPrecision, 2), 0) / precisions.length);
                    const stdRecall = Math.sqrt(recalls.reduce((sum, val) => sum + Math.pow(val - avgRecall, 2), 0) / recalls.length);
                    const stdF1Score = Math.sqrt(f1Scores.reduce((sum, val) => sum + Math.pow(val - avgF1Score, 2), 0) / f1Scores.length);
                    const stdAccuracy = Math.sqrt(accuracies.reduce((sum, val) => sum + Math.pow(val - avgAccuracy, 2), 0) / accuracies.length);

                    const avgPassed = passedCounts.reduce((a, b) => a + b, 0) / passedCounts.length;
                    const stdPassed = Math.sqrt(passedCounts.reduce((sum, val) => sum + Math.pow(val - avgPassed, 2), 0) / passedCounts.length);
                    const avgFailed = failedCounts.reduce((a, b) => a + b, 0) / failedCounts.length;
                    const stdFailed = Math.sqrt(failedCounts.reduce((sum, val) => sum + Math.pow(val - avgFailed, 2), 0) / failedCounts.length);
                    const avgErrors = errorCounts.reduce((a, b) => a + b, 0) / errorCounts.length;
                    const stdErrors = Math.sqrt(errorCounts.reduce((sum, val) => sum + Math.pow(val - avgErrors, 2), 0) / errorCounts.length);

                    const avgAmountOfRetries = amountOfRetries.length > 0 ? amountOfRetries.reduce((a, b) => a + b, 0) / amountOfRetries.length : undefined;
                    const stdAmountOfRetries = amountOfRetries.length > 0 ? Math.sqrt(amountOfRetries.reduce((sum, val) => sum + Math.pow(val - (avgAmountOfRetries || 0), 2), 0) / amountOfRetries.length) : undefined;

                    const avgContextUtilization = contextUtilizations.length > 0 ? contextUtilizations.reduce((a, b) => a + b, 0) / contextUtilizations.length : undefined;
                    const stdContextUtilization = contextUtilizations.length > 0 ? Math.sqrt(contextUtilizations.reduce((sum, val) => sum + Math.pow(val - (avgContextUtilization || 0), 2), 0) / contextUtilizations.length) : undefined;
                    const avgFaithfulness = faithfulnesses.length > 0 ? faithfulnesses.reduce((a, b) => a + b, 0) / faithfulnesses.length : undefined;
                    const stdFaithfulness = faithfulnesses.length > 0 ? Math.sqrt(faithfulnesses.reduce((sum, val) => sum + Math.pow(val - (avgFaithfulness || 0), 2), 0) / faithfulnesses.length) : undefined;
                    const ragRunsCounted = Math.max(contextUtilizations.length, faithfulnesses.length);

                    const avgTruePositives = truePositives.reduce((a, b) => a + b, 0) / truePositives.length;
                    const avgFalsePositives = falsePositives.reduce((a, b) => a + b, 0) / falsePositives.length;
                    const avgFalseNegatives = falseNegatives.reduce((a, b) => a + b, 0) / falseNegatives.length;
                    const avgTrueNegatives = trueNegatives.reduce((a, b) => a + b, 0) / trueNegatives.length;
                    const stdTruePositives = Math.sqrt(truePositives.reduce((sum, val) => sum + Math.pow(val - avgTruePositives, 2), 0) / truePositives.length);
                    const stdFalsePositives = Math.sqrt(falsePositives.reduce((sum, val) => sum + Math.pow(val - avgFalsePositives, 2), 0) / falsePositives.length);
                    const stdFalseNegatives = Math.sqrt(falseNegatives.reduce((sum, val) => sum + Math.pow(val - avgFalseNegatives, 2), 0) / falseNegatives.length);
                    const stdTrueNegatives = Math.sqrt(trueNegatives.reduce((sum, val) => sum + Math.pow(val - avgTrueNegatives, 2), 0) / trueNegatives.length);

                    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
                    const std = (xs: number[]) => {
                        const m = mean(xs);
                        return Math.sqrt(xs.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / xs.length);
                    };
                    const perElementType = perTypeValues.size > 0
                        ? Object.fromEntries([...perTypeValues.entries()].map(([key, v]) => [key, {
                            displayName: v.displayName,
                            avgPrecision: mean(v.precisions),
                            stdPrecision: std(v.precisions),
                            avgRecall: mean(v.recalls),
                            stdRecall: std(v.recalls),
                            avgF1Score: mean(v.f1Scores),
                            stdF1Score: std(v.f1Scores),
                            avgTruePositives: mean(v.tps),
                            avgFalsePositives: mean(v.fps),
                            avgFalseNegatives: mean(v.fns),
                            avgTrueNegatives: mean(v.tns),
                            runsCounted: v.precisions.length
                        }]))
                        : undefined;

                    stats[modelLabel] ??= {};
                    stats[modelLabel][promptLabel] = {
                        avgPrecision,
                        stdPrecision,
                        avgRecall,
                        stdRecall,
                        avgF1Score,
                        stdF1Score,
                        avgAccuracy,
                        stdAccuracy,
                        avgPassed,
                        stdPassed,
                        avgFailed,
                        stdFailed,
                        avgErrors,
                        stdErrors,
                        avgAmountOfRetries,
                        stdAmountOfRetries,
                        avgContextUtilization,
                        stdContextUtilization,
                        avgTruePositives,
                        stdTruePositives,
                        avgFalsePositives,
                        stdFalsePositives,
                        avgFalseNegatives,
                        stdFalseNegatives,
                        avgTrueNegatives,
                        stdTrueNegatives,
                        avgFaithfulness,
                        stdFaithfulness,
                        ragRunsCounted,
                        perElementType
                    };
                }
            }
        }

        return stats;
    }, [summaryByRun, metadata]);

    const handleDownloadMarkdownReport = () => {
        const hasSummaries = summaryByRun.size > 0;
        if (testCasesByRun.size === 0 && !hasSummaries) {
            showToast({ title: "No results yet", description: "Run an evaluation before downloading a report.", variant: "info" });
            return;
        }
        const sections: string[] = [];

        if (metadata) {
            sections.push("# Evaluation Report");
            sections.push(metadata.markdown);
        }

        if (aggregateStats && summaryByRun.size >= 1) {
            sections.push("# Aggregate Statistics Across All Runs");
            for (const [modelLabel, promptMetrics] of Object.entries(aggregateStats)) {
                sections.push(`## Model: ${modelLabel}`);
                for (const [promptLabel, metrics] of Object.entries(promptMetrics)) {
                    sections.push(`### Prompt: ${promptLabel}`);
                    sections.push(`- Precision: ${metrics.avgPrecision.toFixed(3)} ± ${metrics.stdPrecision.toFixed(3)}`);
                    sections.push(`- Recall: ${metrics.avgRecall.toFixed(3)} ± ${metrics.stdRecall.toFixed(3)}`);
                    sections.push(`- F1-Score: ${metrics.avgF1Score.toFixed(3)} ± ${metrics.stdF1Score.toFixed(3)}`);
                    sections.push(`- Accuracy: ${metrics.avgAccuracy.toFixed(3)} ± ${metrics.stdAccuracy.toFixed(3)}`);
                    sections.push(`- True Positives: ${metrics.avgTruePositives.toFixed(3)} ± ${metrics.stdTruePositives.toFixed(3)}`);
                    sections.push(`- False Positives: ${metrics.avgFalsePositives.toFixed(3)} ± ${metrics.stdFalsePositives.toFixed(3)}`);
                    sections.push(`- False Negatives: ${metrics.avgFalseNegatives.toFixed(3)} ± ${metrics.stdFalseNegatives.toFixed(3)}`);
                    sections.push(`- True Negatives: ${metrics.avgTrueNegatives.toFixed(3)} ± ${metrics.stdTrueNegatives.toFixed(3)}`);
                    sections.push(`- Passed: ${metrics.avgPassed.toFixed(3)} ± ${metrics.stdPassed.toFixed(3)} / ${metadata?.totalTestCases}`);
                    sections.push(`- Failed: ${metrics.avgFailed.toFixed(3)} ± ${metrics.stdFailed.toFixed(3)} / ${metadata?.totalTestCases}`);
                    sections.push(`- Errors: ${metrics.avgErrors.toFixed(3)} ± ${metrics.stdErrors.toFixed(3)} / ${metadata?.totalTestCases}`);
                    if (metrics.avgAmountOfRetries !== undefined && metrics.stdAmountOfRetries !== undefined) {
                        sections.push(`- Amount of Retries: ${metrics.avgAmountOfRetries.toFixed(3)} ± ${metrics.stdAmountOfRetries.toFixed(3)}`);
                    }
                    if (metrics.ragRunsCounted > 0) {
                        sections.push(`\n### RAG Metrics (averaged across ${metrics.ragRunsCounted} run(s))`);
                        if (metrics.avgContextUtilization !== undefined && metrics.stdContextUtilization !== undefined) {
                            sections.push(`- Context Utilization: ${metrics.avgContextUtilization.toFixed(3)} ± ${metrics.stdContextUtilization.toFixed(3)}`);
                        }
                        if (metrics.avgFaithfulness !== undefined && metrics.stdFaithfulness !== undefined) {
                            sections.push(`- Faithfulness: ${metrics.avgFaithfulness.toFixed(3)} ± ${metrics.stdFaithfulness.toFixed(3)}`);
                        }
                    }
                    if (metrics.perElementType && Object.keys(metrics.perElementType).length > 0) {
                        const rows = Object.values(metrics.perElementType).map((t) =>
                            `| ${t.displayName} | ${t.avgPrecision.toFixed(3)} ± ${t.stdPrecision.toFixed(3)} | ${t.avgRecall.toFixed(3)} ± ${t.stdRecall.toFixed(3)} | ${t.avgF1Score.toFixed(3)} ± ${t.stdF1Score.toFixed(3)} | ${t.avgTruePositives.toFixed(1)} | ${t.avgFalsePositives.toFixed(1)} | ${t.avgFalseNegatives.toFixed(1)} | ${t.avgTrueNegatives.toFixed(1)} |`
                        );
                        sections.push([
                            `### Metrics by Element Type (averaged across runs)`,
                            `| Type | Precision | Recall | F1-Score | TP | FP | FN | TN |`,
                            `|------|-----------|--------|----------|----|----|----|----|`,
                            ...rows
                        ].join("\n"));
                    }
                }
            }
        }

        for (const [runNumber, runSummaries] of summaryByRun.entries()) {
            sections.push(`# Run ${runNumber}`);

            const runTestCases = testCasesByRun.get(runNumber) ?? [];
            const runErrors = errorsByRun.get(runNumber) ?? [];

            const modelLabels = new Set([
                ...runSummaries.keys(),
                ...runTestCases.map((report) => report.modelLabel),
                ...runErrors.map((error) => error.modelLabel),
            ]);

            for (const modelLabel of modelLabels) {
                sections.push(`## Model: ${modelLabel}`);

                const promptSummaries = runSummaries.get(modelLabel) ?? new Map();

                for (const [promptLabel, promptSummary] of promptSummaries) {
                    sections.push(`### Prompt: ${promptLabel}`, "#### Summary", promptSummary.markdown);
                }

                const reportsByPrompt = groupBy(
                    runTestCases.filter(
                        (report) => report.modelLabel === modelLabel
                    ),
                    (report) => getPromptKey(report.promptInfo)
                );

                for (const [promptLabel, reports] of Object.entries(reportsByPrompt)) {
                    sections.push(`### Prompt: ${promptLabel}`, "#### Test Cases");

                    for (const report of reports.sort((first, second) =>
                        first.testCaseId - second.testCaseId
                    )) {
                        sections.push(report.markdown);
                    }
                }

                const errorsByPrompt = groupBy(
                    runErrors.filter(
                        (error) => error.modelLabel === modelLabel
                    ),
                    (error) => getPromptKey(error.promptInfo)
                );

                for (const [promptLabel, promptErrors] of Object.entries(errorsByPrompt)) {
                    sections.push(`### Prompt: ${promptLabel}`, "#### Errors");

                    for (const error of promptErrors) {
                        sections.push(error.markdown);
                    }
                }
            }
        }

        const blob = new Blob([sections.join("\n\n")], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "evaluation_report_multi.md";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownloadJsonReport = () => {
        const hasSummaries = summaryByRun.size > 0;
        if (testCasesByRun.size === 0 && !hasSummaries) {
            showToast({ title: "No results yet", description: "Run an evaluation before downloading a report.", variant: "info" });
            return;
        }

        // Convert Maps to serializable format
        const testCasesByRunObj: Record<number, any[]> = {};
        for (const [runNum, cases] of testCasesByRun.entries()) {
            testCasesByRunObj[runNum] = cases;
        }

        const summariesByRunObj: Record<number, any[]> = {};
        for (const [runNum, runSummaries] of summaryByRun.entries()) {
            summariesByRunObj[runNum] = Array.from(runSummaries.entries()).map(
                ([modelLabel, promptSummaries]) => ({
                    modelLabel,
                    prompts: Array.from(promptSummaries.entries()).map(
                        ([promptLabel, summary]) => ({
                            promptLabel,
                            summary
                        })
                    )
                }));
        }

        const errorsByRunObj: Record<number, any[]> = {};
        for (const [runNum, errs] of errorsByRun.entries()) {
            errorsByRunObj[runNum] = errs;
        }

        const report = {
            metadata,
            testCasesByRun: testCasesByRunObj,
            summariesByRun: summariesByRunObj,
            errorsByRun: errorsByRunObj,
            aggregateStats: aggregateStats || null,
            colors: colors
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "evaluation_report_multi.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    const handleUploadJsonReport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== "string") throw new Error("File content is not a string");

                const parsed = JSON.parse(text);

                setMetadata(parsed.metadata || null);

                const tcMap = new Map<number, TestCaseResult[]>();
                for (const [runNum, cases] of Object.entries(parsed.testCasesByRun ?? {})) {
                    tcMap.set(Number(runNum), cases as TestCaseResult[]);
                }
                setTestCasesByRun(tcMap);

                const summaryMap: RunSummaryMap = new Map();
                for (const [runNum, rawSummaries] of Object.entries(parsed.summariesByRun ?? {})) {
                    const runSummaryMap: ModelSummaryMap = new Map();

                    for (const entry of rawSummaries as any[]) {
                        // New format with prompts array: { modelLabel, prompts: [{ promptLabel, summary }] }
                        if (Array.isArray(entry.prompts)) {
                            runSummaryMap.set(
                                entry.modelLabel,
                                new Map(
                                    entry.prompts.map(({ promptLabel, summary }: { promptLabel: string; summary: EvaluationReportSummary }) => [promptLabel, summary])
                                )
                            );
                            continue;
                        }

                        // Old format: { label, summary }
                        runSummaryMap.set(
                            entry.label,
                            new Map([["Unknown", entry.summary as EvaluationReportSummary]])
                        );
                    }
                    summaryMap.set(Number(runNum), runSummaryMap);
                }
                setSummaryByRun(summaryMap);

                const errorsMap = new Map<number, ErrorResult[]>();
                for (const [runNum, errs] of Object.entries(parsed.errorsByRun ?? {})) {
                    errorsMap.set(Number(runNum), errs as ErrorResult[]);
                }
                setErrorsByRun(errorsMap);

                if (parsed.colors) {
                    setColors(parsed.colors);
                }
            } catch (err) {
                console.error("Failed to load report:", err);
                showError("Failed to load report", toErrorMessage(err));
            }
        };
        reader.readAsText(file);
        setIsFinished(true);
    };

    const onUploadJsonReportClick = () => {
        document.getElementById("upload-json-report")?.click()
    };

    const summariesByModel = useMemo(
        () => Array.from(summary.entries()).map(([label, s]) => ({ label, summary: s })),
        [summary]
    );

    const aggregatedChartItems = useMemo(
        () => aggregateStats ? flattenAggregatedStats(aggregateStats) : [],
        [aggregateStats]
    );

    return (
        <div className="w-full">
            <EvaluationConfig onMultiConfigChanged={setEvaluationRequest} datasets={datasets} prompts={prompts} onPromptCreated={onPromptCreated} className="mb-6">
                <div className="flex flex-row justify-between items-start flex-wrap mb-4 gap-4">
                    <div className="flex flex-row gap-4 flex-wrap">
                        <Button variant="secondary" disabled={!isFinished} onClick={handleDownloadMarkdownReport}>
                            <FileText className="h-4 w-4" />
                            Download Markdown Report
                        </Button>
                        <Button variant="secondary" disabled={!isFinished} onClick={handleDownloadJsonReport}>
                            <FileText className="h-4 w-4" />
                            Download JSON Report
                        </Button>
                        <input id="upload-json-report" type="file" accept=".json" className="hidden" onChange={handleUploadJsonReport} />
                        <label htmlFor="upload-json-report">
                            <Button variant="secondary" onClick={onUploadJsonReportClick} disabled={isLoading} className="hover:cursor-pointer">
                                <span className="flex flex-row items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Upload JSON Report
                                </span>
                            </Button>
                        </label>
                    </div>
                    <Button variant="default" disabled={isLoading || !evaluationRequest}
                        onClick={handleEvaluationStart} className="h-auto">
                        <>
                            {!isLoading && <Play className="h-4 w-4" />}
                            {!isLoading && "Start Evaluation"}
                            {isLoading && (
                                <div className="flex flex-row space-x-4">
                                    <Spinner className="h-4 w-4 text-foreground" />
                                    {currentStepInfos.length > 0 && (
                                        <div className="flex flex-row items-center space-x-4">
                                            <div className="flex flex-col justify-start overflow-y-auto">
                                                {currentStepInfos.map((info, idx) => (
                                                    <span key={`${info.modelLabel}-${info.runNumber}-stepinfo-${idx}`}
                                                        className="whitespace-nowrap">
                                                        [Run {info.runNumber}] [{info.modelLabel}] Evaluating {info.currentTestCaseName}...
                                                    </span>
                                                ))}
                                            </div>
                                            <p>({Array.from(testCasesByRun.values()).reduce((sum, cases) => sum + cases.length, 0) + Array.from(errorsByRun.values()).reduce((sum, errs) => sum + errs.length, 0)} / {currentStepInfos[0]?.totalTestCases * (evaluationRequest?.models.length || 1) * (metadata?.totalRepetitions || 1)})</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    </Button>
                </div>
            </EvaluationConfig>

            <section className="px-6 container mx-auto">
                <h2 className="text-2xl font-semibold mb-2">Complete Result Overview</h2>
                {summariesByModel.length > 0 || metadata ? <>
                    {/* Metadata */}
                    <Card className="mb-6">
                        <CardHeader>
                            <h3 className="text-xl font-semibold">Evaluation Metadata</h3>
                        </CardHeader>
                        <CardContent>
                            <>{metadata && <CardDescription>
                                <table>
                                    <tbody>
                                        <tr>
                                            <td className="align-top">Models:</td>
                                            <td className="pl-4 pb-2">
                                                <div className="flex flex-wrap gap-2">
                                                    {metadata.modelLabels.map((label, index) => (
                                                        <div
                                                            key={label}
                                                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-card border-2 text-secondary-foreground text-sm`}
                                                            style={{
                                                                borderColor: colors[label]
                                                            }}
                                                        >
                                                            <span className="font-medium">{label}</span>
                                                            <span className="text-muted-foreground">•</span>
                                                            <span>temp: {metadata.modelTemperatures[index] ?? "default"}</span>
                                                            <span className="text-muted-foreground">•</span>
                                                            <span>topP: {metadata.modelTopPs?.[index] ?? "default"}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="align-top">Prompts:</td>
                                            <td className="pl-4 pb-2">
                                                <div className="flex flex-wrap gap-2">
                                                    {(metadata.prompts ?? [])
                                                        .filter(
                                                            (prompt): prompt is PromptInfo & { promptLabel: string } =>
                                                                Boolean(prompt.promptLabel)
                                                        )
                                                        .map((prompt) => (
                                                            <div
                                                                key={`${prompt.promptLabel}-${prompt.versionNumber ?? "unknown"}`}
                                                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-card border text-secondary-foreground text-sm"
                                                            >
                                                                <span className="font-medium">{prompt.promptLabel}</span>
                                                                <span className="text-muted-foreground">•</span>
                                                                {prompt.versionNumber === null ? (
                                                                    <span>Unsaved Prompt</span>
                                                                ) : (
                                                                    <>
                                                                        {prompt.promptName &&
                                                                            !prompt.promptLabel
                                                                                .toLowerCase()
                                                                                .includes(prompt.promptName.toLowerCase()) && (
                                                                                <>
                                                                                    <span>{prompt.promptName}</span>
                                                                                    <span className="text-muted-foreground">•</span>
                                                                                </>
                                                                            )}

                                                                        <span>
                                                                            Version {prompt.versionNumber}
                                                                            {prompt.isOverride && " (override)"}
                                                                        </span>
                                                                    </>
                                                                )}
                                                                <span className="text-muted-foreground">•</span>
                                                                <span>
                                                                    Scope: {
                                                                        prompt.classificationScope
                                                                            ? classificationScopeLabels[prompt.classificationScope]
                                                                            : "Unknown"
                                                                    }
                                                                </span>
                                                            </div>
                                                        ))}
                                                </div>
                                            </td>
                                        </tr>
                                        <tr><td>Datasets:</td><td className="pl-4">{metadata.datasets.map(d => d.name).join(", ")}</td></tr>
                                        <tr><td>Total Test Cases:</td><td className="pl-4">{metadata.totalTestCases}</td></tr>
                                        <tr><td>Default Evaluation Endpoint:</td><td className="pl-4">{metadata.defaultEvaluationEndpoint}</td></tr>
                                        {metadata.totalRepetitions && metadata.totalRepetitions >= 1 && <tr><td>Total Runs:</td><td className="pl-4">{metadata.totalRepetitions}</td></tr>}
                                        <tr><td>Seed:</td><td className="pl-4">{metadata.seed}</td></tr>
                                        <tr><td>Timestamp:</td><td className="pl-4">{new Date(metadata.timestamp).toLocaleString()}</td></tr>
                                    </tbody>
                                </table>
                            </CardDescription>}</>
                        </CardContent>
                    </Card>
                    {aggregateStats && metadata && metadata.totalRepetitions && <h2 className="text-2xl font-semibold mb-2">Aggregated Results Across  {metadata.totalRepetitions} Runs</h2>}
                    <div className="space-y-6 mb-8">
                        {/* Aggregate Statistics across all runs */}
                        {aggregateStats && metadata && metadata.totalRepetitions && metadata.totalRepetitions >= 1 && (<>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <MetricChart
                                    title="Precision"
                                    description="Precision (mean ± SD)"
                                    metricKey="avgPrecision"
                                    stdKey="stdPrecision"
                                    items={aggregatedChartItems}
                                />
                                <MetricChart
                                    title="Recall"
                                    description="Recall (mean ± SD)"
                                    metricKey="avgRecall"
                                    stdKey="stdRecall"
                                    items={aggregatedChartItems}
                                />
                                <MetricChart
                                    title="F1-Score"
                                    description="F1-Score (mean ± SD)"
                                    metricKey="avgF1Score"
                                    stdKey="stdF1Score"
                                    items={aggregatedChartItems}
                                />
                                <MetricChart
                                    title="Accuracy"
                                    description="Accuracy (mean ± SD)"
                                    metricKey="avgAccuracy"
                                    stdKey="stdAccuracy"
                                    items={aggregatedChartItems}
                                />
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <TestcaseResultsStacked items={aggregatedChartItems} repetisions={metadata.totalRepetitions} />
                                <MetricChart
                                    title="Retries"
                                    description="Number of retries accross 25 test cases (mean ± SD)"
                                    metricKey="avgAmountOfRetries"
                                    stdKey="stdAmountOfRetries"
                                    items={aggregatedChartItems}
                                    xAxisMaxOffset={2}
                                />
                            </div>
                            <MetricsTable aggregatedEvaluationResults={aggregateStats} />
                            {aggregatedChartItems.some((item) => item.metrics.ragRunsCounted > 0) && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <MetricChart
                                        title="Context Utilization"
                                        description="Context Utilization (mean ± SD)"
                                        metricKey="avgContextUtilization"
                                        stdKey="stdContextUtilization"
                                        items={aggregatedChartItems}
                                    />
                                    <MetricChart
                                        title="Faithfulness"
                                        description="Faithfulness (mean ± SD)"
                                        metricKey="avgFaithfulness"
                                        stdKey="stdFaithfulness"
                                        items={aggregatedChartItems}
                                    />
                                </div>
                            )}
                        </>)}
                    </div>
                </> : <Card className="p-4 mb-4">
                    <p className="text-muted-foreground">No results yet. Start an evaluation to see results here.</p>
                </Card>}

                {metadata && metadata.totalRepetitions && metadata.totalRepetitions >= 1 && (
                    <>
                        <h2 className="text-2xl font-semibold mb-2">Results by Run</h2>
                        <Tabs value={selectedRun.toString()} onValueChange={(v) => setSelectedRun(parseInt(v))} className="w-full mb-6">
                            <TabsList className="w-full h-12 sticky top-0 z-20 mb-4">
                                {Array.from({ length: metadata.totalRepetitions }, (_, i) => i + 1).map((runNum) => (
                                    <TabsTrigger value={runNum.toString()} key={`run-${runNum}-trigger`}>
                                        Run {runNum}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {Array.from({ length: metadata.totalRepetitions }, (_, i) => i + 1).map((runNum) => (
                                <TabsContent value={runNum.toString()} key={`run-${runNum}-content`}>
                                    {!summaryByRun.get(runNum) && !testCasesByRun.get(runNum) && !errorsByRun.get(runNum) && (
                                        <Card className="p-4 text-muted-foreground mb-4">
                                            No results yet for Run {runNum}. Start an evaluation to see results here.
                                        </Card>
                                    )}

                                    {summaryByRun.get(runNum) && (
                                        <div className="space-y-6 mb-6">
                                            <MetricsCharts
                                                scope="all-models"
                                                reportSummaries={flattenPromptSummaries(summaryByRun.get(runNum) ?? new Map())} />
                                        </div>
                                    )}

                                    <h2 className="text-2xl font-semibold mb-2">Results by
                                        Model{metadata && metadata.totalRepetitions && metadata.totalRepetitions > 1 ? ` (Run ${selectedRun})` : ""}</h2>
                                    <Tabs className="w-full" value={selectedModel || metadata?.modelLabels?.[0]} onValueChange={setSelectedModel}>
                                        <TabsList className="w-full h-12 sticky top-12 z-10 mb-4">
                                            {metadata?.modelLabels.map?.((label) => (
                                                <TabsTrigger value={label} key={`${label}-trigger`}>
                                                    {label}
                                                </TabsTrigger>
                                            ))}
                                        </TabsList>

                                        {metadata?.modelLabels.map?.((label) => {
                                            const modelSummary = summary.get(label);
                                            const modelChartItems = modelSummary
                                                ? Array.from(modelSummary.entries()).map(
                                                    ([promptLabel, promptSummary]) => ({
                                                        modelLabel: label,
                                                        promptLabel,
                                                        summary: promptSummary,
                                                    })
                                                )
                                                : [];

                                            return (
                                                <TabsContent value={label} key={`${label}-content`}>
                                                    {!modelSummary && !testCases.some((tc) => tc.modelLabel === label) && !errors.some((e) => e.modelLabel === label) && (
                                                        <Card className="p-4 text-muted-foreground mb-4">
                                                            No results yet for model <strong>{label}</strong>. Start an
                                                            evaluation to see results here.
                                                        </Card>
                                                    )}

                                                    {modelSummary && (
                                                        <div className="space-y-6 mb-6">
                                                            <EvaluationReportSummaryCard
                                                                reportSummaries={Array.from(modelSummary.entries()).map(
                                                                    ([promptLabel, summary]) => ({ promptLabel, summary })
                                                                )}
                                                            />
                                                            <MetricsCharts
                                                                scope="single-model"
                                                                reportSummaries={modelChartItems} />
                                                        </div>
                                                    )}

                                                    <h2 className="text-2xl font-semibold mb-2">Test Case Results for {label}</h2>
                                                    <Tabs className="w-full" value={selectedDataset || (involvedDatasets[0] ? `dataset-${involvedDatasets[0].id}` : undefined)}
                                                        onValueChange={setSelectedDataset}>
                                                        <TabsList className="w-full h-12 sticky top-24 z-30 mb-4">
                                                            {involvedDatasets.map((dataset) => (
                                                                <TabsTrigger value={`dataset-${dataset.id}`}
                                                                    key={`dataset-${dataset.id}-trigger`}>
                                                                    {dataset.name}
                                                                </TabsTrigger>
                                                            ))}
                                                        </TabsList>

                                                        {involvedDatasets.map((dataset) => (
                                                            <TabsContent value={`dataset-${dataset.id}`}
                                                                key={`dataset-${dataset.id}-content`}>
                                                                <div className="flex flex-col space-y-4 pb-6">
                                                                    {Array.from(
                                                                        testCases
                                                                            .filter(
                                                                                (testCase) =>
                                                                                    testCase.modelLabel === label &&
                                                                                    testCase.datasetId === dataset.id
                                                                            )
                                                                            .reduce((groups, report) => {
                                                                                const reports = groups.get(report.testCaseId) ?? [];

                                                                                groups.set(report.testCaseId, [
                                                                                    ...reports,
                                                                                    {
                                                                                        promptLabel: report.promptInfo?.promptLabel ?? "Unknown",
                                                                                        report,
                                                                                    },
                                                                                ]);

                                                                                return groups;
                                                                            }, new Map<number, Array<{
                                                                                promptLabel: string;
                                                                                report: TestCaseResult;
                                                                            }>>())
                                                                            .entries()
                                                                    )
                                                                        .sort(([firstTestCaseId], [secondTestCaseId]) =>
                                                                            firstTestCaseId - secondTestCaseId
                                                                        )
                                                                        .map(([testCaseId, reports]) => (
                                                                            <div key={`${label}-${dataset.id}-${testCaseId}`}>
                                                                                <TestCaseReportCard reports={reports} />
                                                                            </div>
                                                                        ))}
                                                                </div>

                                                                {errors.filter((error) => error.modelLabel === label && error.datasetId === dataset.id).length > 0 && (
                                                                    <div className="flex flex-col space-y-4 pb-4">
                                                                        {errors
                                                                            .filter((error) => error.modelLabel === label && error.datasetId === dataset.id)
                                                                            .map((e, idx) => (
                                                                                <div
                                                                                    key={`${e.modelLabel}-${e.testCaseId}-${idx}`}>
                                                                                    <TestCaseErrorCard error={e} />
                                                                                </div>
                                                                            ))}
                                                                    </div>
                                                                )}
                                                            </TabsContent>
                                                        ))}
                                                    </Tabs>
                                                </TabsContent>
                                            );
                                        })}
                                    </Tabs>
                                </TabsContent>
                            ))}
                        </Tabs>
                    </>
                )}
            </section>
        </div>
    );
}

function groupBy<T>(arr: T[], key: (t: T) => string) {
    return arr.reduce<Record<string, T[]>>((acc, item) => {
        const k = key(item);
        // @ts-ignore
        (acc[k] ||= []).push(item);
        return acc;
    }, {});
}

function flattenPromptSummaries(summaries: ModelSummaryMap): ChartItem[] {
    return Array.from(summaries.entries()).flatMap(
        ([modelLabel, promptSummaries]) =>
            Array.from(promptSummaries.entries()).map(
                ([promptLabel, summary]) => ({
                    modelLabel,
                    promptLabel,
                    summary,
                })
            )
    );
}

function flattenAggregatedStats(summaries: AggregatedPromptEvaluationResults): AggregatedChartItem[] {
    return Object.entries(summaries).flatMap(([modelLabel, promptMetrics]) =>
        Object.entries(promptMetrics).map(([promptLabel, metrics]) => ({
            modelLabel,
            promptLabel,
            metrics,
        }))
    );
}
