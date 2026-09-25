import { Card } from "@/components/ui/card";
import { TestCaseReport } from "@/models/dto/ReportData";
import { CheckCircle2, ListChecks, Target } from "lucide-react";

type PromptTestCaseReport = {
    promptLabel: string;
    report: TestCaseReport;
};

interface TestCaseReportCardOverviewProps {
    reports: PromptTestCaseReport[];
}

export default function TestCaseReportCardOverview({ reports }: TestCaseReportCardOverviewProps) {
    const primaryReport = reports[0].report;
    const totalExpected = primaryReport.expectedNamesWithIds.length;

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="p-4">
                <div className="mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    <h3 className="text-sm font-medium">Expected</h3>
                </div>
                <p className="text-2xl font-bold">{totalExpected}</p>
                <p className="text-xs text-muted-foreground">BPMN Elements</p>
            </Card>

            <div className="flex gap-4">
                {reports.map(({ promptLabel, report }) => (
                    <Card key={`detected-${promptLabel}`} className="p-4 w-full">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                            <ListChecks className="h-4 w-4" />
                            Detected 
                            <span className="text-xs font-normal text-muted-foreground">({promptLabel})</span>
                        </div>
                        <p className="text-2xl font-bold">{report.actualNamesWithIds.length}</p>
                        <p className="text-xs text-muted-foreground">BPMN Elements</p>
                    </Card>
                ))}
            </div>

            <div className="flex gap-4">
                {reports.map(({ promptLabel, report }) => (
                    <Card key={`correct-${promptLabel}`} className="p-4 w-full">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                            <CheckCircle2 className="h-4 w-4" />
                            Correct
                            <span className="text-xs font-normal text-muted-foreground">({promptLabel})</span>
                        </div>

                        <p className="text-2xl font-bold">{report.correctActivityIds?.length ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Matches</p>
                    </Card>
                ))}
            </div>
        </div>
    );
}