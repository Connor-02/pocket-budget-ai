import { NextResponse } from "next/server";
import { getLatestBudgetDashboard } from "@/lib/dashboard-data";

export async function GET() {
    const dashboard = await getLatestBudgetDashboard();

    if (!dashboard) {
        return NextResponse.json({ error: "No budget profile found" }, { status: 404 });
    }

    return NextResponse.json(dashboard);
}
