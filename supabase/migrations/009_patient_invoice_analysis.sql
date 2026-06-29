create table public.bfs_invoice_import_batches (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid references public.profiles(id),
  status text not null check (status in ('processing','completed','failed','partially_completed')) default 'processing',
  total_files int not null default 0,
  successful_files int not null default 0,
  failed_files int not null default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.bfs_patient_invoices (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.bfs_invoice_import_batches(id) on delete set null,
  standort_id uuid references public.standorte(id) on delete restrict,
  original_filename text not null,
  file_hash text not null,
  file_size_bytes bigint,
  storage_path text,
  bfs_nr text not null,
  mandant_nr text not null,
  praxisname text,
  rechnungsnummer text not null,
  rechnungsdatum date,
  patient_name text not null,
  treated_person text,
  birth_date text,
  treatment_period text,
  integration_date text,
  total_amount numeric(12,2) not null default 0,
  open_amount numeric(12,2) not null default 0,
  subsidy_amount numeric(12,2) not null default 0,
  honorar_bema numeric(12,2) not null default 0,
  honorar_goz numeric(12,2) not null default 0,
  eigenlabor_total numeric(12,2) not null default 0,
  fremdlabor_net numeric(12,2) not null default 0,
  fremdlabor_gross numeric(12,2) not null default 0,
  material_auslagen numeric(12,2) not null default 0,
  has_eigenlabor boolean not null default false,
  has_fremdlabor boolean not null default false,
  lab_providers text[] not null default '{}',
  parse_status text not null check (parse_status in ('OK','Zu prüfen')),
  parse_notes text[] not null default '{}',
  extracted_json jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (bfs_nr),
  unique (file_hash)
);

create table public.bfs_patient_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.bfs_patient_invoices(id) on delete cascade,
  line_kind text not null check (line_kind in ('service','lab')),
  sort_order int not null default 0,
  line_date text,
  region text,
  code text not null,
  description text not null,
  factor numeric(8,3),
  quantity numeric(10,2),
  amount numeric(12,2) not null default 0,
  category text not null check (category in ('leistung','eigenlabor','fremdlabor','material','auslage')),
  source_section text not null,
  created_at timestamptz default now()
);

create index idx_bfs_invoice_batches_uploaded_by on public.bfs_invoice_import_batches(uploaded_by);
create index idx_bfs_patient_invoices_standort on public.bfs_patient_invoices(standort_id);
create index idx_bfs_patient_invoices_date on public.bfs_patient_invoices(rechnungsdatum);
create index idx_bfs_patient_invoices_bfs_nr on public.bfs_patient_invoices(bfs_nr);
create index idx_bfs_patient_invoices_rechnung on public.bfs_patient_invoices(standort_id, rechnungsnummer);
create index idx_bfs_patient_invoice_lines_invoice on public.bfs_patient_invoice_lines(invoice_id);
create index idx_bfs_patient_invoice_lines_code on public.bfs_patient_invoice_lines(code);

create trigger invoice_batches_set_updated_at before update on public.bfs_invoice_import_batches for each row execute function public.set_updated_at();
create trigger patient_invoices_set_updated_at before update on public.bfs_patient_invoices for each row execute function public.set_updated_at();

alter table public.bfs_invoice_import_batches enable row level security;
alter table public.bfs_patient_invoices enable row level security;
alter table public.bfs_patient_invoice_lines enable row level security;

create policy "invoice batches admin all" on public.bfs_invoice_import_batches for all to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());

create policy "patient invoices select by location" on public.bfs_patient_invoices for select to authenticated
using (public.can_access_standort(standort_id));
create policy "patient invoices admin write" on public.bfs_patient_invoices for all to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());

create policy "patient invoice lines select by invoice location" on public.bfs_patient_invoice_lines for select to authenticated
using (
  exists (
    select 1
    from public.bfs_patient_invoices i
    where i.id = invoice_id
      and public.can_access_standort(i.standort_id)
  )
);
create policy "patient invoice lines admin write" on public.bfs_patient_invoice_lines for all to authenticated
using (
  public.is_super_admin()
) with check (
  public.is_super_admin()
);
