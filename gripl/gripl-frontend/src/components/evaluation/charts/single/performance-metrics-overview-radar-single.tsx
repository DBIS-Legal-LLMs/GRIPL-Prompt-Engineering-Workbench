"use client"

import { Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { mergeEvalColors } from "../common/palettes";
import { getEvaluationColors } from "@/lib/chart-colors";
import React, { useState } from "react";
import UniversalTooltip from "@/components/evaluation/charts/common/universal-tooltip";
import ChartContainer from "@/components/evaluation/charts/chart-container";
import { ChartItem } from "@/models/evaluation/PromptChartData";

export default function PerformanceMetricsOverviewRadarSingle({ item }: { item: ChartItem[] }) {
    const colors = mergeEvalColors(getEvaluationColors);

    const [hiddenPrompts, setHiddenPrompts] = useState<Set<string>>(new Set());
    const promptColors = [
        "#2563eb",
        "#7e22ce",
    ];

    const data = [
        {
            metric: "Accuracy",
            ...Object.fromEntries(
                item.map(({ promptLabel, summary }) => [
                    promptLabel,
                    summary.accuracy * 100,
                ])
            ),
        },
        {
            metric: "Precision",
            ...Object.fromEntries(
                item.map(({ promptLabel, summary }) => [
                    promptLabel,
                    summary.precision * 100,
                ])
            ),
        },
        {
            metric: "Recall",
            ...Object.fromEntries(
                item.map(({ promptLabel, summary }) => [
                    promptLabel,
                    summary.recall * 100,
                ])
            ),
        },
        {
            metric: "F1-Score",
            ...Object.fromEntries(
                item.map(({ promptLabel, summary }) => [
                    promptLabel,
                    summary.f1Score * 100,
                ])
            ),
        },
    ];

    return <ChartContainer title="Performance Metrics Overview">
        <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={data}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                {item.map(({ promptLabel }, index) => {
                    const color = promptColors[index] ?? promptColors[0];
                    return (
                        <Radar
                            key={promptLabel}
                            name={promptLabel}
                            dataKey={promptLabel}
                            stroke={color}
                            fill={color}
                            fillOpacity={0.3}
                            strokeWidth={2}
                            hide={hiddenPrompts.has(promptLabel)}
                            isAnimationActive={false}
                        />
                    );
                })}

                {item.length > 1 && (
                    <Legend
                        verticalAlign="bottom"
                        onClick={(entry) => {
                            const promptLabel = String(
                                entry.dataKey ?? entry.value ?? ""
                            );

                            if (!promptLabel) {
                                return;
                            }

                            setHiddenPrompts((previous) => {
                                const next = new Set(previous);

                                if (next.has(promptLabel)) {
                                    next.delete(promptLabel);
                                } else {
                                    next.add(promptLabel);
                                }

                                return next;
                            });
                        }}
                        formatter={(value, entry) => {
                            const promptLabel = String(
                                entry.dataKey ?? value
                            );

                            return (
                                <span
                                    style={{
                                        color: hiddenPrompts.has(promptLabel)
                                            ? "#9ca3af"
                                            : undefined,
                                        cursor: "pointer",
                                    }}
                                >
                                    {value}
                                </span>
                            );
                        }}
                    />
                )}

                <Tooltip content={<UniversalTooltip isPercentage={true} />} wrapperStyle={{ zIndex: 100 }} />
            </RadarChart>
        </ResponsiveContainer>
    </ChartContainer>
}
