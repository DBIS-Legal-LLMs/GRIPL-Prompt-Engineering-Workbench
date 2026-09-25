import React from "react";
import { ChartItem } from "@/models/evaluation/PromptChartData";
import TestResultDistributionPieSingle from "@/components/evaluation/charts/single/test-result-distribution-pie-single";
import PerformanceMetricsOverviewRadarSingle from "@/components/evaluation/charts/single/performance-metrics-overview-radar-single";
import PerformanceMetricsBarsSingle from "@/components/evaluation/charts/single/performance-metrics-bars-single";
import ConfusionMatrixBarsSingle from "@/components/evaluation/charts/single/confusion-matrix-bars-single";
import { AmountOfRetriesPerModel } from "@/components/evaluation/charts/multi/amount-of-retries-bars-multi";
import { PerformanceMetricsBarsMulti } from "@/components/evaluation/charts/multi/performance-metrics-bars-multi";
import { ConfusionMatrixBarsMulti } from "@/components/evaluation/charts/multi/confusion-matrix-bars-multi";
import { ResultsPerModelStacked } from "@/components/evaluation/charts/multi/results-per-model-stacked";

type MetricsChartsProps = {
    reportSummaries: ChartItem[];
    scope: "all-models" | "single-model";
};

export default function MetricsCharts({ reportSummaries, scope }: MetricsChartsProps) {
    if (scope === "all-models") {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PerformanceMetricsBarsMulti reportSummaries={reportSummaries} />
                <ResultsPerModelStacked reportSummaries={reportSummaries} />
                <ConfusionMatrixBarsMulti reportSummaries={reportSummaries} />
                <AmountOfRetriesPerModel reportSummaries={reportSummaries} />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TestResultDistributionPieSingle item={reportSummaries} />
            <PerformanceMetricsOverviewRadarSingle item={reportSummaries} />
            <PerformanceMetricsBarsSingle item={reportSummaries} />
            <ConfusionMatrixBarsSingle item={reportSummaries} />
        </div>
    );
}
