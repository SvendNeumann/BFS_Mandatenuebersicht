create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null check (role in ('super_admin', 'standortleitung')),
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.standorte (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  praxisname text,
  bfs_mandant_nr text unique,
  adresse text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.user_standorte (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  standort_id uuid references public.standorte(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, standort_id)
);

create table public.bfs_import_batches (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid references public.profiles(id),
  import_month date,
  status text check (status in ('draft','processing','preview_ready','completed','failed','partially_completed')),
  total_files int default 0,
  successful_files int default 0,
  failed_files int default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.bfs_documents (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.bfs_import_batches(id) on delete set null,
  standort_id uuid references public.standorte(id),
  storage_path text not null,
  original_filename text not null,
  file_hash text not null,
  file_size_bytes bigint,
  mime_type text,
  bfs_mandant_nr text,
  mandant_name text,
  praxis_adresse text,
  abrechnung_nr text,
  abrechnung_datum date,
  kontoauszug_nr text,
  status text check (status in ('uploaded','parsed','preview','imported','duplicate','error','archived','deletion_candidate','deleted')),
  parse_error text,
  extracted_json jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (file_hash),
  unique (bfs_mandant_nr, abrechnung_nr, abrechnung_datum, standort_id)
);

create table public.bfs_abrechnungen (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.bfs_documents(id) on delete restrict,
  standort_id uuid references public.standorte(id) on delete restrict,
  mandant_nr text,
  mandant_name text,
  abrechnung_nr text not null,
  abrechnung_datum date,
  anzahl_forderungen int,
  forderungen_brutto numeric(12,2),
  gebuehr_netto numeric(12,2),
  gebuehr_mwst numeric(12,2),
  gebuehr_summe numeric(12,2),
  umsatz_netto numeric(12,2),
  auszahlung numeric(12,2),
  kontoauszug_nr text,
  kontostand_neu numeric(12,2),
  created_at timestamptz default now()
);

create table public.bfs_forderungen (
  id uuid primary key default gen_random_uuid(),
  standort_id uuid references public.standorte(id) on delete restrict,
  abrechnung_id uuid references public.bfs_abrechnungen(id) on delete restrict,
  document_id uuid references public.bfs_documents(id) on delete restrict,
  patient_name text not null,
  rechnungsnummer text,
  bfs_nr text,
  betrag numeric(12,2) not null,
  ausfallschutz_status text check (ausfallschutz_status in ('mit_ausfallschutz','ohne_ausfallschutz','unbekannt')) default 'unbekannt',
  kennzeichen text,
  current_status text,
  created_at timestamptz default now()
);

create table public.bfs_bewegungen (
  id uuid primary key default gen_random_uuid(),
  standort_id uuid references public.standorte(id) on delete restrict,
  abrechnung_id uuid references public.bfs_abrechnungen(id) on delete restrict,
  document_id uuid references public.bfs_documents(id) on delete restrict,
  patient_name text,
  rechnungsnummer text,
  bfs_nr text,
  bewegung_datum date,
  bewegung_typ text not null,
  soll_betrag numeric(12,2),
  haben_betrag numeric(12,2),
  betrag numeric(12,2),
  bemerkung text,
  raw_text text,
  created_at timestamptz default now()
);

create table public.bfs_cases (
  id uuid primary key default gen_random_uuid(),
  standort_id uuid references public.standorte(id) on delete restrict,
  forderung_id uuid references public.bfs_forderungen(id) on delete set null,
  bewegung_id uuid references public.bfs_bewegungen(id) on delete set null,
  document_id uuid references public.bfs_documents(id) on delete restrict,
  case_type text not null check (case_type in ('rueckbelastung','fehlerhafte_rechnung','storno_praxis','direktzahler_pruefen','neueinreichung_vorschlag','sonstiges')),
  status text not null check (status in ('offen','in_klaerung','wiedervorlage','erledigt_manuell','erledigt_automatisch','archiviert')) default 'offen',
  patient_name text not null,
  rechnungsnummer text,
  bfs_nr text,
  amount numeric(12,2),
  opened_at timestamptz default now(),
  due_date date,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id),
  resolution_reason text check (resolution_reason is null or resolution_reason in ('neu_eingereicht','direktzahlung_patient','intern_mit_zentrale_geklaert','rechnung_wird_nicht_weiterverfolgt','ausbuchung_empfohlen','sonstiges')),
  resolution_comment text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint manual_resolution_requires_reason check (
    status <> 'erledigt_manuell'
    or (resolution_reason is not null and length(trim(resolution_comment)) > 0)
  ),
  constraint other_resolution_requires_comment check (
    resolution_reason <> 'sonstiges'
    or length(trim(coalesce(resolution_comment, ''))) > 0
  )
);

create table public.case_comments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.bfs_cases(id) on delete cascade,
  user_id uuid references public.profiles(id),
  comment text not null,
  created_at timestamptz default now()
);

