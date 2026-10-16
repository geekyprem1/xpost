create schema if not exists extensions;

create extension if not exists moddatetime with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  ai_credits int not null default 30 check (ai_credits >= 0),
  credits_reset_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.x_accounts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  x_user_id text not null,
  username text not null,
  display_name text,
  avatar_url text,
  verified boolean not null default false,
  access_token_enc text not null,
  refresh_token_enc text not null,
  expires_at timestamptz not null,
  scopes text not null,
  refresh_lock_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Untitled',
  source_image_path text,
  editor_state jsonb not null,
  post_text text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  action text not null,
  model text not null,
  input jsonb,
  output text,
  prompt_tokens int,
  completion_tokens int,
  cost_usd numeric(10, 6),
  status text not null default 'success' check (status in ('success', 'failed', 'refunded')),
  created_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  x_post_id text,
  text text not null,
  media_type text check (media_type in ('image', 'gif', 'video')),
  has_url boolean not null default false,
  weight int not null default 1 check (weight > 0),
  cost_usd numeric(10, 4),
  status text not null default 'pending' check (status in ('pending', 'posted', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

create table public.rate_limits (
  user_id uuid not null references public.profiles (id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (user_id, bucket, window_start)
);

create table public.pexels_cache (
  cache_key text primary key,
  response jsonb not null,
  expires_at timestamptz not null
);

create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  delta int not null,
  reason text not null,
  ref_id uuid,
  created_at timestamptz not null default now()
);

create table public.app_config (
  key text primary key,
  value jsonb not null
);

create index projects_user_updated_idx on public.projects (user_id, updated_at desc);
create index ai_generations_user_created_idx on public.ai_generations (user_id, created_at desc);
create index posts_user_created_idx on public.posts (user_id, created_at desc);
create index credit_transactions_user_created_idx on public.credit_transactions (user_id, created_at desc);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function extensions.moddatetime (updated_at);

create trigger x_accounts_set_updated_at
  before update on public.x_accounts
  for each row execute function extensions.moddatetime (updated_at);
