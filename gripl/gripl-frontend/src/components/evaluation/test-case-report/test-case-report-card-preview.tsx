"use client"

import { ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import useLoadPreviewImage, { PreviewClassificationMap } from "@/hooks/use-load-preview-image";
import type { TestCaseReport } from "@/models/dto/ReportData";
import { useMemo } from "react";

type PromptTestCaseReport = {
    promptLabel: string
    report: TestCaseReport
}

interface TestCaseReportCardPreviewProps {
    reports: PromptTestCaseReport[]
}

function createClassificationMap(reports: PromptTestCaseReport[]): PreviewClassificationMap | undefined {
    const reportA = reports[0]?.report
    const reportB = reports[1]?.report

    if (!reportA || !reportB) {
        return undefined
    }

    const aTruePositives = new Set(reportA.correctActivityIds ?? [])
    const aFalsePositives = new Set(reportA.falsePositiveIds ?? [])
    const aFalseNegatives = new Set(reportA.falseNegativeIds ?? [])

    const bTruePositives = new Set(reportB.correctActivityIds ?? [])
    const bFalsePositives = new Set(reportB.falsePositiveIds ?? [])
    const bFalseNegatives = new Set(reportB.falseNegativeIds ?? [])

    const allIds = new Set([
        ...aTruePositives,
        ...aFalsePositives,
        ...aFalseNegatives,
        ...bTruePositives,
        ...bFalsePositives,
        ...bFalseNegatives,
    ])

    const classifications: PreviewClassificationMap = {
        bothTruePositive: [],
        bothFalsePositive: [],
        bothFalseNegative: [],
        bothTrueNegative: [],
        onlyATruePositive: [],
        onlyAFalsePositive: [],
        onlyBTruePositive: [],
        onlyBFalsePositive: [],
    }

    for (const id of allIds) {
        const aIsTruePositive = aTruePositives.has(id)
        const aIsFalsePositive = aFalsePositives.has(id)
        const aIsFalseNegative = aFalseNegatives.has(id)

        const bIsTruePositive = bTruePositives.has(id)
        const bIsFalsePositive = bFalsePositives.has(id)
        const bIsFalseNegative = bFalseNegatives.has(id)

        const aIsTrueNegative =
            !aIsTruePositive &&
            !aIsFalsePositive &&
            !aIsFalseNegative

        const bIsTrueNegative =
            !bIsTruePositive &&
            !bIsFalsePositive &&
            !bIsFalseNegative

        if (aIsTruePositive && bIsTruePositive) {
            classifications.bothTruePositive?.push(id)
        } else if (aIsFalsePositive && bIsFalsePositive) {
            classifications.bothFalsePositive?.push(id)
        } else if (aIsFalseNegative && bIsFalseNegative) {
            classifications.bothFalseNegative?.push(id)
        } else if (aIsTrueNegative && bIsTrueNegative) {
            classifications.bothTrueNegative?.push(id)
        } else if (aIsTruePositive && !bIsTruePositive) {
            classifications.onlyATruePositive?.push(id)
        } else if (aIsFalsePositive && !bIsFalsePositive) {
            classifications.onlyAFalsePositive?.push(id)
        } else if (bIsTruePositive && !aIsTruePositive) {
            classifications.onlyBTruePositive?.push(id)
        } else if (bIsFalsePositive && !aIsFalsePositive) {
            classifications.onlyBFalsePositive?.push(id)
        }
    }

    return classifications
}

const previewLegendItems = [
    {
        label: "True Positive (A and B)",
        color: "#BEFFBE", // light green
    },
    {
        label: "False Negative (A and B)",
        color: "#FFBEBE", // light red
    },
    {
        label: "True Positive (A), False Negative (B)",
        color: "#BEDBFF", // light blue
    },
    {
        label: "False Negative (A), True Positive (B)",
        color: "#E1BEFF", // light purple
    },
    {
        label: "False Positive (A and B)",
        patternColor: "#991b1b", // dark red
        backgroundColor: "#ffffff",
    },
    {
        label: "True Negative (A and B)",
        color: "#ffffff",
    },
    {
        label: "False Positive (A), True Negative (B)",
        patternColor: "#1d4ed8", // dark blue
        backgroundColor: "#ffffff",
    },
    {
        label: "True Negative (A), False Positive (B)",
        patternColor: "#7e22ce", // dark purple
        backgroundColor: "#ffffff",
    },
]

export default function TestCaseReportCardPreview({ reports }: TestCaseReportCardPreviewProps) {
    const primaryReport = reports[0].report
    const classifications = useMemo(
        () => createClassificationMap(reports),
        [reports]
    )

    const { previewImage, isLoading } = useLoadPreviewImage({
        testCaseId: primaryReport.testCaseId,
        correctActivityIds: reports.length === 1 ? primaryReport.correctActivityIds : undefined,
        falsePositiveIds: reports.length === 1 ? primaryReport.falsePositiveIds : undefined,
        falseNegativeIds: reports.length === 1 ? primaryReport.falseNegativeIds : undefined,
        classifications,
    })

    return <div>
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Visual Preview
        </h3>
        <Card className="p-3 items-center">
            {isLoading ? (
                <Skeleton className="h-32 w-full rounded" />
            ) : (
                <div className="rounded overflow-hidden">{previewImage}</div>
            )}

            {reports.length > 1 && (
                <div className="mx-auto mt-4 mb-4 grid w-fit grid-cols-1 gap-x-24 gap-y-2 text-xs sm:grid-cols-4">
                    {previewLegendItems.map((item) => (
                        <div
                            key={item.label}
                            className="flex min-w-0 items-center gap-2"
                        >
                            <span
                                aria-hidden="true"
                                className="h-4 w-4 shrink-0 rounded-sm border border-border"
                                style={{
                                    backgroundColor:
                                        item.backgroundColor ?? item.color,
                                    backgroundImage: item.patternColor
                                        ? `repeating-linear-gradient(
                                -45deg,
                                transparent,
                                transparent 3px,
                                ${item.patternColor} 3px,
                                ${item.patternColor} 5px
                            )`
                                        : undefined,
                                }}
                            />

                            <span className="text-muted-foreground">
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    </div>
}