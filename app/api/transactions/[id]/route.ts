import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserFromRequest } from "@/lib/auth";

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export async function DELETE(_: Request, { params }: Params) {
    try {
        const user = await getAuthenticatedUserFromRequest(_);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        await prisma.transaction.deleteMany({
            where: {
                id,
                budgetProfile: {
                    userId: user.id,
                },
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE TRANSACTION ERROR:", error);
        return NextResponse.json(
            { error: "Failed to delete transaction" },
            { status: 500 }
        );
    }
}

export async function PUT(req: Request, { params }: Params) {
    try {
        const user = await getAuthenticatedUserFromRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();

        const existing = await prisma.transaction.findFirst({
            where: {
                id,
                budgetProfile: {
                    userId: user.id,
                },
            },
            select: { id: true },
        });

        if (!existing) {
            return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
        }

        const updated = await prisma.transaction.update({
            where: { id },
            data: {
                date: body.date ? new Date(body.date) : undefined,
                amount: body.amount !== undefined ? Number(body.amount) : undefined,
                category: body.category !== undefined ? String(body.category) : undefined,
                title: body.title !== undefined ? String(body.title).trim() || null : undefined,
                note: body.note !== undefined ? String(body.note).trim() || null : undefined,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("PUT TRANSACTION ERROR:", error);
        return NextResponse.json(
            { error: "Failed to update transaction" },
            { status: 500 }
        );
    }
}
