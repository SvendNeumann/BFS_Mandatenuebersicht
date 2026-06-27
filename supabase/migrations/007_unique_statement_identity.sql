alter table public.bfs_documents
  add constraint bfs_documents_unique_statement_identity
  unique (standort_id, bfs_mandant_nr, abrechnung_nr);
