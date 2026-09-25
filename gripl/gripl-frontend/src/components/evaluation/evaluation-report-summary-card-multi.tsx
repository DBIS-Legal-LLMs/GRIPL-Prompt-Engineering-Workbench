import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EvaluationReportSummary, RagSummaryMetrics } from "@/models/dto/ReportData";
import RagMetricsCard from "@/components/evaluation/rag-metrics-card";
import { Fragment } from "react";

type SummaryItem = {
    promptLabel: string;
    summary: EvaluationReportSummary;
};

type MetricDefinition = {
    label: string;
    color: string;
    value: (summary: EvaluationReportSummary) => number;
}

const resultMetrics: MetricDefinition[] = [
    {
        label: "Passed",
        color: "text-chart-success",
        value: (summary) => summary.passed,
    },
    {
        label: "Failed",
        color: "text-chart-error",
        value: (summary) => summary.failed,
    },
    {
        label: "Errors",
        color: "text-chart-warning",
        value: (summary) => summary.error,
    },
    {
        label: "Total",
        color: "",
        value: (summary) => summary.total,
    },
];

const performanceMetrics: MetricDefinition[] = [
    {
        label: "Accuracy",
        color: "text-chart-metric-4",
        value: (summary) => summary.accuracy,
    },
    {
        label: "Precision",
        color: "text-chart-metric-1",
        value: (summary) => summary.precision,
    },
    {
        label: "Recall",
        color: "text-chart-metric-2",
        value: (summary) => summary.recall,
    },
    {
        label: "F1-Score",
        color: "text-chart-metric-3",
        value: (summary) => summary.f1Score,
    },
];

function formatDecimal(value: number): string {
    return value.toFixed(3);
}

function formatPercentage(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
}

function toProgressValue(value: number | null | undefined): number {
    return value === null || value === undefined
        ? 0
        : Math.max(0, Math.min(1, value)) * 100;
}

function hasRagMetrics(summary: RagSummaryMetrics | null | undefined) {
    return (
        summary?.faithfulnessMean !== null ||
        summary?.contextUtilizationMean !== null
    );
}

export default function EvaluationReportSummaryCardMulti({ items }: { items: SummaryItem[] }) {
    const isSinglePrompt = items.length === 1;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Evaluation Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className={`grid grid-cols-1 ${isSinglePrompt ? "" : "md:grid-cols-2"} gap-12`}>
                        {items.map(({ promptLabel, summary }) => {
                            const successRate =
                                summary.total > 0
                                    ? summary.passed / summary.total
                                    : 0;

                            return (
                                <div key={promptLabel} className="space-y-7">
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold">{promptLabel}</h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            {resultMetrics.map((metric) => (
                                                <div key={`${metric.label}-${promptLabel}`} className="text-center">
                                                    <div className={`text-2xl font-bold ${metric.color}`}>
                                                        {metric.value(summary)}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {metric.label}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="mb-2 flex justify-between gap-4">
                                            <span>Success Rate: {promptLabel}</span>
                                            <span>{formatPercentage(successRate)}</span>
                                        </div>
                                        <Progress
                                            value={successRate * 100}
                                            className="h-2"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className={`grid grid-cols-1 ${isSinglePrompt ? "" : "md:grid-cols-2"} gap-12`}>
                        {items.map(({ promptLabel, summary }) => (
                            <div
                                key={promptLabel}
                                className="space-y-4"
                            >
                                <h3 className="text-sm font-semibold">
                                    {promptLabel}
                                </h3>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {performanceMetrics.map((metric) => {
                                        const value = metric.value(summary);

                                        return (
                                            <div
                                                key={`${metric.label}-${promptLabel}`}
                                                className="text-center"
                                            >
                                                <div className={`text-3xl font-bold ${metric.color}`}>
                                                    {formatDecimal(value)}
                                                </div>

                                                <div className="text-sm text-muted-foreground">
                                                    {metric.label}
                                                </div>

                                                <Progress
                                                    value={toProgressValue(value)}
                                                    className="mt-4 h-2"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {items.some(
                ({ summary }) =>
                    summary.perElementType &&
                    Object.keys(summary.perElementType).length > 0
            ) && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Metrics by Element Type</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Prompt</TableHead>
                                        <TableHead className="text-right">TP</TableHead>
                                        <TableHead className="text-right">FP</TableHead>
                                        <TableHead className="text-right">FN</TableHead>
                                        <TableHead className="text-right">TN</TableHead>
                                        <TableHead className="text-right">Precision</TableHead>
                                        <TableHead className="text-right">Recall</TableHead>
                                        <TableHead className="text-right">F1-Score</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.flatMap(({ promptLabel, summary }) =>
                                        Object.entries(summary.perElementType ?? {}).map(
                                            ([elementType, typeSummary]) => (
                                                <TableRow key={`${elementType}-${promptLabel}`}>
                                                    <TableCell className="font-medium">{typeSummary.displayName}</TableCell>
                                                    <TableCell>{promptLabel}</TableCell>
                                                    <TableCell className="text-right">{typeSummary.truePositives}</TableCell>
                                                    <TableCell className="text-right">{typeSummary.falsePositives}</TableCell>
                                                    <TableCell className="text-right">{typeSummary.falseNegatives}</TableCell>
                                                    <TableCell className="text-right">{typeSummary.trueNegatives}</TableCell>
                                                    <TableCell className="text-right">{formatDecimal(typeSummary.precision)}</TableCell>
                                                    <TableCell className="text-right">{formatDecimal(typeSummary.recall)}</TableCell>
                                                    <TableCell className="text-right">{formatDecimal(typeSummary.f1Score)}</TableCell>
                                                </TableRow>
                                            )
                                        )
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

            <RagMetricsCard
                items={items.map(({ promptLabel, summary }) => ({
                    label: promptLabel,
                    faithfulness: summary.ragMetrics?.faithfulnessMean ?? null,
                    contextUtilization: summary.ragMetrics?.contextUtilizationMean ?? null,
                    samplesText: summary.ragMetrics
                        ? `${summary.ragMetrics.totalSamples} sample(s) across ${summary.ragMetrics.evaluatedTestCases} test case(s)` +
                        (summary.ragMetrics.failedSamples > 0 ? `- ${summary.ragMetrics.failedSamples} failed` : "")
                        : undefined,
                }))}
            />
        </div>
    );
}
