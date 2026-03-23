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
