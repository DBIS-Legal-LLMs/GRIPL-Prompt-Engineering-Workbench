/**
 * Escapes special characters for safe use in LaTeX text mode.
 *
 * @param value Value to escape.
 * @returns The escaped LaTeX-safe text.
 */
export function escapeLatex(value: unknown): string {
    return String(value ?? "-").replace(/[\\{}%$&#_^~]/g, (character) => {
        switch (character) {
            case "\\": return "\\textbackslash{}";
            case "{": return "\\{";
            case "}": return "\\}";
            case "~": return "\\textasciitilde{}";
            case "^": return "\\textasciicircum{}";
            default: return `\\${character}`;
        }
    });
}

/**
 * Formats a finite number with a fixed number of decimal places.
 *
 * @param value Number to format.
 * @param digits Number of decimal places.
 * @returns The formatted number or `-` for missing or non-finite values.
 */
export function formatLatexNumber(value: number | null | undefined, digits = 3): string {
    return value === null || value === undefined || !Number.isFinite(value)
        ? "-"
        : value.toFixed(digits);
}

/**
 * Formats a number as an inline LaTeX math expression.
 *
 * @param value Number to format.
 * @param digits Number of decimal places.
 * @returns The number wrapped in `$...$` or `$-$` for missing values.
 */
export function formatLatexMathNumber(value: number | null | undefined, digits = 3): string {
    return `$${formatLatexNumber(value, digits)}$`;
}

/**
 * Downloads LaTeX content as a `.tex` file in the browser.
 *
 * @param content LaTeX source to download.
 * @param filename Name of the downloaded file.
 */
export function downloadLatexTable(content: string, filename: string): void {
    const blob = new Blob([content], { type: "application/x-tex;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * Creates an embeddable LaTeX table using `tabularx` and `booktabs`.
 *
 * Header fragments and row strings are expected to contain already formatted
 * LaTeX where necessary; captions and labels are escaped automatically.
 *
 * @param caption Table caption.
 * @param label LaTeX table label used for references.
 * @param columns LaTeX column specification.
 * @param header Header row, or an empty string for a table without headers.
 * @param rows Table body rows.
 * @param captionPosition Whether to place the caption above or below the table.
 * @returns The complete embeddable LaTeX table source.
 */
export function createLatexTable(
    caption: string,
    label: string,
    columns: string,
    header: string,
    rows: string[],
    captionPosition: "top" | "bottom" = "bottom",
): string {
    const captionMarkup = `\\caption{${escapeLatex(caption)}}\n    \\label{${escapeLatex(label)}}`;
    const headerMarkup = header
        ? `\\toprule\n        ${header} \\\\\n        \\midrule`
        : "\\toprule";
    const bottomCaptionMarkup = captionPosition === "bottom"
        ? `\\caption{${escapeLatex(caption)}}\n    \\label{${escapeLatex(label)}}`
        : "";
    const topCaptionMarkup = captionPosition === "top" ? `    ${captionMarkup}\n` : "";

    return `% Requires \\usepackage{array,booktabs,tabularx}
\\begin{table}[htbp]
    \\centering
${topCaptionMarkup}    \\small
    \\setlength{\\tabcolsep}{4pt}
    \\begin{tabularx}{\\linewidth}{${columns}}
        ${headerMarkup}
        ${rows.join(" \\\\\n        ")}
        \\\\
        \\bottomrule
    \\end{tabularx}
    ${bottomCaptionMarkup}
\\end{table}
`;
}
