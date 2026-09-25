import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export type RagMetricsItem = {
    label?: string;
    faithfulness: number | null;
    contextUtilization: number | null;
    samplesText?: string;
};

interface RagMetricsCardProps {
    title?: string;
    items: RagMetricsItem[];
}

const metricDefinitions = [
    {
        label: "Faithfulness",
        color: "text-chart-metric-4",
        getValue: (item: RagMetricsItem) => item.faithfulness,
    },
    {
        label: "Context Utilization",
        color: "text-chart-metric-3",
        getValue: (item: RagMetricsItem) => item.contextUtilization,
    },
];

function formatValue(value: number | null) {
    return value === null ? "n/a" : value.toFixed(3);
}

function toProgressValue(value: number | null) {
    return value === null ? 0 : Math.max(0, Math.min(1, value)) * 100;
}

/**
 * Displays Ragas retrieval/generation quality metrics:
 *  - Faithfulness (grounding of explanations in retrieved context)
 *  - Context Utilization (how well the LLM used the retrieved context)
 *
 * Accepts either a per-test-case object or an aggregate summary object.
 * Renders nothing if no RAG metrics are available.
 */
export default function RagMetricsCard({ title = "RAG Metrics (Ragas)", items }: RagMetricsCardProps) {
    const itemsWithMetrics = items.filter(
        (item) =>
            item.faithfulness !== null ||
            item.contextUtilization !== null
    );

    if (itemsWithMetrics.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>

            <CardContent>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    {itemsWithMetrics.map((item) => (
                        <div
                            key={item.label ?? "default"}
                            className="space-y-4"
                        >
                            {item.label && (
                                <h3 className="text-center text-sm font-semibold">
                                    {item.label}
                                </h3>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                {metricDefinitions.map((metric) => {
                                    const value = metric.getValue(item);

                                    if (value === null) {
                                        return null;
                                    }

                                    return (
                                        <div
                                            key={`${metric.label}-${item.label ?? "default"}`}
                                            className="text-center"
                                        >
                                            <div className={`text-3xl font-bold ${metric.color}`}>
                                                {formatValue(value)}
                                            </div>

                                            <div className="text-sm text-muted-foreground">
                                                {metric.label}
                                            </div>

                                            <Progress
                                                value={toProgressValue(value)}
                                                className="mt-2 h-2"
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            {item.samplesText && (
                                <div className="text-center text-xs text-muted-foreground">
                                    {item.samplesText}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
