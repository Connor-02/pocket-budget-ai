import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { getAuthenticatedUserFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const user = await getAuthenticatedUserFromRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { prompt, dashboardContext } = await req.json();

        const response = await openai.responses.create({
            model: "gpt-5.4",
            instructions: `
You are a budgeting dashboard assistant.
Convert the user's chart request into a valid JSON object.

Allowed targetChart:
- spendingByCategory
- incomeVsExpenses
- savingsMargin

Allowed chartType:
- bar
- line
- pie
- area

Return only JSON with:
{
  "action": "create_chart" | "update_chart",
  "targetChart": "...",
  "changes": {
    "chartType": "...",
    "title": "...",
    "metric": "income" | "expenses" | "margin" | "savings",
    "groupBy": "category" | "month" | "type",
    "includeCategories": [],
    "highlightOverspend": true
  }
}
      `,
            input: JSON.stringify({
                prompt,
                dashboardContext,
            }),
        });

        return NextResponse.json({
            text: response.output_text,
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Failed to generate chart instructions" },
            { status: 500 }
        );
    }
}
