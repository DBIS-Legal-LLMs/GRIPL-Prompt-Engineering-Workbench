import ttest from "@stdlib/stats-ttest";
import padjust from "@stdlib/stats-padjust";
import * as jerzy from "jerzy";
import { pt } from "lib-r-math.js";
import type { TestCaseReport } from "@/models/dto/ReportData";

export const SIGNIFICANCE_LEVEL = 0.05;

type ReportWithContext = TestCaseReport & {
    modelLabel: string;
    promptLabel: string;
};

type ErrorWithContext = {
    modelLabel: string;
    promptLabel: string;
    testCaseId: number;
};

export interface StatisticalTestResult {
    modelLabel: string;
    metric: "Precision" | "Recall" | "F1";
    promptA: number | null;
    promptB: number | null;
    difference: number | null;
    differenceStandardDeviation: number | null;
    shapiroResult: string;
    confidenceInterval: [number, number] | null;
    tValue: number | null;
    pValue: number | null;
    pValueCorrected: number | null;
    significant: boolean | null;
    effectSize: number | null;
    effectSizeConfidenceInterval: [number, number] | null;
    effectSizeLabel: "Cohen's d_z" | "Hedges g_z" | null;
    n: number;
    df: number | null;
    warning?: string;
    warningScope?: "model" | "metric";
}

interface MetricValues {
    precision: number;
    recall: number;
    f1: number;
}

interface TestResultInput {
    modelLabel: string;
    promptAValues: MetricValues;
    promptBValues: MetricValues;
}

/**
 * Calculates precision, recall, and F1 for one test-case report.
 * Empty ground truth is treated as a perfect result.
 */
function calculateMetrics(report: TestCaseReport): MetricValues {
    const truePositives = report.correctActivityIds.length;
    const falsePositives = report.falsePositiveIds.length;
    const falseNegatives = report.falseNegativeIds.length;

    const precision = truePositives + falsePositives === 0
        ? falseNegatives === 0 ? 1 : 0
        : truePositives / (truePositives + falsePositives);
    const recall = truePositives + falseNegatives === 0
        ? 1
        : truePositives / (truePositives + falseNegatives);
    const f1 = precision + recall === 0
        ? 0
        : (2 * precision * recall) / (precision + recall);

    return { precision, recall, f1 };
}

/**
 * Calculates the arithmetic mean of a non-empty list of values.
 */
function average(values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Calculates the sample standard deviation of a non-empty list of values.
 */
function sampleStandardDeviation(values: number[]): number {
    const mean = average(values);
    return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1));
}

/**
 * Finds a noncentrality parameter whose noncentral t CDF matches a probability.
 */
function solveNoncentrality(tValue: number, degreesOfFreedom: number, probability: number): number {
    let lower = -100;
    let upper = 100;
    for (let iteration = 0; iteration < 80; iteration += 1) {
        const middle = (lower + upper) / 2;
        if (pt(tValue, degreesOfFreedom, middle, true, false) > probability) {
            lower = middle;
        } else {
            upper = middle;
        }
    }
    return (lower + upper) / 2;
}

/**
 * Calculates the paired effect size and its confidence interval.
 */
function calculateEffectSize(
    differences: number[],
    alpha: number,
): Pick<StatisticalTestResult, "effectSize" | "effectSizeConfidenceInterval" | "effectSizeLabel"> {
    const n = differences.length;
    const degreesOfFreedom = n - 1;
    const standardDeviation = sampleStandardDeviation(differences);
    const dz = average(differences) / standardDeviation;
    const tValue = dz * Math.sqrt(n);
    const lowerNoncentrality = solveNoncentrality(tValue, degreesOfFreedom, 1 - alpha / 2);
    const upperNoncentrality = solveNoncentrality(tValue, degreesOfFreedom, alpha / 2);
    const correction = 1 - 3 / (4 * degreesOfFreedom - 1);
    const useHedgesG = n < 30;
    const multiplier = useHedgesG ? correction : 1;
    return {
        effectSize: multiplier * dz,
        effectSizeConfidenceInterval: [
            multiplier * lowerNoncentrality / Math.sqrt(n),
            multiplier * upperNoncentrality / Math.sqrt(n),
        ],
        effectSizeLabel: useHedgesG ? "Hedges g_z" : "Cohen's d_z",
    };
}

/**
 * Runs the normality check and paired t-test for one model/metric combination.
 * Constant differences are handled separately because their variance is zero
 * and a regular t-test is therefore undefined.
 */
