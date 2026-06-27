alter table public.profiles
  add column if not exists must_change_password boolean not null default false,
  add column if not exists created_by uuid references public.profiles(id),
  add column if not exists temp_password_set_at timestamptz;

update public.profiles
set must_change_password = false
where role = 'super_admin'
  and lower(email) = 'svend.neumann@orisus.de';

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, active, must_change_password)
  values (
    new.id,
    lower(new.email),
    nullif(new.raw_user_meta_data->>'full_name', ''),
    case when lower(new.email) = 'svend.neumann@orisus.de' then 'super_admin' else 'standortleitung' end,
    case when lower(new.email) = 'svend.neumann@orisus.de' then true else false end,
    lower(new.email) <> 'svend.neumann@orisus.de'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    updated_at = now();
  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public;
