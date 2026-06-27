import { createHmac, timingSafeEqual } from "node:crypto";

export const appSessionCookie = "orisus_bfs_app_session";

const sessionVersion = 1;

export type AppSessionPayload = {
  v: number;
  userId: string;
  email: string;
  exp: number;
};

export function createAppSession(payload: Omit<AppSessionPayload, "v">) {
  const body = Buffer.from(JSON.stringify({ ...payload, v: sessionVersion })).toString("base64url");
  const signature = sign(body);
  return `${body}.${signature}`;
}

export function verifyAppSession(value: string | undefined) {
  if (!value) return null;
  const [body, signature] = value.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  if (!safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AppSessionPayload;
    if (payload.v !== sessionVersion || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function sign(value: string) {
  return createHmac("sha256", appSessionSecret()).update(value).digest("base64url");
}

function appSessionSecret() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "orisus-local-dev-session-secret";
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
