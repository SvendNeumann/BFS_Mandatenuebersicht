create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_super_admin()
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
      and role = 'super_admin'
      and active = true
  );
$$;

create or replace function public.can_access_standort(target_standort_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public
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

create or replace function public.audit_case_status_change()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
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

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
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
revoke all on function public.handle_new_auth_user() from anon;
revoke all on function public.handle_new_auth_user() from authenticated;

drop policy if exists "standorte access select" on public.standorte;
create policy "standorte access select" on public.standorte for select to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1
    from public.user_standorte us
    where us.user_id = (select auth.uid())
      and us.standort_id = standorte.id
  )
);
