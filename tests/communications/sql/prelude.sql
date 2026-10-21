create extension if not exists pgcrypto;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  app_role text,
  email text
);

create or replace function public.is_admin(p_user_id uuid)
returns boolean
language sql
stable
as $$ select false $$;

create schema if not exists auth;
create or replace function auth.uid()
returns uuid
language sql
stable
as $$ select null::uuid $$;
