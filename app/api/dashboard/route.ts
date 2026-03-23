import { NextResponse } from "next/server";
import { getLatestBudgetDashboardForUser } from "@/lib/dashboard-data";
import { getAuthenticatedUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
    const user = await getAuthenticatedUserFromRequest(req);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dashboard = await getLatestBudgetDashboardForUser(user.id);

    if (!dashboard) {
        return NextResponse.json({ error: "No budget profile found" }, { status: 404 });
    }

    return NextResponse.json(dashboard);
}
