import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const user = await getAuthenticatedUserFromRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const profile = await prisma.budgetProfile.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
        });

        if (!profile) {
            return NextResponse.json(
                { error: "No budget profile found" },
                { status: 404 }
            );
        }

        const transactions = await prisma.transaction.findMany({
            where: {
                budgetProfileId: profile.id,
            },
            orderBy: {
                date: "desc",
            },
        });

        return NextResponse.json({ transactions });
    } catch (error) {
        console.error("GET TRANSACTIONS ERROR:", error);
        return NextResponse.json(
            { error: "Failed to fetch transactions" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const user = await getAuthenticatedUserFromRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        const profile = await prisma.budgetProfile.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
        });

        if (!profile) {
            return NextResponse.json(
                { error: "No budget profile found" },
                { status: 404 }
            );
        }

        const transaction = await prisma.transaction.create({
            data: {
                budgetProfileId: profile.id,
                date: new Date(body.date),
                amount: Number(body.amount),
                type: body.type,
                category: body.category,
                title: body.title?.trim() || null,
                note: body.note || null,
            },
        });

        return NextResponse.json(transaction);
    } catch (error) {
        console.error("POST TRANSACTIONS ERROR:", error);
        return NextResponse.json(
            { error: "Failed to create transaction" },
            { status: 500 }
        );
    }
}
