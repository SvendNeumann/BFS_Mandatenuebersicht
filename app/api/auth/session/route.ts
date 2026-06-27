import { NextResponse } from "next/server";
import { appSessionCookie } from "@/lib/app-session";

const accessCookie = "orisus_bfs_access_token";
const refreshCookie = "orisus_bfs_refresh_token";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    remember?: boolean;
  } | null;

  if (!body?.accessToken || !body.refreshToken) {
    return NextResponse.json({ error: "Session tokens fehlen." }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  const maxAge = body.remember
    ? 60 * 60 * 24 * 30
    : Math.max(60, (body.expiresAt ?? Math.floor(Date.now() / 1000) + 60 * 60) - Math.floor(Date.now() / 1000));

  response.cookies.set(accessCookie, body.accessToken, sessionCookieOptions(maxAge));
  response.cookies.set(refreshCookie, body.refreshToken, sessionCookieOptions(body.remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7));
  response.cookies.set(appSessionCookie, "", sessionCookieOptions(0));
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(accessCookie, "", sessionCookieOptions(0));
  response.cookies.set(refreshCookie, "", sessionCookieOptions(0));
  response.cookies.set(appSessionCookie, "", sessionCookieOptions(0));
  return response;
}

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge
  };
}
