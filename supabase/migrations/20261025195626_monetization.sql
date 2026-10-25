-- Account and credit changes are server-only. Clients cannot grant Pro or rewards.
create table public.billing_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pro_until timestamptz,
  verified_at timestamptz,
  environment text check (environment in ('test', 'live'))
);
create table public.ai_monthly_credits (
  user_id uuid not null references public.billing_accounts(user_id) on delete cascade,
  period date not null,
  balance integer not null default 3 check (balance between 0 and 3),
  successful_uses integer not null default 0,
  rewarded_uses integer not null default 0,
  primary key (user_id, period)
);
create table public.ai_credit_requests (
  user_id uuid not null references public.billing_accounts(user_id) on delete cascade,
  request_id text not null check (length(request_id) between 8 and 80),
  fingerprint text not null,
  period date not null,
  charged boolean not null,
  state text not null check (state in ('pending', 'completed', 'refunded')),
  response jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, request_id)
);
create table public.ai_reward_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.billing_accounts(user_id) on delete cascade,
  period date not null,
  expires_at timestamptz not null default now() + interval '20 minutes',
  transaction_id text unique,
  credited boolean not null default false
);
create index ai_reward_challenges_user_id_idx on public.ai_reward_challenges(user_id);
alter table public.billing_accounts enable row level security;
alter table public.ai_monthly_credits enable row level security;
alter table public.ai_credit_requests enable row level security;
alter table public.ai_reward_challenges enable row level security;
revoke all on public.billing_accounts, public.ai_monthly_credits, public.ai_credit_requests, public.ai_reward_challenges from anon, authenticated;
grant select, insert, update on public.billing_accounts, public.ai_monthly_credits, public.ai_credit_requests, public.ai_reward_challenges to service_role;

create function public.billing_credit_status(p_user_id uuid, p_environment text default 'live') returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_period date := date_trunc('month', now() at time zone 'America/Santiago')::date;
  v_account public.billing_accounts;
  v_credits public.ai_monthly_credits;
begin
  insert into public.billing_accounts(user_id) values(p_user_id) on conflict do nothing;
  select * into v_account from public.billing_accounts where user_id = p_user_id for update;
  insert into public.ai_monthly_credits(user_id, period) values(p_user_id, v_period) on conflict do nothing;
  select * into v_credits from public.ai_monthly_credits where user_id = p_user_id and period = v_period;
  return jsonb_build_object('plan', case when v_account.pro_until > now() and v_account.environment = p_environment then 'pro' else 'free' end,
    'remaining', case when v_account.pro_until > now() and v_account.environment = p_environment then null else v_credits.balance end,
    'monthlyAllowance', 3, 'used', v_credits.successful_uses, 'rewards', v_credits.rewarded_uses,
    'period', v_period, 'resetsAt', (v_period + interval '1 month') at time zone 'America/Santiago',
    'proUntil', v_account.pro_until);
end $$;

create function public.billing_reserve_credit(p_user_id uuid, p_request_id text, p_fingerprint text, p_environment text default 'live') returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_status jsonb;
  v_request public.ai_credit_requests;
  v_period date := date_trunc('month', now() at time zone 'America/Santiago')::date;
  v_charged boolean;
begin
  v_status := public.billing_credit_status(p_user_id, p_environment); -- acquires account lock across every AI feature
  select * into v_request from public.ai_credit_requests where user_id = p_user_id and request_id = p_request_id;
  if found then
    if v_request.fingerprint <> p_fingerprint then return jsonb_build_object('status', 'conflict'); end if;
    if v_request.state = 'completed' then return jsonb_build_object('status', 'cached', 'response', v_request.response); end if;
    if v_request.state = 'pending' then return jsonb_build_object('status', 'pending'); end if;
    return jsonb_build_object('status', 'failed');
  end if;
  v_charged := v_status->>'plan' <> 'pro';
  if v_charged and (v_status->>'remaining')::integer = 0 then return jsonb_build_object('status', 'exhausted'); end if;
  if v_charged then update public.ai_monthly_credits set balance = balance - 1 where user_id = p_user_id and period = v_period; end if;
  insert into public.ai_credit_requests(user_id, request_id, fingerprint, period, charged, state)
    values(p_user_id, p_request_id, p_fingerprint, v_period, v_charged, 'pending');
  return jsonb_build_object('status', 'reserved');
