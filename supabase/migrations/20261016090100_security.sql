alter table public.profiles enable row level security;
alter table public.x_accounts enable row level security;
alter table public.projects enable row level security;
alter table public.ai_generations enable row level security;
alter table public.posts enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.app_config enable row level security;
alter table public.rate_limits enable row level security;
alter table public.pexels_cache enable row level security;

revoke all on public.profiles, public.x_accounts, public.projects, public.ai_generations, public.posts, public.credit_transactions, public.app_config, public.rate_limits, public.pexels_cache from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;
grant select (user_id, username, display_name, avatar_url, verified) on public.x_accounts to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select on public.ai_generations to authenticated;
grant select on public.posts to authenticated;
grant select on public.credit_transactions to authenticated;
grant select on public.app_config to authenticated;

grant select, insert, update, delete on public.profiles, public.x_accounts, public.projects, public.ai_generations, public.posts, public.credit_transactions, public.app_config, public.rate_limits, public.pexels_cache to service_role;

create policy "profiles: own read" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

create policy "profiles: own update" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "x_accounts: own read" on public.x_accounts
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "projects: own all" on public.projects
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "ai_generations: own read" on public.ai_generations
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "posts: own read" on public.posts
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "credit_transactions: own read" on public.credit_transactions
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "app_config: read" on public.app_config
  for select to authenticated using (true);

create policy "storage: own files" on storage.objects
  for all to authenticated
  using (bucket_id in ('uploads', 'exports') and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id in ('uploads', 'exports') and (storage.foldername(name))[1] = (select auth.uid())::text);
