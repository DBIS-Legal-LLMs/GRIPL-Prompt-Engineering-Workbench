"use client"

import { AggregatedEvaluationResults, AggregatedPromptEvaluationResults } from "@/models/evaluation/AggregatedEvaluationResult";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ChartMenu from "@/components/evaluation/charts/common/chart-menu";
import html2canvas from "html2canvas"

interface MetricsTableProps {
    aggregatedEvaluationResults: AggregatedPromptEvaluationResults
}

export default function MetricsTable({ aggregatedEvaluationResults }: MetricsTableProps) {
    const chartId = `metrics-table-chart`

    const formatMetric = (mean: number, std: number) => {
        return `${mean.toFixed(3)} ± ${std.toFixed(3)}`
    }

    const handleDownload = async () => {
        const tableElement = document.getElementById("metrics-table-container")
        if (!tableElement) {
            console.error("Table element not found")
            return
        }

        try {
            const canvas = await html2canvas(tableElement, {
                backgroundColor: "#ffffff",
                scale: 2,
            })
            const dataUrl = canvas.toDataURL("image/png")
            const link = document.createElement("a")
            link.download = "metrics-table.png"
            link.href = dataUrl
            link.click()
        } catch (error) {
            console.error("Error downloading table:", error)
        }
    }

    return <Card>
        <CardHeader>
            <div className="flex items-start justify-between">
                <div>
                    <CardTitle>Metrics Table</CardTitle>
                    <CardDescription>Model performance metrics with averages and standard deviations over all runs and test cases.</CardDescription>
                </div>
                <ChartMenu chartId={chartId} onDownload={handleDownload} />
            </div>
        </CardHeader>
        <CardContent>
            <div id="metrics-table-container" className="w-full overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b-2 border-gray-300">
                            <th className="text-left py-3 px-4 font-semibold">Model</th>
                            <th className="text-left py-3 px-4 font-semibold">Prompt</th>
                            <th className="text-right py-3 px-4 font-semibold">Precision</th>
                            <th className="text-right py-3 px-4 font-semibold">Recall</th>
                            <th className="text-right py-3 px-4 font-semibold">F1-Score</th>
                            <th className="text-right py-3 px-4 font-semibold">Accuracy</th>
                            <th className="text-right py-3 px-4 font-semibold">TP</th>
                            <th className="text-right py-3 px-4 font-semibold">TN</th>
                            <th className="text-right py-3 px-4 font-semibold">FP</th>
                            <th className="text-right py-3 px-4 font-semibold">FN</th>
                            <th className="text-right py-3 px-4 font-semibold">Passed</th>
                            <th className="text-right py-3 px-4 font-semibold">Failed</th>
                            <th className="text-right py-3 px-4 font-semibold">Errors</th>
                            <th className="text-right py-3 px-4 font-semibold">Retries</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(aggregatedEvaluationResults).flatMap(
                            ([modelLabel, promptResults]) => {
                                const prompts = Object.entries(promptResults);

                                return prompts.map(([promptLabel, metrics], index) => (
                                    <tr key={`${modelLabel}-${promptLabel}`} className="border-b border-gray-200 hover:bg-gray-50">
                                        {index === 0 && (
                                            <td className="py-2 px-4" rowSpan={prompts.length}>
                                                {modelLabel}
                                            </td>
                                        )}
                                        <td className="py-2 px-4">{promptLabel}</td>
                                        <td className="text-right py-2 px-4 font-mono text-sm">
                                            {formatMetric(metrics.avgPrecision, metrics.stdPrecision)}
                                        </td>
                                        <td className="text-right py-2 px-4 font-mono text-sm">
                                            {formatMetric(metrics.avgRecall, metrics.stdRecall)}
                                        </td>
                                        <td className="text-right py-2 px-4 font-mono text-sm">
                                            {formatMetric(metrics.avgF1Score, metrics.stdF1Score)}
                                        </td>
                                        <td className="text-right py-2 px-4 font-mono text-sm">
                                            {formatMetric(metrics.avgAccuracy, metrics.stdAccuracy)}
                                        </td>
                                        <td className="text-right py-2 px-4 font-mono text-sm">
                                            {formatMetric(metrics.avgTruePositives, metrics.stdTruePositives)}
                                        </td>
                                        <td className="text-right py-2 px-4 font-mono text-sm">
                                            {formatMetric(metrics.avgTrueNegatives, metrics.stdTrueNegatives)}
                                        </td>
                                        <td className="text-right py-2 px-4 font-mono text-sm">
                                            {formatMetric(metrics.avgFalsePositives, metrics.stdFalsePositives)}
                                        </td>
                                        <td className="text-right py-2 px-4 font-mono text-sm">
                                            {formatMetric(metrics.avgFalseNegatives, metrics.stdFalseNegatives)}
                                        </td>
                                        <td className="text-right py-2 px-4 font-mono text-sm">
                                            {formatMetric(metrics.avgPassed, metrics.stdPassed)}
                                        </td>
                                        <td className="text-right py-2 px-4 font-mono text-sm">
                                            {formatMetric(metrics.avgFailed, metrics.stdFailed)}
                                        </td>
                                        <td className="text-right py-2 px-4 font-mono text-sm">
                                            {formatMetric(metrics.avgErrors, metrics.stdErrors)}
                                        </td>
                                        <td className="px-4 py-2 text-right font-mono text-sm">
                                            {metrics.avgAmountOfRetries === undefined ||
                                                metrics.stdAmountOfRetries === undefined
                                                ? "-"
                                                : formatMetric(
                                                    metrics.avgAmountOfRetries,
                                                    metrics.stdAmountOfRetries
                                                )}
                                        </td>
                                    </tr>
                                ));
                            }
                        )}
                    </tbody>
                </table>
            </div>
        </CardContent>
    </Card>
}
