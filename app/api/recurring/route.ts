import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireLatestBudgetProfile } from "@/lib/dashboard-data";

const recurringSchema = z.object({
  name: z.string().trim().min(1).max(80),
  amount: z.coerce.number().positive(),
  type: z.enum(["income", "expense"]),
  category: z.string().trim().min(1).max(60),
  note: z.string().trim().max(240).optional(),
  cadence: z.enum(["WEEKLY", "MONTHLY"]),
  nextRunDate: z.string().min(1),
  dayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
  weekday: z.coerce.number().int().min(0).max(6).optional(),
});

export async function GET() {
  try {
    const profile = await requireLatestBudgetProfile();
    const recurring = await prisma.recurringTransaction.findMany({
      where: { budgetProfileId: profile.id },
      orderBy: [{ nextRunDate: "asc" }, { amount: "desc" }],
    });

    return NextResponse.json({ recurring });
  } catch (error) {
    console.error("GET RECURRING ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch recurring transactions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const parsed = recurringSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    const profile = await requireLatestBudgetProfile();

    const created = await prisma.recurringTransaction.create({
      data: {
        budgetProfileId: profile.id,
        name: parsed.data.name,
        amount: parsed.data.amount,
        type: parsed.data.type,
        category: parsed.data.category,
        note: parsed.data.note || null,
        cadence: parsed.data.cadence,
        nextRunDate: new Date(parsed.data.nextRunDate),
        dayOfMonth: parsed.data.dayOfMonth ?? null,
        weekday: parsed.data.weekday ?? null,
      },
    });

    return NextResponse.json(created);
  } catch (error) {
    console.error("POST RECURRING ERROR:", error);
    return NextResponse.json({ error: "Failed to create recurring transaction" }, { status: 500 });
  }
}
