"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type ApexCharts from "apexcharts"
import { AggregatedChartItem } from "@/models/evaluation/AggregatedEvaluationResult";
import { getModelColor, useColors } from "@/components/evaluation/charts/common/color-context";
import ChartMenu from "@/components/evaluation/charts/common/chart-menu";
import ColorConfigDialog from "@/components/evaluation/charts/common/color-config-dialog";
import { createGroupedCategories } from "../common/chart-grouping"

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false })

interface MetricChartProps {
    title: string
    description: string
    metricKey: "avgPrecision" | "avgRecall" | "avgF1Score" | "avgAccuracy" | "avgAmountOfRetries" | "avgContextUtilization" | "avgFaithfulness"
    stdKey: "stdPrecision" | "stdRecall" | "stdF1Score" | "stdAccuracy" | "stdAmountOfRetries" | "stdContextUtilization" | "stdFaithfulness"
    items: AggregatedChartItem[];
    xAxisMaxOffset?: number
}

interface ModelData {
    name: string
    mean: number
    sd: number
    color: string
}

export default function MetricChart({ title, description, metricKey, stdKey, items, xAxisMaxOffset }: MetricChartProps) {
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
    }, [])

    const modelLabels = [...new Set(items.map((item) => item.modelLabel))]
    const promptLabels = [...new Set(items.map((item) => item.promptLabel))]
        .sort((a, b) => a.localeCompare(b))

    const dataByKey = new Map(
        items.map((item) => [
            `${item.modelLabel}::${item.promptLabel}`,
            {
                mean: item.metrics[metricKey] ?? 0,
                sd: item.metrics[stdKey] ?? 0,
            },
        ])
    )

    const chartId = `metric-chart-${metricKey}`

    const maxValue = Math.max(0, ...items.map((item) => (item.metrics[metricKey] ?? 0) + (item.metrics[stdKey] ?? 0)))
    const xAxisMax = maxValue + (xAxisMaxOffset || 0.2)

    const series = promptLabels.map((promptLabel) => ({
        name: promptLabel,
        data: modelLabels.map((modelLabel) => {
            const data = dataByKey.get(`${modelLabel}::${promptLabel}`)
            return data?.mean ?? null
        }),
    }))

    const options: ApexCharts.ApexOptions = {
        chart: {
            id: chartId,
            type: "bar",
            height: 100,
            toolbar: { show: false },
            animations: { enabled: false },
        },
        plotOptions: {
            bar: {
                horizontal: true,
                distributed: false,
                barHeight: "70%",
                dataLabels: { position: "top" },
            },
        },
        colors: promptLabels.map((_, index) =>
            index === 0 ? "#3b82f6" : "#7e22ce"
        ),
        dataLabels: {
            enabled: true,
            formatter: (_val, opts) => {
                const modelLabel = modelLabels[opts.dataPointIndex]
                const promptLabel = promptLabels[opts.seriesIndex]
                const data = dataByKey.get(`${modelLabel}::${promptLabel}`)
                return data ? `${data.mean.toFixed(3)} ± ${data.sd.toFixed(3)}` : ""
            },
            offsetY: 0,
            offsetX: 40,
            style: { fontSize: "11px", colors: ["#000000"] },
            background: { enabled: false },
        },
        xaxis: {
            categories: modelLabels,
            max: xAxisMax,
            min: 0,
            title: {
                text: `${title} (mean ± SD)`,
                style: { fontSize: "10px", fontWeight: 400 },
            },
            labels: { style: { fontSize: "10px" } },
            axisBorder: { show: true, color: "#000000" },
            axisTicks: { show: true },
        },
        yaxis: {
            labels: {
                style: { fontSize: "10px" },
                maxWidth: 300
            },
            axisBorder: { show: true, color: "#000000" },
        },
        grid: {
            borderColor: "#e0e0e0",
            strokeDashArray: 4,
            xaxis: { lines: { show: true } },
            yaxis: { lines: { show: false } },
        },
        legend: {
            show: true,
            position: "right",
            horizontalAlign: "center",
            offsetY: 70,
        },
        tooltip: {
            enabled: true,
            y: {
                formatter: (val) => val.toFixed(3),
                title: {
                    formatter: () => `${title}: `,
                },
            },
        },
    }

    if (!isClient) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] flex items-center justify-center">
                        <p className="text-muted-foreground">Loading chart...</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle>{title}</CardTitle>
                            <CardDescription>{description}</CardDescription>
                        </div>
                        <ChartMenu chartId={chartId} />
                    </div>
                </CardHeader>
                <CardContent>
                    <Chart options={options} series={series} type="bar" height={Math.max(300, modelLabels.length * 55 + 100)} />
                </CardContent>
            </Card>
        </>
    )
}
