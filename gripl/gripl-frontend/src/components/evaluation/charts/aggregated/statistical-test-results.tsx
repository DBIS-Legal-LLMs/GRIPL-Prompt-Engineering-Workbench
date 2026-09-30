"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatisticalTestResult } from "@/lib/statistical-test-utils";
import { Fragment } from "react";

interface StatisticalTestResultsProps {
    results: StatisticalTestResult[];
    alpha: number;
    promptLabels: string[];
}

function format(value: number | null, digits = 3): string {
    return value === null || !Number.isFinite(value) ? "-" : value.toFixed(digits);
}

export default function StatisticalTestResults({ results, alpha, promptLabels }: StatisticalTestResultsProps) {
    const modelLabels = [...new Set(results.map((result) => result.modelLabel))];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Statistical Test Results</CardTitle>
                <CardDescription>Two-sided paired t-tests with separate Bonferroni-Holm correction per model.</CardDescription>
                <p className="text-sm text-muted-foreground">alpha={alpha}</p>
            </CardHeader>
            <CardContent>
                {results.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No paired test cases are available for statistical testing.</p>
                ) : (
                    <div className="w-full overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="border-b-2 border-gray-300">
                                    <th className="whitespace-nowrap px-3 py-3 text-left font-semibold">Model</th>
                                    <th className="whitespace-nowrap px-3 py-3 text-left font-semibold">Metric</th>
                                                <th className="min-w-48 whitespace-nowrap px-3 py-3 text-left font-semibold">Shapiro-Wilk Result</th>
                                    {[promptLabels[0] ?? "Prompt A", promptLabels[1] ?? "Prompt B"].map((label) => (
                                        <th key={label} className="max-w-36 px-3 py-3 text-left font-semibold">
                                            <span className="block truncate" title={`${label} (Mean)`}>{label} (Mean)</span>
                                        </th>
                                    ))}
                                    {["Difference", "95%-CI", "t-Value", "p-Value", "p-Value (adjusted)", "Significant?"].map((header) => (
                                        <th key={header} className="whitespace-nowrap px-3 py-3 text-left font-semibold">{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {modelLabels.map((modelLabel) => {
                                    const modelResults = results.filter((result) => result.modelLabel === modelLabel);
                                    const first = modelResults[0];
                                    const modelWarning = modelResults.find((result) => result.warningScope === "model")?.warning;
                                    return (
                                        <Fragment key={modelLabel}>
                                            {modelResults.map((result, index) => (
                                                <tr
                                                    key={`${result.modelLabel}-${result.metric}`}
                                                    title={result.warningScope === "metric" ? result.warning : undefined}
                                                    className={`border-b border-gray-200 align-top ${result.warningScope === "metric" ? "bg-amber-100/70 hover:bg-amber-100/90" : "hover:bg-gray-50"}`}
                                                >
                                                    {index === 0 && (
                                                        <td
                                                            rowSpan={modelResults.length}
                                                            title={modelWarning}
                                                            className={`px-3 py-2 font-medium align-top ${modelWarning ? "bg-amber-100/70 hover:bg-amber-100/90" : "hover:bg-gray-50"}`}
                                                        >
                                                            <div>{modelLabel}</div>
                                                            <div className="mt-1 flex gap-3 text-xs font-normal text-muted-foreground">
                                                                <span>n={first.n}</span>
                                                                <span>df={first.df ?? "-"}</span>
                                                            </div>
                                                        </td>
                                                    )}
                                                    <td className="whitespace-nowrap px-3 py-2">{result.metric}</td>
                                                    <td className="min-w-48 px-3 py-2">{result.shapiroResult}</td>
                                                    <td className="px-3 py-2 font-mono">{format(result.promptA)}</td>
                                                    <td className="px-3 py-2 font-mono">{format(result.promptB)}</td>
                                                    <td className="px-3 py-2 font-mono">{format(result.difference)}</td>
                                                    <td className="whitespace-nowrap px-3 py-2 font-mono">{result.confidenceInterval ? `[${format(result.confidenceInterval[0])}, ${format(result.confidenceInterval[1])}]` : "-"}</td>
                                                    <td className="px-3 py-2 font-mono">{format(result.tValue)}</td>
                                                    <td className="px-3 py-2 font-mono">{format(result.pValue)}</td>
                                                    <td className="px-3 py-2 font-mono">{format(result.pValueCorrected)}</td>
                                                    <td className={`whitespace-nowrap px-3 py-2 ${result.significant === true ? "bg-green-100" : ""}`}>
                                                        {result.significant === null ? "-" : result.significant ? "Yes" : "No"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}