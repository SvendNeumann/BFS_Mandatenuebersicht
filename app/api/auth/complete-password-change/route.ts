import { NextResponse } from "next/server";
import { createServiceClient, getRequestProfile } from "@/lib/server-auth";

export async function POST() {
  const auth = await getRequestProfile();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY fehlt in der Server-Konfiguration." }, { status: 500 });

  const { error } = await supabase
    .from("profiles")
    .update({
      must_change_password: false,
      temp_password_set_at: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", auth.profile.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