create table public.bfs_matches (
  id uuid primary key default gen_random_uuid(),
  standort_id uuid references public.standorte(id) on delete restrict,
  old_case_id uuid references public.bfs_cases(id) on delete cascade,
  new_forderung_id uuid references public.bfs_forderungen(id) on delete cascade,
  match_score numeric(5,2),
  match_type text check (match_type in ('automatic','suggested','manual')),
  status text check (status in ('pending','confirmed','rejected','auto_confirmed')),
  reason text,
  confirmed_by uuid references public.profiles(id),
  confirmed_at timestamptz,
  created_at timestamptz default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz default now()
);

create index idx_user_standorte_user on public.user_standorte(user_id);
create index idx_bfs_documents_standort on public.bfs_documents(standort_id);
create index idx_bfs_documents_batch on public.bfs_documents(batch_id);
create index idx_bfs_forderungen_standort on public.bfs_forderungen(standort_id);
create index idx_bfs_forderungen_match on public.bfs_forderungen(standort_id, patient_name, rechnungsnummer, betrag);
create index idx_bfs_bewegungen_standort on public.bfs_bewegungen(standort_id);
create index idx_bfs_cases_standort_status on public.bfs_cases(standort_id, status);
create index idx_bfs_cases_type on public.bfs_cases(case_type);
create index idx_case_comments_case on public.case_comments(case_id);
create index idx_bfs_matches_standort on public.bfs_matches(standort_id);

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger standorte_set_updated_at before update on public.standorte for each row execute function public.set_updated_at();
create trigger batches_set_updated_at before update on public.bfs_import_batches for each row execute function public.set_updated_at();
create trigger documents_set_updated_at before update on public.bfs_documents for each row execute function public.set_updated_at();
create trigger cases_set_updated_at before update on public.bfs_cases for each row execute function public.set_updated_at();

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security invoker
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'super_admin'
      and active = true
  );
$$;

create or replace function public.can_access_standort(target_standort_id uuid)
returns boolean
language sql
stable
security invoker
as $$
  select public.is_super_admin()
    or exists (
      select 1
      from public.user_standorte us
      join public.profiles p on p.id = us.user_id
      where us.user_id = (select auth.uid())
        and us.standort_id = target_standort_id
        and p.active = true
    );
$$;

alter table public.profiles enable row level security;
alter table public.standorte enable row level security;
alter table public.user_standorte enable row level security;
alter table public.bfs_import_batches enable row level security;
alter table public.bfs_documents enable row level security;
alter table public.bfs_abrechnungen enable row level security;
alter table public.bfs_forderungen enable row level security;
alter table public.bfs_bewegungen enable row level security;
alter table public.bfs_cases enable row level security;
alter table public.case_comments enable row level security;
alter table public.bfs_matches enable row level security;
alter table public.audit_log enable row level security;

create policy "profiles self or admin select" on public.profiles for select to authenticated
using ((select auth.uid()) = id or public.is_super_admin());
create policy "profiles admin write" on public.profiles for all to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());

create policy "standorte access select" on public.standorte for select to authenticated
using (public.is_super_admin() or exists (select 1 from public.user_standorte us where us.user_id = (select auth.uid()) and us.standort_id = id));
create policy "standorte admin write" on public.standorte for all to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());

create policy "user_standorte select" on public.user_standorte for select to authenticated
using (public.is_super_admin() or user_id = (select auth.uid()));
create policy "user_standorte admin write" on public.user_standorte for all to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());

create policy "batches admin all" on public.bfs_import_batches for all to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());

