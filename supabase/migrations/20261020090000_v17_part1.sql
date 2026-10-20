-- v1.7 part 1 (T8.9, PRD §10.3): projects cloud save + post versions,
-- preview identity, saved brand styles, per-user row limits.
-- Additive only: koi column drop / rename nahi — purana app code chalta rahega.

-- ── projects: post versions (QW-3 / PJ-7) + thumbnail (PJ-1) ─────────────
alter table public.projects
  add column post_versions jsonb not null default '[]'::jsonb,
  add column thumbnail_path text;

alter table public.projects
  add constraint projects_post_versions_shape check (
    jsonb_typeof(post_versions) = 'array'
    and jsonb_array_length(post_versions) <= 20
  ),
  -- Thumbnail sirf user ke apne project folder ka path ho (Storage RLS ke upar ek aur guard).
  add constraint projects_thumbnail_path_own check (
    thumbnail_path is null
    or thumbnail_path = user_id::text || '/' || id::text || '/thumb.webp'
  ),
  -- Scene JSON pe sanity cap (normal scene ~5–30 KB; 50 layers bhi ~200 KB).
  add constraint projects_editor_state_size check (
    pg_column_size(editor_state) <= 1048576
  );

-- ── profiles: X preview identity (QW-4) ─────────────────────────────────
-- Shape: { name, handle, verified, avatar_path } — avatar file Storage
-- `uploads/{uid}/profile/avatar.webp` mein, yahan sirf path.
alter table public.profiles
  add column preview_identity jsonb;

alter table public.profiles
  add constraint profiles_preview_identity_shape check (
    preview_identity is null
    or (
      jsonb_typeof(preview_identity) = 'object'
      and pg_column_size(preview_identity) <= 2048
    )
  );

grant update (preview_identity) on public.profiles to authenticated;

-- ── user_styles: saved brand styles (BK-1) ──────────────────────────────
create table public.user_styles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  style jsonb not null check (
    jsonb_typeof(style) = 'object' and pg_column_size(style) <= 65536
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_styles_user_created_idx on public.user_styles (user_id, created_at);

create trigger user_styles_set_updated_at
  before update on public.user_styles
  for each row execute function extensions.moddatetime (updated_at);

alter table public.user_styles enable row level security;

revoke all on public.user_styles from anon, authenticated;
-- user_id update nahi (column grant) — style kisi aur account pe move nahi ho sakta.
grant select, insert, delete on public.user_styles to authenticated;
grant update (name, style) on public.user_styles to authenticated;
grant select, insert, update, delete on public.user_styles to service_role;

create policy "user_styles: own all" on public.user_styles
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ── Per-user row limits (PJ-6, BK-1) ────────────────────────────────────
-- Generic BEFORE INSERT trigger: TG_ARGV[0] = app_config key, TG_ARGV[1] =
-- fallback limit, TG_ARGV[2] = error code. Advisory lock per (table, user)
-- taaki parallel inserts limit cross na kar sakein.
create or replace function public.enforce_user_row_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit int;
  v_count int;
begin
  select coalesce(
    (select (value #>> '{}')::int from public.app_config where key = tg_argv[0]),
    tg_argv[1]::int
  ) into v_limit;

  perform pg_advisory_xact_lock(hashtext(tg_table_name), hashtext(new.user_id::text));

  execute format(
    'select count(*) from %I.%I where user_id = $1',
    tg_table_schema,
    tg_table_name
  ) into v_count using new.user_id;

  if v_count >= v_limit then
    raise exception '%', tg_argv[2];
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_user_row_limit() from public, anon, authenticated;
grant execute on function public.enforce_user_row_limit() to service_role;

create trigger projects_enforce_limit
  before insert on public.projects
  for each row execute function public.enforce_user_row_limit(
    'limits.projects_max', '50', 'PROJECTS_LIMIT_REACHED'
  );

create trigger user_styles_enforce_limit
  before insert on public.user_styles
  for each row execute function public.enforce_user_row_limit(
    'limits.brand_styles_max', '10', 'BRAND_STYLES_LIMIT_REACHED'
  );

-- ── app_config (§10.3) ──────────────────────────────────────────────────
insert into public.app_config (key, value)
values
  ('limits.projects_max', '50'),
  ('limits.brand_styles_max', '10')
on conflict (key) do nothing;
