insert into public.standorte (id, name, praxisname, bfs_mandant_nr, adresse, go_live_date)
values
  ('00000000-0000-0000-0000-000000000004', 'Kirchberg', 'Orisus MVZ Kirchberg', '21988', 'Kirchberg', '2024-07-01'),
  ('00000000-0000-0000-0000-000000000005', 'Essen', 'Orisus MVZ Essen', '22341', 'Essen', '2025-01-01'),
  ('00000000-0000-0000-0000-000000000002', 'Kehl', 'Orisus MVZ Kehl', '20411', 'Kehl', '2025-04-01'),
  ('00000000-0000-0000-0000-000000000006', 'Hüttenberg', 'Orisus MVZ Hüttenberg', '22674', 'Hüttenberg', '2026-01-01'),
  ('00000000-0000-0000-0000-000000000001', 'Ulmet', 'Praxis Dr. Hangx', '19260', 'Ulmet', '2025-07-01'),
  ('00000000-0000-0000-0000-000000000003', 'Kassel', 'Orisus MVZ Kassel', '20902', 'Kassel', '2026-07-01')
on conflict (id) do update set
  name = excluded.name,
  praxisname = excluded.praxisname,
  bfs_mandant_nr = excluded.bfs_mandant_nr,
  adresse = excluded.adresse,
  go_live_date = excluded.go_live_date,
  active = true;
