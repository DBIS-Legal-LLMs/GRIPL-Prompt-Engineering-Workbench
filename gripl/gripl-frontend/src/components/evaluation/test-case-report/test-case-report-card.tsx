"use client"

import type { TestCaseReport } from "@/models/dto/ReportData"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useState } from "react"
import { CheckCircle2, ChevronDown, ChevronRight, XCircle } from "lucide-react"
import TestCaseReportCardPreview from "@/components/evaluation/test-case-report/test-case-report-card-preview";
import TestCaseReportCardReasoning from "@/components/evaluation/test-case-report/test-case-report-card-reasoning";
import TestCaseReportCardOverview from "@/components/evaluation/test-case-report/test-case-report-card-overview";
import TestCaseReportCardComparison from "@/components/evaluation/test-case-report/test-case-report-card-comparison";
import RagMetricsCard from "@/components/evaluation/rag-metrics-card";
import RagPromptContextCard from "@/components/evaluation/rag-prompt-context-card";

type PromptTestCaseReport = {
    promptLabel: string;
    report: TestCaseReport;
};

interface TestCaseReportCardProps {
    reports: PromptTestCaseReport[];
}

export default function TestCaseReportCard({ reports }: TestCaseReportCardProps) {
    const [isOpen, setIsOpen] = useState<boolean>(false)

    const primaryReport = reports[0].report;
    const areAllSuccessful = reports.every(
        ({ report }) => report.isSuccessful
    );

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <Card>
                <CollapsibleTrigger className="w-full">
                    <CardHeader className="w-full flex flex-row items-center justify-between gap-4 p-4 hover:bg-muted/30">
                        <div className="flex min-w-0 items-center gap-3">
                            {areAllSuccessful ? (
                                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                            ) : (
                                <XCircle className="h-5 w-5 shrink-0 text-destructive" />
                            )}

                            <div className="min-w-0 text-left">
                                <CardTitle className="text-lg font-semibold">{primaryReport.testCaseName} ({primaryReport.testCaseId})</CardTitle>

                                <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                                    {reports.map(({ promptLabel, report }) => {
                                        const totalExpected = report.expectedNamesWithIds.length;
                                        const correctCount = report.correctActivityIds?.length ?? 0;
                                        const falsePositiveCount =
                                            report.falsePositiveIds?.length ?? 0;
                                        const amountOfRetries = report.amountOfRetries;

                                        return (
                                            <p key={promptLabel}>
                                                <span className="font-medium text-foreground">
                                                    {promptLabel}:
                                                </span>{" "}
                                                {correctCount}/{totalExpected} correct,{" "}
                                                {falsePositiveCount} false positives
                                                {amountOfRetries !== null &&
                                                    amountOfRetries !== undefined
                                                    ? `, retried ${amountOfRetries} times`
                                                    : null}
                                            </p>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
                            {reports.map(({ promptLabel, report }) => (
                                <div key={promptLabel} className="flex items-center gap-1.5">
                                    <span className="text-sm font-medium">{promptLabel}:</span>
                                    <Badge className={report.isSuccessful ? "bg-success" : "bg-destructive hover:bg-destructive/90"}>
                                        {report.isSuccessful ? "Passed" : "Failed"}
                                    </Badge>
                                </div>
                            ))}

                            {isOpen ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <CardContent className="p-4 pt-0 space-y-6">
                        <TestCaseReportCardOverview reports={reports} />
                        <Separator />
                        <TestCaseReportCardComparison reports={reports} />
                        <TestCaseReportCardPreview report={reports[0].report} />
                        <Separator />
                        <RagMetricsCard
                            items={reports.map(({ promptLabel, report }) => ({
                                label: promptLabel,
                                faithfulness: report.ragMetrics?.faithfulness ?? null,
                                contextUtilization: report.ragMetrics?.contextUtilization ?? null,
                                samplesText: report.ragMetrics
                                    ? `${report.ragMetrics.sampleCount} sample(s)` +
                                        (report.ragMetrics.failedCount > 0 ? `- ${report.ragMetrics.failedCount} failed` : "")
                                    : undefined,
                            }))}
                        />
                        <Separator />
                        {reports
                            .filter(({ report }) => (report.ragPromptContext?.length ?? 0) > 0)
                            .map(({ promptLabel, report }) => (
                                <RagPromptContextCard
                                    key={promptLabel}
                                    title={`Contexts sent to Ragas (${promptLabel}):`}
                                    contexts={report.ragPromptContext!}
                                />
                            ))}
                        <Separator />
                        <TestCaseReportCardReasoning reports={reports} />
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    )
}
