drop policy if exists "invoice batches invoice management all" on public.bfs_invoice_import_batches;
create policy "invoice batches admin all" on public.bfs_invoice_import_batches for all to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "patient invoices invoice management write" on public.bfs_patient_invoices;
create policy "patient invoices admin write" on public.bfs_patient_invoices for all to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "patient invoice lines invoice management write" on public.bfs_patient_invoice_lines;
create policy "patient invoice lines admin write" on public.bfs_patient_invoice_lines for all to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());
