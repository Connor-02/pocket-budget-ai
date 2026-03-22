import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const profile = await prisma.budgetProfile.findFirst({
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
        const body = await req.json();

        const profile = await prisma.budgetProfile.findFirst({
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