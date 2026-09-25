"use client"

import ApexCharts from "react-apexcharts";
import { mergeEvalColors } from "../common/palettes";
import { getEvaluationColors } from "@/lib/chart-colors";
import React from "react";
import ChartContainer from "@/components/evaluation/charts/chart-container";
import { ChartItem } from "@/models/evaluation/PromptChartData";

export default function ConfusionMatrixBarsSingle({ item }: { item: ChartItem[] }) {
    const colors = mergeEvalColors(getEvaluationColors);

    const series = [
        {
            name: "True Positives",
            data: item.map(({ summary }) => summary.totalTruePositives),
        },
        {
            name: "False Positives",
            data: item.map(({ summary }) => summary.totalFalsePositives),
        },
        {
            name: "False Negatives",
            data: item.map(({ summary }) => summary.totalFalseNegatives),
        },
        {
            name: "True Negatives",
            data: item.map(({ summary }) => summary.totalTrueNegatives),
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
            title: {
                text: "Count",
                style: { fontSize: "10px", fontWeight: 400 },
            },
            min: 0,
            labels: {
                style: { fontSize: "10px" },
            },
        },
        colors: [
            colors.truePositive,
            colors.falsePositive,
            colors.falseNegative,
            colors.trueNegative,
        ],
        legend: {
            show: true,
            position: "bottom",
            horizontalAlign: "center",
        },
        tooltip: {
            y: {
                formatter: (value) => `${value}`,
            },
        },
    };

    return (
        <ChartContainer title="Confusion Matrix Breakdown">
            <ApexCharts
                options={options}
                series={series}
                type="bar"
                height={300}
            />
        </ChartContainer>
    );
}
