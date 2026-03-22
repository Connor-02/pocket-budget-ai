import { z } from "zod";

export const ChartInstructionSchema = z.object({
    action: z.enum(["create_chart", "update_chart"]),
    targetChart: z.enum([
        "spendingByCategory",
        "incomeVsExpenses",
        "savingsMargin",
    ]),
    changes: z.object({
        chartType: z.enum(["bar", "line", "pie", "area"]),
        title: z.string(),
        metric: z.enum(["income", "expenses", "margin", "savings"]),
        groupBy: z.enum(["category", "month", "type"]),
        includeCategories: z.array(z.string()).optional(),
        highlightOverspend: z.boolean().optional(),
    }),
});

export type ChartInstruction = z.infer<typeof ChartInstructionSchema>;