create policy "documents select by location" on public.bfs_documents for select to authenticated
using (public.can_access_standort(standort_id));
create policy "documents admin write" on public.bfs_documents for all to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());

create policy "abrechnungen select by location" on public.bfs_abrechnungen for select to authenticated
using (public.can_access_standort(standort_id));
create policy "abrechnungen admin write" on public.bfs_abrechnungen for all to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());

create policy "forderungen select by location" on public.bfs_forderungen for select to authenticated
using (public.can_access_standort(standort_id));
create policy "forderungen admin write" on public.bfs_forderungen for all to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());

create policy "bewegungen select by location" on public.bfs_bewegungen for select to authenticated
using (public.can_access_standort(standort_id));
create policy "bewegungen admin write" on public.bfs_bewegungen for all to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());

create policy "cases select by location" on public.bfs_cases for select to authenticated
using (public.can_access_standort(standort_id));
create policy "cases insert admin" on public.bfs_cases for insert to authenticated
with check (public.is_super_admin());
create policy "cases update admin or assigned lead" on public.bfs_cases for update to authenticated
using (public.can_access_standort(standort_id))
with check (public.can_access_standort(standort_id));
create policy "cases delete admin" on public.bfs_cases for delete to authenticated
using (public.is_super_admin());

create policy "comments select by case location" on public.case_comments for select to authenticated
using (exists (select 1 from public.bfs_cases c where c.id = case_id and public.can_access_standort(c.standort_id)));
create policy "comments insert by case location" on public.case_comments for insert to authenticated
with check (user_id = (select auth.uid()) and exists (select 1 from public.bfs_cases c where c.id = case_id and public.can_access_standort(c.standort_id)));

create policy "matches select by location" on public.bfs_matches for select to authenticated
using (public.can_access_standort(standort_id));
create policy "matches admin write" on public.bfs_matches for all to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());

create policy "audit select own scope" on public.audit_log for select to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1
    from public.bfs_cases c
    where c.id = audit_log.entity_id
      and public.can_access_standort(c.standort_id)
  )
);
create policy "audit admin insert" on public.audit_log for insert to authenticated
with check (public.is_super_admin() or user_id = (select auth.uid()));

create or replace function public.audit_case_status_change()
returns trigger
language plpgsql
security invoker
as $$
begin
  if old.status is distinct from new.status
    or old.resolution_reason is distinct from new.resolution_reason
    or old.resolution_comment is distinct from new.resolution_comment then
    insert into public.audit_log (user_id, action, entity_type, entity_id, old_value, new_value, reason)
    values (
      (select auth.uid()),
      'case_status_changed',
      'bfs_cases',
      new.id,
      to_jsonb(old),
      to_jsonb(new),
      new.resolution_comment
    );
  end if;
  return new;
end;
$$;

create trigger audit_case_status_change
after update on public.bfs_cases
for each row execute function public.audit_case_status_change();

insert into public.standorte (id, name, praxisname, bfs_mandant_nr, adresse)
values
  ('00000000-0000-0000-0000-000000000001', 'Ulmet', 'Praxis Dr. Hangx', '19260', 'Ulmet'),
  ('00000000-0000-0000-0000-000000000002', 'Kehl', 'Orisus MVZ Kehl', '20411', 'Kehl'),
  ('00000000-0000-0000-0000-000000000003', 'Kassel', 'Orisus MVZ Kassel', '20902', 'Kassel'),
  ('00000000-0000-0000-0000-000000000004', 'Kirchberg', 'Orisus MVZ Kirchberg', '21988', 'Kirchberg')
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('bfs-documents', 'bfs-documents', false)
on conflict (id) do update set public = false;

create policy "private bfs documents admin upload" on storage.objects for insert to authenticated
with check (bucket_id = 'bfs-documents' and public.is_super_admin());
create policy "private bfs documents admin update" on storage.objects for update to authenticated
using (bucket_id = 'bfs-documents' and public.is_super_admin())
with check (bucket_id = 'bfs-documents' and public.is_super_admin());
create policy "private bfs documents authorized read" on storage.objects for select to authenticated
using (
  bucket_id = 'bfs-documents'
  and (
    public.is_super_admin()
    or exists (
      select 1
      from public.bfs_documents d
      where d.storage_path = storage.objects.name
        and public.can_access_standort(d.standort_id)
    )
  )
);