end $$;

create function public.billing_finish_credit(p_user_id uuid, p_request_id text, p_success boolean, p_response jsonb default null) returns void
language plpgsql security invoker set search_path = '' as $$
declare v_request public.ai_credit_requests;
begin
  perform 1 from public.billing_accounts where user_id = p_user_id for update;
  select * into v_request from public.ai_credit_requests where user_id = p_user_id and request_id = p_request_id;
  if not found or v_request.state <> 'pending' then return; end if;
  update public.ai_credit_requests set state = case when p_success then 'completed' else 'refunded' end,
    response = case when p_success then p_response else null end where user_id = p_user_id and request_id = p_request_id;
  if v_request.charged then
    update public.ai_monthly_credits set
      balance = case when p_success then balance else least(balance + 1, 3) end,
      successful_uses = successful_uses + case when p_success then 1 else 0 end
      where user_id = p_user_id and period = v_request.period;
  end if;
end $$;

create function public.billing_reward_credit(p_user_id uuid, p_challenge uuid, p_transaction text, p_environment text default 'live') returns boolean
language plpgsql security invoker set search_path = '' as $$
declare
  v_status jsonb;
  v_challenge public.ai_reward_challenges;
begin
  v_status := public.billing_credit_status(p_user_id, p_environment);
  select * into v_challenge from public.ai_reward_challenges where id = p_challenge and user_id = p_user_id;
  if not found then return false; end if;
  if v_challenge.transaction_id is not null then return v_challenge.transaction_id = p_transaction and v_challenge.credited; end if;
  if exists(select 1 from public.ai_reward_challenges where transaction_id = p_transaction) then return false; end if;
  if v_challenge.expires_at < now() or v_challenge.period::text <> v_status->>'period' or v_status->>'plan' = 'pro' then return false; end if;
  update public.ai_reward_challenges set transaction_id = p_transaction,
    credited = (v_status->>'remaining')::integer < 3 where id = p_challenge;
  if (v_status->>'remaining')::integer >= 3 then return false; end if;
  update public.ai_monthly_credits set balance = balance + 1, rewarded_uses = rewarded_uses + 1
    where user_id = p_user_id and period = v_challenge.period;
  return true;
end $$;

revoke execute on function public.billing_credit_status(uuid,text), public.billing_reserve_credit(uuid,text,text,text), public.billing_finish_credit(uuid,text,boolean,jsonb), public.billing_reward_credit(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.billing_credit_status(uuid,text), public.billing_reserve_credit(uuid,text,text,text), public.billing_finish_credit(uuid,text,boolean,jsonb), public.billing_reward_credit(uuid,uuid,text,text) to service_role;

create function public.billing_sync_pro(p_user_id uuid, p_pro_until timestamptz, p_verified_at timestamptz, p_environment text) returns void
language sql security invoker set search_path = '' as $$
  insert into public.billing_accounts(user_id, pro_until, verified_at, environment)
    values(p_user_id, p_pro_until, p_verified_at, p_environment)
    on conflict(user_id) do update set pro_until = excluded.pro_until, verified_at = excluded.verified_at, environment = excluded.environment
    where public.billing_accounts.verified_at is null or public.billing_accounts.verified_at <= excluded.verified_at;
$$;
revoke execute on function public.billing_sync_pro(uuid,timestamptz,timestamptz,text) from public, anon, authenticated;
grant execute on function public.billing_sync_pro(uuid,timestamptz,timestamptz,text) to service_role;
