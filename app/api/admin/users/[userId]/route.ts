import { NextResponse } from "next/server";
import { createServiceClient, requireSuperAdmin } from "@/lib/server-auth";

type UpdateUserBody = {
  fullName?: string;
  role?: "super_admin" | "standortleitung" | "abrechnungsmanagement";
  active?: boolean;
  temporaryPassword?: string;
  standortIds?: string[];
};

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { userId } = await context.params;
  const body = await request.json().catch(() => null) as UpdateUserBody | null;
  if (!body) return NextResponse.json({ error: "Keine Nutzerdaten übermittelt." }, { status: 400 });

  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY fehlt in der Server-Konfiguration." }, { status: 500 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.fullName === "string") patch.full_name = body.fullName.trim() || null;
  if (isManageableRole(body.role)) patch.role = body.role;
  if (typeof body.active === "boolean") patch.active = body.active;
  if (body.temporaryPassword) {
    if (body.temporaryPassword.length < 8) return NextResponse.json({ error: "Das Passwort muss mindestens 8 Zeichen haben." }, { status: 400 });
    const { error: passwordError } = await supabase.auth.admin.updateUserById(userId, { password: body.temporaryPassword });
    if (passwordError) return NextResponse.json({ error: passwordError.message }, { status: 500 });
    patch.must_change_password = false;
    patch.temp_password_set_at = null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select("id, role")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const nextRole = (body.role ?? profile.role) as NonNullable<UpdateUserBody["role"]>;
  if (Array.isArray(body.standortIds) || nextRole !== "standortleitung") {
    await replaceStandortAssignments(supabase, userId, nextRole, body.standortIds ?? []);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: { params: Promise<{ userId: string }> }) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { userId } = await context.params;
  if (!userId) return NextResponse.json({ error: "Nutzer-ID fehlt." }, { status: 400 });
  if (userId === auth.profile.id) {
    return NextResponse.json({ error: "Der aktuell angemeldete Admin kann sich nicht selbst löschen." }, { status: 400 });
  }

  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY fehlt in der Server-Konfiguration." }, { status: 500 });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
  if (profile?.role === "super_admin") {
    return NextResponse.json({ error: "Admin-Konten können nicht gelöscht werden." }, { status: 400 });
  }

  const { error: assignmentError } = await supabase.from("user_standorte").delete().eq("user_id", userId);
  if (assignmentError) return NextResponse.json({ error: assignmentError.message }, { status: 500 });

  const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
  if (deleteAuthError) return NextResponse.json({ error: deleteAuthError.message }, { status: 500 });

  await supabase.from("profiles").delete().eq("id", userId);
  return NextResponse.json({ ok: true });
}

async function replaceStandortAssignments(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  userId: string,
  role: NonNullable<UpdateUserBody["role"]>,
  standortIds: string[]
) {
  await supabase.from("user_standorte").delete().eq("user_id", userId);
  if (role !== "standortleitung") return;
  const uniqueIds = Array.from(new Set(standortIds.filter(Boolean)));
  if (!uniqueIds.length) return;
  await supabase.from("user_standorte").insert(uniqueIds.map((standortId) => ({ user_id: userId, standort_id: standortId })));
}

function isManageableRole(role: string | undefined): role is NonNullable<UpdateUserBody["role"]> {
  return role === "super_admin" || role === "standortleitung" || role === "abrechnungsmanagement";
}