function calculateMetricTest(
    modelLabel: string,
    metric: StatisticalTestResult["metric"],
    promptAValues: number[],
    promptBValues: number[],
    alpha: number
): StatisticalTestResult {
    const n = promptAValues.length;
    const differences = promptAValues.map((value, index) => value - promptBValues[index]);
    const promptA = average(promptAValues);
    const promptB = average(promptBValues);
    const difference = average(differences);

    if (n < 3) {
        return {
            modelLabel, metric, promptA: null, promptB: null, difference: null, differenceStandardDeviation: null,
            shapiroResult: "-",
            confidenceInterval: null, tValue: null, pValue: null, pValueCorrected: null,
            significant: null, effectSize: null, effectSizeConfidenceInterval: null, effectSizeLabel: null, n, df: null,
            warning: "t-test not performed: At least three test cases are required.",
            warningScope: "model",
        };
    }

    const isConstant = differences.every((value) => value === differences[0]);

    if (isConstant) {
        return {
            modelLabel, metric, promptA: null, promptB: null, difference: null, differenceStandardDeviation: null,
            shapiroResult: "Not applicable (constant differences)",
            confidenceInterval: null, tValue: null, pValue: null, pValueCorrected: null,
            significant: null, effectSize: null, effectSizeConfidenceInterval: null, effectSizeLabel: null, n, df: null,
            warning: "Constant differences; t-test not performed because the variance is zero.",
            warningScope: "metric",
        };
    }

    const shapiro = jerzy.Normality.shapiroWilk(new jerzy.Vector([...differences]));
    const isNormal = Number.isFinite(shapiro.p) && shapiro.p >= alpha;
    const shapiroResult = `W=${shapiro.w.toFixed(3)}, p=${shapiro.p.toFixed(3)} (${isNormal ? "normal" : "not normal"})`;

    if (!isNormal && n < 30) {
        return {
            modelLabel, metric, promptA: null, promptB: null, difference: null, differenceStandardDeviation: null,
            shapiroResult, confidenceInterval: null, tValue: null,
            pValue: null, pValueCorrected: null, significant: null, effectSize: null, effectSizeConfidenceInterval: null, effectSizeLabel: null, n, df: null,
            warning: "t-test not performed: normality assumption violated and n < 30.",
            warningScope: "metric",
        };
    }

    const test = ttest(promptAValues, promptBValues, { alpha, alternative: "two-sided" });
    const effectSize = calculateEffectSize(differences, alpha);
    return {
        modelLabel, metric, promptA, promptB, difference,
        differenceStandardDeviation: sampleStandardDeviation(differences),
        shapiroResult,
        confidenceInterval: [test.ci[0], test.ci[1]],
        tValue: test.statistic,
        pValue: test.pValue,
        pValueCorrected: null,
        significant: false,
        ...effectSize,
        n, df: test.df,
        warning: !isNormal ? "Normality assumption violated; interpret with caution (n >= 30)." : undefined,
        warningScope: !isNormal ? "metric" : undefined,
    };
}

/**
 * Builds paired test-case metrics, excludes incomplete/error pairs, and runs
 * the three metric tests with Holm correction separately for each model.
 */
export function calculateStatisticalTests(
    testCasesByRun: Map<number, ReportWithContext[]>,
    errorsByRun: Map<number, ErrorWithContext[]>,
    modelLabels: string[],
    promptLabels: string[],
    repetitions: number,
    alpha = SIGNIFICANCE_LEVEL
): StatisticalTestResult[] {
    const [promptA, promptB] = promptLabels;
    if (!promptA || !promptB) return [];

    const inputs: TestResultInput[] = [];
    for (const modelLabel of modelLabels) {
        const testCaseIds = new Set<number>();
        for (const reports of testCasesByRun.values()) {
            reports.filter((report) => report.modelLabel === modelLabel).forEach((report) => testCaseIds.add(report.testCaseId));
        }

        for (const testCaseId of testCaseIds) {
            const promptValues = new Map<string, MetricValues[]>();
            let valid = true;

            for (let runNumber = 1; runNumber <= repetitions; runNumber += 1) {
                const reports = testCasesByRun.get(runNumber) ?? [];
                const errors = errorsByRun.get(runNumber) ?? [];

                for (const promptLabel of [promptA, promptB]) {
                    if (errors.some((error) => error.modelLabel === modelLabel && error.testCaseId === testCaseId && error.promptLabel === promptLabel)) {
                        valid = false;
                    }

                    const report = reports.find((candidate) =>
                        candidate.modelLabel === modelLabel &&
                        candidate.testCaseId === testCaseId &&
                        candidate.promptLabel === promptLabel
                    );
                    if (!report) {
                        valid = false;
                    } else {
                        const values = promptValues.get(promptLabel) ?? [];
                        values.push(calculateMetrics(report));
                        promptValues.set(promptLabel, values);
                    }
                }
            }

            const aValues = promptValues.get(promptA) ?? [];
            const bValues = promptValues.get(promptB) ?? [];
            if (valid && aValues.length === repetitions && bValues.length === repetitions) {
                inputs.push({
                    modelLabel,
                    promptAValues: {
                        precision: average(aValues.map((value) => value.precision)),
                        recall: average(aValues.map((value) => value.recall)),
                        f1: average(aValues.map((value) => value.f1)),
                    },
                    promptBValues: {
                        precision: average(bValues.map((value) => value.precision)),
                        recall: average(bValues.map((value) => value.recall)),
                        f1: average(bValues.map((value) => value.f1)),
                    },
                });
            }
        }
    }

    return modelLabels.flatMap((modelLabel) => {
        const modelInputs = inputs.filter((input) => input.modelLabel === modelLabel);
        if (modelInputs.length === 0) return [];

        const tests = ([
            ["Precision", "precision"],
            ["Recall", "recall"],
            ["F1", "f1"],
        ] as const).map(([metric, key]) => calculateMetricTest(
            modelLabel,
            metric,
            modelInputs.map((input) => input.promptAValues[key]),
            modelInputs.map((input) => input.promptBValues[key]),
            alpha
        ));

        const correctableTests = tests.filter((test) => test.pValue !== null);
        const correctedPValues = correctableTests.length > 0
            ? padjust(correctableTests.map((test) => test.pValue as number), "holm", 3)
            : [];
        let correctedIndex = 0;

        return tests.map((test) => {
            if (test.pValue === null) return test;
            const pValueCorrected = correctedPValues[correctedIndex++];
            return {
                ...test,
                pValueCorrected,
                significant: pValueCorrected < alpha,
            };
        });
    });
}