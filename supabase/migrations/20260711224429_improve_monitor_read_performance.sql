create index if not exists idx_bfs_documents_imported_created
  on public.bfs_documents (status, created_at)
  where extracted_json is not null;

create index if not exists idx_bfs_documents_storage_cleanup
  on public.bfs_documents (status, created_at)
  where deleted_at is null and storage_path is not null;

create index if not exists idx_bfs_patient_invoices_date_created
  on public.bfs_patient_invoices (rechnungsdatum, created_at);

create index if not exists idx_bfs_patient_invoices_standort_date_created
  on public.bfs_patient_invoices (standort_id, rechnungsdatum, created_at);

create index if not exists idx_audit_log_action_entity_created
  on public.audit_log (action, entity_type, created_at desc);
