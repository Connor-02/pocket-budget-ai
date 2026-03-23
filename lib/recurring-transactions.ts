import "server-only";
import { prisma } from "@/lib/prisma";

function normalizeDate(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  const originalDay = next.getUTCDate();
  next.setUTCMonth(next.getUTCMonth() + months, 1);
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(originalDay, lastDay));
  return normalizeDate(next);
}

function computeNextRunDate(current: Date, cadence: string) {
  if (cadence.toUpperCase() === "WEEKLY") {
    return normalizeDate(new Date(current.getTime() + 1000 * 60 * 60 * 24 * 7));
  }

  return addMonths(current, 1);
}

export async function applyDueRecurringTransactions(budgetProfileId: string) {
  const today = normalizeDate(new Date());
  const due = await prisma.recurringTransaction.findMany({
    where: {
      budgetProfileId,
      isActive: true,
      nextRunDate: {
        lte: today,
      },
    },
    orderBy: {
      nextRunDate: "asc",
    },
  });

  for (const item of due) {
    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          budgetProfileId,
          date: item.nextRunDate,
          amount: item.amount,
          type: item.type,
          category: item.category,
          note: item.note || `Recurring: ${item.name}`,
        },
      }),
      prisma.recurringTransaction.update({
        where: { id: item.id },
        data: {
          lastAppliedAt: today,
          nextRunDate: computeNextRunDate(item.nextRunDate, item.cadence),
        },
      }),
    ]);
  }
}

export async function getUpcomingBills(budgetProfileId: string) {
  const today = normalizeDate(new Date());
  return prisma.recurringTransaction.findMany({
    where: {
      budgetProfileId,
      isActive: true,
      type: { equals: "expense", mode: "insensitive" },
      nextRunDate: { gte: today },
    },
    orderBy: [{ nextRunDate: "asc" }, { amount: "desc" }],
    take: 10,
  });
}
