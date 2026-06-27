alter table public.standorte
  add column if not exists go_live_date date;

update public.standorte
set go_live_date = values_table.go_live_date
from (
  values
    ('00000000-0000-0000-0000-000000000004'::uuid, '2024-07-01'::date),
    ('00000000-0000-0000-0000-000000000005'::uuid, '2025-01-01'::date),
    ('00000000-0000-0000-0000-000000000002'::uuid, '2025-04-01'::date),
    ('00000000-0000-0000-0000-000000000006'::uuid, '2026-01-01'::date),
    ('00000000-0000-0000-0000-000000000001'::uuid, '2025-07-01'::date),
    ('00000000-0000-0000-0000-000000000003'::uuid, '2026-07-01'::date)
) as values_table(id, go_live_date)
where public.standorte.id = values_table.id;
