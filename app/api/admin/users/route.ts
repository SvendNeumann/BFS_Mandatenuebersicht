import { NextResponse } from "next/server";
import { createServiceClient, requireSuperAdmin } from "@/lib/server-auth";

type CreateUserBody = {
  email?: string;
  fullName?: string;
  role?: "super_admin" | "standortleitung" | "abrechnungsmanagement";
  active?: boolean;
  temporaryPassword?: string;
  standortIds?: string[];
};

type AdminUserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  active: boolean;
  must_change_password: boolean | null;
  user_standorte?: Array<{ standort_id: string }>;
};

type AuthUserLoginMeta = {
  id: string;
  lastSignInAt?: string | null;
};

export async function GET() {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY fehlt in der Server-Konfiguration." }, { status: 500 });

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, active, must_change_password, created_at, user_standorte(standort_id)")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const authUsersById = await loadAuthUserLoginMeta(supabase);
  return NextResponse.json({
    users: ((profiles ?? []) as AdminUserProfile[]).map((profile) => ({
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role,
      active: profile.active,
      mustChangePassword: Boolean(profile.must_change_password),
      lastLoginAt: authUsersById.get(profile.id)?.lastSignInAt ?? null,
      standortIds: (profile.user_standorte ?? []).map((entry: { standort_id: string }) => entry.standort_id)
    }))
  });
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null) as CreateUserBody | null;
  const email = body?.email?.trim().toLowerCase();
  const fullName = body?.fullName?.trim() ?? "";
  const role = body?.role;
  const password = body?.temporaryPassword ?? "";
  const active = body?.active ?? true;
  const standortIds = body?.standortIds ?? [];

  if (!email || !email.includes("@")) return NextResponse.json({ error: "Bitte eine gültige E-Mail angeben." }, { status: 400 });
  if (!isManageableRole(role)) return NextResponse.json({ error: "Bitte eine gültige Rolle wählen." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Das Passwort muss mindestens 8 Zeichen haben." }, { status: 400 });

  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY fehlt in der Server-Konfiguration." }, { status: 500 });

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });

  const existingMessage = createError?.message?.toLowerCase() ?? "";
  if (createError && !existingMessage.includes("already") && !existingMessage.includes("registered")) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  const userId = created.user?.id ?? await findUserIdByEmail(supabase, email);
  if (!userId) return NextResponse.json({ error: "Auth-Nutzer konnte nicht ermittelt werden." }, { status: 500 });

  if (!created.user) {
    const { error: updateAuthError } = await supabase.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });
    if (updateAuthError) return NextResponse.json({ error: updateAuthError.message }, { status: 500 });
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      email,
      full_name: fullName || null,
      role,
      active,
      must_change_password: false,
      created_by: auth.profile.id,
      temp_password_set_at: null
    }, { onConflict: "id" });

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
  await replaceStandortAssignments(supabase, userId, role, standortIds);

  return NextResponse.json({ ok: true, userId });
}

async function findUserIdByEmail(supabase: NonNullable<ReturnType<typeof createServiceClient>>, email: string) {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find((user) => user.email?.toLowerCase() === email)?.id;
}

async function loadAuthUserLoginMeta(supabase: NonNullable<ReturnType<typeof createServiceClient>>) {
  const usersById = new Map<string, AuthUserLoginMeta>();
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const user of data.users) {
      usersById.set(user.id, {
        id: user.id,
        lastSignInAt: user.last_sign_in_at ?? null
      });
    }
    if (data.users.length < 1000) break;
    page += 1;
  }

  return usersById;
}

async function replaceStandortAssignments(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  userId: string,
  role: NonNullable<CreateUserBody["role"]>,
  standortIds: string[]
) {
  await supabase.from("user_standorte").delete().eq("user_id", userId);
  if (role !== "standortleitung") return;
  const uniqueIds = Array.from(new Set(standortIds.filter(Boolean)));
  if (!uniqueIds.length) return;
  await supabase.from("user_standorte").insert(uniqueIds.map((standortId) => ({ user_id: userId, standort_id: standortId })));
}

function isManageableRole(role: string | undefined): role is NonNullable<CreateUserBody["role"]> {
  return role === "super_admin" || role === "standortleitung" || role === "abrechnungsmanagement";
}
