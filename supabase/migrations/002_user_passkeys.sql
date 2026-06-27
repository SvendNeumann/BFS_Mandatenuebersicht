create table public.user_passkeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  counter bigint default 0,
  device_name text,
  created_at timestamptz default now(),
  last_used_at timestamptz
);

create index idx_user_passkeys_user on public.user_passkeys(user_id);

alter table public.user_passkeys enable row level security;

create policy "passkeys owner select" on public.user_passkeys for select to authenticated
using (user_id = (select auth.uid()));

create policy "passkeys owner insert" on public.user_passkeys for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "passkeys owner update" on public.user_passkeys for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "passkeys owner delete" on public.user_passkeys for delete to authenticated
using (user_id = (select auth.uid()));
