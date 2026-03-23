import { NextResponse } from "next/server";
import { z } from "zod";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { requireLatestBudgetProfileForUser } from "@/lib/dashboard-data";
import { transactionCreateSchema } from "@/lib/transactions";
import { getAuthenticatedUserFromRequest } from "@/lib/auth";

const requestSchema = z.object({
    input: z.string().trim().min(1).max(500),
    timezone: z.string().trim().min(1).max(100).optional(),
    confirm: z.boolean().optional(),
    transactions: z.array(
        z.object({
            amount: z.coerce.number().positive(),
            type: z.enum(["income", "expense"]),
            category: z.string().trim().min(1).max(60),
            note: z.string().trim().max(240).optional().default(""),
            date: z.string().trim().optional(),
        })
    ).optional(),
});

const aiTransactionSchema = z.object({
    amount: z.coerce.number().positive(),
    type: z.enum(["income", "expense"]),
    category: z.string().trim().min(1).max(60),
    note: z.string().trim().max(240).optional().default(""),
    date: z.string().trim().optional(),
});

const aiTransactionListSchema = z.object({
    transactions: z.array(aiTransactionSchema).min(1).max(8),
});

function parseAiJson(text: string) {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
        throw new Error("No valid JSON object found in AI response.");
    }

    return JSON.parse(text.slice(firstBrace, lastBrace + 1));
}

export async function POST(req: Request) {
    try {
        const user = await getAuthenticatedUserFromRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = requestSchema.safeParse(await req.json());
        if (!body.success) {
            return NextResponse.json(
                { error: body.error.issues.map((issue) => issue.message).join(", ") },
                { status: 400 }
            );
        }

        const today = new Date().toISOString().slice(0, 10);
        const timezone = body.data.timezone ?? "Australia/Sydney";

        const profile = await requireLatestBudgetProfileForUser(user.id);

        if (body.data.confirm && body.data.transactions?.length) {
            const validated = body.data.transactions
                .map((item) =>
                    transactionCreateSchema.safeParse({
                        date: item.date || today,
                        amount: item.amount,
                        type: item.type,
                        category: item.category,
                        note: item.note || "",
                    })
                );

            if (validated.some((item) => !item.success)) {
                return NextResponse.json(
                    { error: "One or more transactions are invalid." },
                    { status: 400 }
                );
            }

            const txData = validated
                .filter((item): item is Extract<typeof item, { success: true }> => item.success)
                .map((item) => ({
                    budgetProfileId: profile.id,
                    date: new Date(item.data.date),
                    amount: item.data.amount,
                    type: item.data.type,
                    category: item.data.category,
                    note: item.data.note || null,
                }));

            await prisma.transaction.createMany({
                data: txData,
            });

            return NextResponse.json({
                createdCount: txData.length,
                transactions: txData,
            });
        }

        const aiResponse = await openai.responses.create({
            model: "gpt-5.4",
            instructions: `
You convert a budgeting voice/text statement into one or more transaction objects.
Return ONLY JSON in this shape:
{
  "transactions": [
    {
      "amount": number,
      "type": "income" | "expense",
      "category": string,
      "note": string,
      "date": "YYYY-MM-DD"
    }
  ]
}

Rules:
- Split into multiple transactions when input clearly includes more than one purchase/income.
- If the user says "spent", "paid", "bought", it is "expense".
- If the user says "earned", "got paid", "received", it is "income".
- Keep amount positive.
- Use short, clean category names.
- If date is missing, use today's date from context.
- Keep note concise and useful.
            `,
            input: JSON.stringify({
                userInput: body.data.input,
                today,
                timezone,
            }),
        });

        const rawParsed = parseAiJson(aiResponse.output_text || "{}");
        const parsed = aiTransactionListSchema.safeParse(rawParsed);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Could not understand that transaction request. Try a clearer sentence.",
                },
                { status: 400 }
            );
        }

        const normalized = parsed.data.transactions.map((item) => ({
            amount: Number(item.amount),
            type: item.type,
            category: item.category,
            note: item.note || "",
            date: item.date || today,
        }));

        return NextResponse.json({
            requiresConfirmation: true,
            transactions: normalized,
        });
    } catch (error) {
        console.error("AI TRANSACTION ROUTE ERROR:", error);
        return NextResponse.json(
            { error: "Failed to create transaction from AI input" },
            { status: 500 }
        );
    }
}
