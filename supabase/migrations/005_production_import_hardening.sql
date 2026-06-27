create table if not exists public.standort_mandanten (
  id uuid primary key default gen_random_uuid(),
  standort_id uuid not null references public.standorte(id) on delete cascade,
  mandant_nr text not null,
  label text,
  active boolean not null default true,
  created_at timestamptz default now(),
  unique (mandant_nr)
);

alter table public.standort_mandanten enable row level security;

create policy "standort mandanten select by location" on public.standort_mandanten for select to authenticated
using (public.can_access_standort(standort_id));

create policy "standort mandanten admin write" on public.standort_mandanten for all to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

insert into public.standort_mandanten (standort_id, mandant_nr, label)
values
  ('00000000-0000-0000-0000-000000000004', '18504', 'Kirchberg Hauptkonto'),
  ('00000000-0000-0000-0000-000000000004', '21988', 'Kirchberg Aligner'),
  ('00000000-0000-0000-0000-000000000005', '18790', 'Essen Hauptkonto'),
  ('00000000-0000-0000-0000-000000000005', '19220', 'Essen Aligner RP 24'),
  ('00000000-0000-0000-0000-000000000005', '19221', 'Essen Aligner RP 36'),
  ('00000000-0000-0000-0000-000000000005', '22341', 'Essen weiteres Konto'),
  ('00000000-0000-0000-0000-000000000002', '19092', 'Kehl Hauptkonto'),
  ('00000000-0000-0000-0000-000000000002', '20411', 'Kehl Aligner'),
  ('00000000-0000-0000-0000-000000000001', '19260', 'Ulmet Hauptkonto'),
  ('00000000-0000-0000-0000-000000000001', '19668', 'Ulmet Aligner RP 24'),
  ('00000000-0000-0000-0000-000000000001', '19669', 'Ulmet Aligner RP 36'),
  ('00000000-0000-0000-0000-000000000006', '19804', 'Hüttenberg Hauptkonto'),
  ('00000000-0000-0000-0000-000000000006', '22674', 'Hüttenberg Aligner'),
  ('00000000-0000-0000-0000-000000000003', '20309', 'Kassel Hauptkonto'),
  ('00000000-0000-0000-0000-000000000003', '20902', 'Kassel / Spohr')
on conflict (mandant_nr) do update set
  standort_id = excluded.standort_id,
  label = excluded.label,
  active = true;

create table if not exists public.import_events (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.bfs_import_batches(id) on delete cascade,
  document_id uuid references public.bfs_documents(id) on delete cascade,
  user_id uuid references public.profiles(id),
  event_type text not null,
  severity text not null default 'info' check (severity in ('info','warning','error')),
  message text not null,
  details jsonb,
  created_at timestamptz default now()
);

alter table public.import_events enable row level security;

create policy "import events select by batch admin" on public.import_events for select to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1
    from public.bfs_documents d
    where d.id = import_events.document_id
      and public.can_access_standort(d.standort_id)
  )
);

create policy "import events admin insert" on public.import_events for insert to authenticated
with check (public.is_super_admin() or user_id = (select auth.uid()));

alter table public.bfs_documents
  add column if not exists retention_delete_after date,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id),
  add column if not exists deletion_reason text;

create policy "private bfs documents admin delete" on storage.objects for delete to authenticated
using (bucket_id = 'bfs-documents' and public.is_super_admin());

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, active)
  values (
    new.id,
    lower(new.email),
    case when lower(new.email) = 'svend.neumann@orisus.de' then 'super_admin' else 'standortleitung' end,
    case when lower(new.email) = 'svend.neumann@orisus.de' then true else false end
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();
  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user();
