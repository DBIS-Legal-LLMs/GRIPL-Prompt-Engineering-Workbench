import type ApexCharts from "apexcharts";
import { ChartItem } from "@/models/evaluation/PromptChartData";

interface ChartGroup {
    title: string;
    cols: number;
}

export function createGroupedCategories(items: Pick<ChartItem, "modelLabel" | "promptLabel">[]): {
    categories: string[];
    groups: ChartGroup[];
} {
    const categories = items.map((item) => item.promptLabel);
    const groups: ChartGroup[] = [];

    let startIndex = 0;

    while (startIndex < items.length) {
        const modelLabel = items[startIndex].modelLabel;
        let endIndex = startIndex;
        
        while (endIndex + 1 < items.length && items[endIndex + 1].modelLabel === modelLabel) {
            endIndex++;
        }

        groups.push({
            title: modelLabel,
            cols: endIndex - startIndex + 1,
        });
        
        startIndex = endIndex + 1;
    }

    return { categories, groups };
}