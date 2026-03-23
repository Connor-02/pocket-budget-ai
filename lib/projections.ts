export type ProjectionInput = {
  monthIncomePlan: number;
  savingsGoal: number;
  fixedCostsPlan: number;
  actualIncome: number;
  actualExpenses: number;
  now: Date;
};

function getMonthBounds(now: Date) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

export function buildProjection(input: ProjectionInput) {
  const { now, monthIncomePlan, savingsGoal, fixedCostsPlan, actualIncome, actualExpenses } = input;
  const { start, end } = getMonthBounds(now);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysInMonth = Math.max(1, Math.round((end.getTime() - start.getTime()) / msPerDay));
  const dayOfMonth = now.getUTCDate();
  const daysElapsed = Math.min(daysInMonth, Math.max(1, dayOfMonth));
  const daysRemaining = Math.max(1, daysInMonth - dayOfMonth + 1);

  const plannedSpendable = Math.max(monthIncomePlan - savingsGoal, 0);
  const remainingThisMonth = monthIncomePlan - actualExpenses - savingsGoal;
  const budgetUsedPercentage =
    plannedSpendable > 0 ? (actualExpenses / plannedSpendable) * 100 : 0;
  const monthlyBurnRate = actualExpenses / daysElapsed;
  const projectedEndOfMonth = monthlyBurnRate * daysInMonth;
  const safeToSpendToday = Math.max(remainingThisMonth / daysRemaining, 0);

  const expectedIncomeToDate = (monthIncomePlan / daysInMonth) * daysElapsed;
  const onTrackForIncome = actualIncome >= expectedIncomeToDate * 0.9;
  const fixedPressure = fixedCostsPlan > 0 ? (fixedCostsPlan / Math.max(monthIncomePlan, 1)) * 100 : 0;

  let monthlyStatus: "on_track" | "at_risk" | "critical" = "on_track";
  if (budgetUsedPercentage > 100 || projectedEndOfMonth > plannedSpendable * 1.05) {
    monthlyStatus = "critical";
  } else if (budgetUsedPercentage > 85 || !onTrackForIncome || fixedPressure > 70) {
    monthlyStatus = "at_risk";
  }

  return {
    daysInMonth,
    daysElapsed,
    daysRemaining,
    plannedSpendable,
    remainingThisMonth,
    budgetUsedPercentage,
    projectedEndOfMonth,
    monthlyBurnRate,
    safeToSpendToday,
    monthlyStatus,
  };
}
