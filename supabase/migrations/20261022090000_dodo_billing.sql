-- One-time lifetime licence + non-expiring AI credits. Existing balances retained.
alter table public.profiles add column lifetime_editor boolean not null default false;
alter table public.profiles add column credit_debt int not null default 0 check (credit_debt >= 0);
alter table public.profiles alter column ai_credits set default 5;
insert into public.app_config (key, value) values ('limits.ai_credits_monthly', '5')
on conflict (key) do update set value = excluded.value;

-- Keep the function for old scheduled callers, but never reset purchased balances.
create or replace function public.reset_monthly_credits() returns void
language plpgsql security definer set search_path = '' as $$ begin return; end; $$;

create table public.billing_orders (
  id uuid primary key,
  user_id uuid references public.profiles(id) on delete set null,
  product_key text not null check (product_key in ('lifetime', 'credits100', 'credits500')),
  product_id text not null,
  environment text not null check (environment in ('test_mode', 'live_mode')),
  credits int not null check (credits > 0),
  price_cents int not null check (price_cents > 0),
  checkout_session_id text unique,
  checkout_url text,
  checkout_claim_until timestamptz,
  payment_id text unique,
  total_amount int check (total_amount > 0),
  currency text,
  refunded_amount int not null default 0 check (refunded_amount >= 0),
  granted_credits int not null default 0 check (granted_credits >= 0),
  revoked_credits int not null default 0 check (revoked_credits >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'partially_refunded', 'refunded')),
  created_at timestamptz not null default now()
);
create index billing_orders_user_idx on public.billing_orders(user_id, created_at desc);
-- Serialize outstanding lifetime checkouts per account.
create unique index billing_lifetime_pending_idx on public.billing_orders(user_id)
where product_key = 'lifetime' and status = 'pending';
alter table public.billing_orders enable row level security;
revoke all on public.billing_orders from public, anon, authenticated;
grant select (id, user_id, product_key, status, total_amount, currency, created_at) on public.billing_orders to authenticated;
grant all on public.billing_orders to service_role;
create policy "billing: own read" on public.billing_orders for select to authenticated using ((select auth.uid()) = user_id);

-- Grant/refund operations settle outstanding refund debt before increasing balance.
create or replace function public.refund_credits(p_user_id uuid, p_amount int, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  update public.profiles set
    ai_credits = ai_credits + greatest(p_amount - credit_debt, 0),
    credit_debt = greatest(credit_debt - p_amount, 0)
  where id = p_user_id;
  if not found then raise exception 'USER_NOT_FOUND'; end if;
  insert into public.credit_transactions (user_id, delta, reason) values (p_user_id, p_amount, p_reason);
end; $$;

-- All mutations in one transaction, locked by order then user. Duplicate or stale
-- deliveries cannot grant twice or undo a newer refund. Payment IDs are unique.
create or replace function public.sync_dodo_order(
  p_order_id uuid, p_payment_id text, p_product_id text, p_session_id text,
  p_total_amount int, p_currency text, p_refunded_amount int, p_environment text
) returns void language plpgsql security definer set search_path = '' as $$
declare
  o public.billing_orders%rowtype;
  v_refund int; v_revoke int; v_remove int; v_balance int;
begin
  select * into o from public.billing_orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if o.product_id is distinct from p_product_id or o.environment is distinct from p_environment
     or (o.checkout_session_id is not null and o.checkout_session_id is distinct from p_session_id)
     or (o.payment_id is not null and o.payment_id is distinct from p_payment_id)
     or p_payment_id is null or p_session_id is null or p_total_amount is null or p_total_amount <= 0
     or p_total_amount <> o.price_cents or p_currency is distinct from 'USD' or p_refunded_amount is null or p_refunded_amount < 0
     or p_refunded_amount > p_total_amount
     or (o.total_amount is not null and o.total_amount <> p_total_amount)
  then raise exception 'PAYMENT_MISMATCH'; end if;
  -- Orders from deleted accounts remain receipts; never recreate a profile.
  if o.user_id is null then return; end if;
  perform 1 from public.profiles where id = o.user_id for update;
  if o.granted_credits = 0 then
    perform public.refund_credits(o.user_id, o.credits, 'purchase:' || o.product_key);
  end if;
  v_refund := greatest(o.refunded_amount, p_refunded_amount);
  v_revoke := least(o.credits, ceil(o.credits::numeric * v_refund / p_total_amount)::int);
  v_remove := greatest(v_revoke - o.revoked_credits, 0);
  if v_remove > 0 then
    select ai_credits into v_balance from public.profiles where id = o.user_id;
    update public.profiles set ai_credits = greatest(ai_credits - v_remove, 0),
      credit_debt = credit_debt + greatest(v_remove - v_balance, 0) where id = o.user_id;
    insert into public.credit_transactions(user_id, delta, reason) values(o.user_id, -v_remove, 'payment_refund:' || o.product_key);
  end if;
  update public.billing_orders set payment_id = p_payment_id,
    checkout_session_id = p_session_id, total_amount = p_total_amount, currency = p_currency,
    refunded_amount = v_refund, granted_credits = credits, revoked_credits = v_revoke,
    status = case when v_refund >= p_total_amount then 'refunded' when v_refund > 0 then 'partially_refunded' else 'paid' end
  where id = o.id;
  update public.profiles set lifetime_editor = exists (
    select 1 from public.billing_orders b where b.user_id = o.user_id and b.product_key = 'lifetime'
    and b.status in ('paid', 'partially_refunded')
  ) where id = o.user_id;
end; $$;
revoke execute on function public.sync_dodo_order(uuid,text,text,text,int,text,int,text) from public, anon, authenticated;
grant execute on function public.sync_dodo_order(uuid,text,text,text,int,text,int,text) to service_role;
create function public.claim_dodo_checkout(p_order_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.billing_orders set checkout_claim_until = now() + interval '60 seconds'
  where id = p_order_id and status = 'pending' and checkout_session_id is null
    and (checkout_claim_until is null or checkout_claim_until < now())
    and (product_key <> 'lifetime' or not exists (
      select 1 from public.profiles p where p.id = billing_orders.user_id and p.lifetime_editor
    ));
  return found;
end; $$;
revoke execute on function public.claim_dodo_checkout(uuid) from public, anon, authenticated;
grant execute on function public.claim_dodo_checkout(uuid) to service_role;
-- CREATE OR REPLACE preserves the existing service-only grants for credit RPCs.
