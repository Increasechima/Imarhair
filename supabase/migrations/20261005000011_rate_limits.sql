-- M5: fixed-window rate limiting for public forms and checkout
-- (Architecture.md §9). Keys are hashed (sha256 of bucket + IP) by the app,
-- so no raw IP addresses are stored. Service role only.

create table public.rate_limits (
  key           text primary key check (char_length(key) between 8 and 200),
  window_start  timestamptz not null default now(),
  count         int not null default 1 check (count >= 0)
);

create index rate_limits_window_idx on public.rate_limits (window_start);

alter table public.rate_limits enable row level security;
-- No policies: anon/authenticated can't read or write; the service role bypasses RLS.
revoke all on public.rate_limits from anon, authenticated;

-- Returns true when the call is allowed (count within p_max for the window).
create or replace function public.check_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  insert into public.rate_limits as rl (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    count = case
      when rl.window_start < now() - make_interval(secs => p_window_seconds) then 1
      else rl.count + 1
    end,
    window_start = case
      when rl.window_start < now() - make_interval(secs => p_window_seconds) then now()
      else rl.window_start
    end
  returning rl.count into v_count;
  return v_count <= p_max;
end;
$$;

revoke execute on function public.check_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, int, int) to service_role;

-- Daily clean-up of stale windows.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'imar-prune-rate-limits',
      '17 3 * * *',
      $job$delete from public.rate_limits where window_start < now() - interval '1 day'$job$
    );
  end if;
end;
$$;
