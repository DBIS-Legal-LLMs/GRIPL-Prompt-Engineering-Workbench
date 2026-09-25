import { ListChecks, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TestCaseReport } from "@/models/dto/ReportData";

type PromptTestCaseReport = {
    promptLabel: string;
    report: TestCaseReport;
};

interface TestCaseReportCardComparisonProps {
    reports: PromptTestCaseReport[];
}

export default function TestCaseReportCardComparison({ reports }: TestCaseReportCardComparisonProps) {
    const primaryReport = reports[0].report;

    return <div className={`grid grid-cols-1 gap-6 ${reports.length === 1 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
        <div>
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Expected BPMN Elements
            </h3>
            <Card className="p-3">
                <div className="space-y-1">
                    {primaryReport.expectedNamesWithIds.map((item, index) => {
                        const isCorrect = primaryReport.correctActivityIds?.some(id => item.includes(`(${id})`))
                        return <div key={index} className={`text-sm ${isCorrect ? 'text-chart-success' : 'text-warning'}`}>
                            • {item}
                        </div>
                    })}
                </div>
            </Card>
        </div>

        {reports.map(({ promptLabel, report }) => (
            <div key={promptLabel}>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <ListChecks className="h-4 w-4" />
                    Detected BPMN Elements
                    <span className="text-xs font-normal text-muted-foreground">
                        ({promptLabel})
                    </span>
                </h3>

                <Card className="p-3">
                    <div className="space-y-1">
                        {report.actualNamesWithIds.map((item, index) => {
                            const isCorrect = report.correctActivityIds?.some(id => item.includes(`(${id})`))
                            return <div key={index} className={`text-sm ${isCorrect ? 'text-chart-success' : 'text-destructive'}`}>
                                • {item}
                            </div>
                        })}
                    </div>
                </Card>
            </div>
        ))}
    </div>
}