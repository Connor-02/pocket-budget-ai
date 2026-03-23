import { NextResponse } from "next/server";
import { deleteSessionByRawToken, SESSION_COOKIE_NAME } from "@/lib/auth";

function readToken(cookieHeader: string | null) {
  if (!cookieHeader) return null;
  const part = cookieHeader
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${SESSION_COOKIE_NAME}=`));
  return part ? decodeURIComponent(part.split("=")[1] ?? "") : null;
}

export async function POST(req: Request) {
  try {
    const rawToken = readToken(req.headers.get("cookie"));
    if (rawToken) {
      await deleteSessionByRawToken(rawToken);
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });
    return response;
  } catch (error) {
    console.error("SIGNOUT ERROR:", error);
    return NextResponse.json({ error: "Failed to sign out" }, { status: 500 });
  }
}
