import { NextResponse } from "next/server";
import { z } from "zod";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { requireLatestBudgetProfile } from "@/lib/dashboard-data";
import { transactionCreateSchema } from "@/lib/transactions";

const requestSchema = z.object({
    input: z.string().trim().min(1).max(500),
    timezone: z.string().trim().min(1).max(100).optional(),
});

const aiTransactionSchema = z.object({
    amount: z.coerce.number().positive(),
    type: z.enum(["income", "expense"]),
    category: z.string().trim().min(1).max(60),
    note: z.string().trim().max(240).optional().default(""),
    date: z.string().trim().optional(),
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
        const body = requestSchema.safeParse(await req.json());
        if (!body.success) {
            return NextResponse.json(
                { error: body.error.issues.map((issue) => issue.message).join(", ") },
                { status: 400 }
            );
        }

        const today = new Date().toISOString().slice(0, 10);
        const timezone = body.data.timezone ?? "Australia/Sydney";

        const aiResponse = await openai.responses.create({
            model: "gpt-5.4",
            instructions: `
You convert a budgeting voice/text statement into ONE transaction object.
Return ONLY a JSON object with:
{
  "amount": number,
  "type": "income" | "expense",
  "category": string,
  "note": string,
  "date": "YYYY-MM-DD"
}

Rules:
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
        const parsed = aiTransactionSchema.safeParse(rawParsed);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Could not understand that transaction. Try a clearer sentence.",
                },
                { status: 400 }
            );
        }

        const transactionInput = transactionCreateSchema.safeParse({
            date: parsed.data.date || today,
            amount: parsed.data.amount,
            type: parsed.data.type,
            category: parsed.data.category,
            note: parsed.data.note,
        });

        if (!transactionInput.success) {
            return NextResponse.json(
                {
                    error: "AI output was invalid for transaction creation.",
                },
                { status: 400 }
            );
        }

        const profile = await requireLatestBudgetProfile();
        const transaction = await prisma.transaction.create({
            data: {
                budgetProfileId: profile.id,
                date: new Date(transactionInput.data.date),
                amount: transactionInput.data.amount,
                type: transactionInput.data.type,
                category: transactionInput.data.category,
                note: transactionInput.data.note || null,
            },
        });

        return NextResponse.json({
            transaction,
            parsed: transactionInput.data,
        });
    } catch (error) {
        console.error("AI TRANSACTION ROUTE ERROR:", error);
        return NextResponse.json(
            { error: "Failed to create transaction from AI input" },
            { status: 500 }
        );
    }
}
