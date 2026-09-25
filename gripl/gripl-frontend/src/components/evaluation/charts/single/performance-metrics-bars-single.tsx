"use client"

import ApexCharts from "react-apexcharts";
import { mergeEvalColors } from "../common/palettes";
import { getEvaluationColors } from "@/lib/chart-colors";
import React from "react";
import ChartContainer from "@/components/evaluation/charts/chart-container";
import { ChartItem } from "@/models/evaluation/PromptChartData";

export default function PerformanceMetricsBarsSingle({ item }: { item: ChartItem[] }) {
    const colors = mergeEvalColors(getEvaluationColors);

    const series = [
        {
            name: "Accuracy",
            data: item.map(({ summary }) => summary.accuracy),
        },
        {
            name: "Precision",
            data: item.map(({ summary }) => summary.precision),
        },
        {
            name: "Recall",
            data: item.map(({ summary }) => summary.recall),
        },
        {
            name: "F1-Score",
            data: item.map(({ summary }) => summary.f1Score),
        },
    ];

    const options: ApexCharts.ApexOptions = {
        chart: {
            type: "bar",
            toolbar: { show: false },
            animations: { enabled: false },
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: "85%",
            },
        },
        dataLabels: {
            enabled: false,
        },
        stroke: {
            show: true,
            width: 2,
            colors: ["transparent"],
        },
        xaxis: {
            categories: item.map(({ promptLabel }) => promptLabel),
        },
        yaxis: {
            min: 0,
            max: 1,
            labels: {
                formatter: (value) => `${(value * 100).toFixed(0)}%`,
            },
        },
        colors: [
            colors.accuracy,
            colors.precision,
            colors.recall,
            colors.f1Score,
        ],
        legend: {
            show: true,
            position: "bottom",
            horizontalAlign: "center",
        },
        tooltip: {
            y: {
                formatter: (value) => `${(value * 100).toFixed(2)}%`,
            },
        },
    };

    return (
        <ChartContainer title="Performance Metrics Comparison">
            <ApexCharts
                options={options}
                series={series}
                type="bar"
                height={300}
            />
        </ChartContainer>
    );
}
