import { NextResponse } from "next/server";
import { getAuthenticatedUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await getAuthenticatedUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    },
  });
}
