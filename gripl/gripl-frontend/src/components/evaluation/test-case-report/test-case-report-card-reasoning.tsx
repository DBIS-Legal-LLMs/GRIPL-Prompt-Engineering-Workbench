import { Brain } from "lucide-react";
import { TestCaseReport } from "@/models/dto/ReportData";

type PromptTestCaseReport = {
    promptLabel: string;
    report: TestCaseReport;
};

interface TestCaseReportCardReasoningProps {
    reports: PromptTestCaseReport[];
}

export default function TestCaseReportCardReasoning({ reports }: TestCaseReportCardReasoningProps) {
    const resultValues = [
        ...new Set(
            reports.flatMap(({ report }) =>
                report.result.map(result => result.value)
            )
        ),
    ];

    if (resultValues.length === 0) {
        return null;
    }

    return (
        <div>
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Model Reasoning
            </h3>
            <div className="overflow-x-auto rounded-lg border">
                <table className="w-full table-fixed">
                    <colgroup>
                        <col className="w-[20%]" />

                        {reports.map(({ promptLabel }) => (
                            <col
                                key={promptLabel}
                                style={{
                                    width: `${80 / reports.length}%`,
                                }}
                            />
                        ))}
                    </colgroup>

                    <thead>
                        <tr className="bg-muted">
                            <th className="text-left text-sm font-semibold p-2">Activity</th>
                            {reports.map(({ promptLabel }) => (
                                <th key={promptLabel} className="p-2 text-left text-sm font-semibold">
                                    Reasoning
                                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                                        ({promptLabel})
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {resultValues.map((value) => {
                            const firstReportWithResult = reports.find(
                                ({ report }) =>
                                    report.result.some(
                                        (result) => result.value === value
                                    )
                            )?.report;

                            const matchedName =
                                firstReportWithResult?.actualNamesWithIds.find(
                                    (nameWithId) =>
                                        nameWithId.includes(value)
                                ) ?? value;

                            const isFalsePositive = reports.some(({ report }) =>
                                report.falsePositiveIds?.includes(value)
                            );

                            return (
                                <tr key={value} className={`border-t ${isFalsePositive ? "bg-destructive/30" : ""}`}>
                                    <td className="p-2 text-sm font-medium">{matchedName}</td>

                                    {reports.map(({ promptLabel, report }) => {
                                        const result = report.result.find((entry) => entry.value === value);
                                        return <td key={promptLabel} className="p-2 text-sm">{result?.reason ?? "No reasoning provided"}</td>
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}