import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword, SESSION_COOKIE_NAME } from "@/lib/auth";

const signupSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8),
  displayName: z.string().trim().min(1).max(80).optional(),
});

export async function POST(req: Request) {
  try {
    const parsed = signupSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid signup details" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        passwordHash: hashPassword(parsed.data.password),
        displayName: parsed.data.displayName || null,
      },
    });

    const { rawToken, expiresAt } = await createSession(user.id);
    const response = NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
    response.cookies.set(SESSION_COOKIE_NAME, rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });
    return response;
  } catch (error) {
    console.error("SIGNUP ERROR:", error);
    return NextResponse.json({ error: "Failed to sign up" }, { status: 500 });
  }
}
