"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { mergeEvalColors } from "../common/palettes";
import { getEvaluationColors } from "@/lib/chart-colors";
import React from "react";
import UniversalTooltip from "@/components/evaluation/charts/common/universal-tooltip";
import ChartContainer from "@/components/evaluation/charts/chart-container";
import { ChartItem } from "@/models/evaluation/PromptChartData";

export default function TestResultDistributionPieSingle({ item }: { item: ChartItem[] }) {
    const colors = mergeEvalColors(getEvaluationColors);

    return (
        <ChartContainer title="Test Results Distribution">
            <div className={item.length === 1 ? "grid grid-cols-1" : "grid grid-cols-1 gap-6 xl:grid-cols-2"}>
                {item.map(({ promptLabel, summary }) => {
                    const data = [
                        { name: "Passed", value: summary.passed, color: colors.passed },
                        { name: "Failed", value: summary.failed, color: colors.failed },
                        { name: "Error", value: summary.error, color: colors.error },
                    ].filter(entrie => entrie.value > 0);

                    return (
                        <div key={promptLabel}>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false}
                                        label={({ name, value, percent }) => `${name}: ${value} (${((percent || 0) * 100).toFixed(0)}%)`}>
                                        {data.map((entrie, i) => <Cell key={i} fill={entrie.color} />)}
                                    </Pie>
                                    <Tooltip content={<UniversalTooltip />} wrapperStyle={{ zIndex: 100 }} />
                                </PieChart>
                            </ResponsiveContainer>

                            <p className="text-center text-sm font-medium">{promptLabel}</p>
                        </div>
                    );
                })}
            </div>
        </ChartContainer>
    );
}
