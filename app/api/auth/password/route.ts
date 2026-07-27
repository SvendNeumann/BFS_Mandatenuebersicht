import { NextResponse } from "next/server";
import { createServiceClient, getRequestProfile } from "@/lib/server-auth";

type PasswordBody = {
  password?: string;
};

export async function POST(request: Request) {
  const auth = await getRequestProfile();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null) as PasswordBody | null;
  const password = body?.password ?? "";
  if (password.length < 8) {
    return NextResponse.json({ error: "Das neue Passwort muss mindestens 8 Zeichen haben." }, { status: 400 });
  }

  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY fehlt in der Server-Konfiguration." }, { status: 500 });

  const { error: passwordError } = await supabase.auth.admin.updateUserById(auth.profile.id, { password });
  if (passwordError) return NextResponse.json({ error: passwordError.message }, { status: 500 });

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      must_change_password: false,
      temp_password_set_at: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", auth.profile.id);

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
