create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, ai_credits)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(
      (select (value #>> '{}')::int from public.app_config where key = 'limits.ai_credits_monthly'),
      30
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.consume_credits(p_user_id uuid, p_amount int, p_reason text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_remaining int;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  update public.profiles
     set ai_credits = ai_credits - p_amount
   where id = p_user_id
     and ai_credits >= p_amount
  returning ai_credits into v_remaining;

  if v_remaining is null then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  insert into public.credit_transactions (user_id, delta, reason)
  values (p_user_id, -p_amount, p_reason);

  return v_remaining;
end;
$$;

create or replace function public.refund_credits(p_user_id uuid, p_amount int, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  update public.profiles
     set ai_credits = ai_credits + p_amount
   where id = p_user_id;

  if not found then
    raise exception 'USER_NOT_FOUND';
  end if;

  insert into public.credit_transactions (user_id, delta, reason)
  values (p_user_id, p_amount, p_reason);
end;
$$;

create or replace function public.hit_rate_limit(p_user_id uuid, p_bucket text, p_max_hits int, p_window_sec int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_allowed boolean;
begin
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_sec) * p_window_sec);

  insert into public.rate_limits (user_id, bucket, window_start, hits)
  values (p_user_id, p_bucket, v_window, 1)
  on conflict (user_id, bucket, window_start)
  do update set hits = public.rate_limits.hits + 1
  returning hits <= p_max_hits into v_allowed;

  return coalesce(v_allowed, false);
end;
$$;

create or replace function public.reserve_x_post(
  p_user_id uuid,
  p_text text,
  p_media_type text,
  p_has_url boolean,
  p_project_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit int;
  v_weight int := 1;
  v_used int;
  v_post_id uuid;
begin
  select (value #>> '{}')::int into v_limit
    from public.app_config where key = 'limits.x_posts_monthly';
  v_limit := coalesce(v_limit, 10);

  if p_has_url then
    select (value #>> '{}')::int into v_weight
      from public.app_config where key = 'limits.x_link_post_weight';
    v_weight := coalesce(v_weight, 5);
  end if;

  perform 1 from public.profiles where id = p_user_id for update;

  select coalesce(sum(p.weight), 0)::int into v_used
    from public.posts p
   where p.user_id = p_user_id
     and p.status in ('pending', 'posted')
     and p.created_at >= (select credits_reset_at from public.profiles where id = p_user_id);

  if v_used + v_weight > v_limit then
    raise exception 'X_POST_LIMIT_REACHED';
  end if;

  insert into public.posts (user_id, project_id, text, media_type, has_url, weight, status)
  values (p_user_id, p_project_id, p_text, p_media_type, p_has_url, v_weight, 'pending')
  returning id into v_post_id;

  return v_post_id;
end;
$$;

create or replace function public.claim_x_token_refresh(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claimed boolean;
begin
  update public.x_accounts
     set refresh_lock_until = now() + interval '30 seconds'
   where user_id = p_user_id
     and (refresh_lock_until is null or refresh_lock_until < now())
  returning true into v_claimed;

  return coalesce(v_claimed, false);
end;
$$;

create or replace function public.reset_monthly_credits()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_default int;
begin
  select (value #>> '{}')::int into v_default
    from public.app_config where key = 'limits.ai_credits_monthly';
  v_default := coalesce(v_default, 30);

  with reset as (
    update public.profiles
       set ai_credits = v_default, credits_reset_at = now()
     where credits_reset_at <= now() - interval '1 month'
    returning id
  )
  insert into public.credit_transactions (user_id, delta, reason)
  select id, v_default, 'monthly_reset' from reset;
end;
$$;

create or replace function public.cleanup_housekeeping()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.posts
     set status = 'failed', error = 'STALE_PENDING'
   where status = 'pending'
     and created_at < now() - interval '15 minutes';

  delete from public.rate_limits where window_start < now() - interval '1 day';
  delete from public.pexels_cache where expires_at < now();
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.consume_credits(uuid, int, text) from public, anon, authenticated;
revoke execute on function public.refund_credits(uuid, int, text) from public, anon, authenticated;
revoke execute on function public.hit_rate_limit(uuid, text, int, int) from public, anon, authenticated;
revoke execute on function public.reserve_x_post(uuid, text, text, boolean, uuid) from public, anon, authenticated;
revoke execute on function public.claim_x_token_refresh(uuid) from public, anon, authenticated;
revoke execute on function public.reset_monthly_credits() from public, anon, authenticated;
revoke execute on function public.cleanup_housekeeping() from public, anon, authenticated;

grant execute on function public.handle_new_user() to supabase_auth_admin, service_role;
grant execute on function public.consume_credits(uuid, int, text) to service_role;
grant execute on function public.refund_credits(uuid, int, text) to service_role;
grant execute on function public.hit_rate_limit(uuid, text, int, int) to service_role;
grant execute on function public.reserve_x_post(uuid, text, text, boolean, uuid) to service_role;
grant execute on function public.claim_x_token_refresh(uuid) to service_role;
grant execute on function public.reset_monthly_credits() to service_role;
grant execute on function public.cleanup_housekeeping() to service_role;
