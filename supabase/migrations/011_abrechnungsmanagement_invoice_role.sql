alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (role in ('super_admin', 'standortleitung', 'abrechnungsmanagement'));

create or replace function public.can_manage_invoice_analysis()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('super_admin', 'abrechnungsmanagement')
      and active = true
  );
$$;

drop policy if exists "invoice batches admin all" on public.bfs_invoice_import_batches;
create policy "invoice batches invoice management all" on public.bfs_invoice_import_batches for all to authenticated
using (public.can_manage_invoice_analysis())
with check (public.can_manage_invoice_analysis());

drop policy if exists "patient invoices select by location" on public.bfs_patient_invoices;
create policy "patient invoices select by location or invoice management" on public.bfs_patient_invoices for select to authenticated
using (
  public.can_manage_invoice_analysis()
  or public.can_access_standort(standort_id)
);

drop policy if exists "patient invoices admin write" on public.bfs_patient_invoices;
create policy "patient invoices invoice management write" on public.bfs_patient_invoices for all to authenticated
using (public.can_manage_invoice_analysis())
with check (public.can_manage_invoice_analysis());

drop policy if exists "patient invoice lines select by invoice location" on public.bfs_patient_invoice_lines;
create policy "patient invoice lines select by invoice location or invoice management" on public.bfs_patient_invoice_lines for select to authenticated
using (
  public.can_manage_invoice_analysis()
  or exists (
    select 1
    from public.bfs_patient_invoices i
    where i.id = invoice_id
      and public.can_access_standort(i.standort_id)
  )
);

drop policy if exists "patient invoice lines admin write" on public.bfs_patient_invoice_lines;
create policy "patient invoice lines invoice management write" on public.bfs_patient_invoice_lines for all to authenticated
using (public.can_manage_invoice_analysis())
with check (public.can_manage_invoice_analysis());
