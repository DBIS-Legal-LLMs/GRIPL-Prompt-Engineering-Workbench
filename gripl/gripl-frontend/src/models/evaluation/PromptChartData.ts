import { EvaluationReportSummary } from "@/models/dto/ReportData";

export interface ChartItem {
    modelLabel: string;
    promptLabel: string;
    summary: EvaluationReportSummary;
}

export interface ChartCategory {
    label: string;
    modelLabel: string;
    promptLabel: string;
}