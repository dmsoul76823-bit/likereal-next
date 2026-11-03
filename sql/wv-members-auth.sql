-- ============================================================
-- Wonder V 會員系統：members 接上 Supabase Auth
-- 2026-11-03
--
-- 【事前盤點 — 全部取自線上實況，不是照舊 SQL 檔推測】
--   members           id 是 bigint、5 筆示範資料、沒有任何外鍵指向它
--   point_logs        member_id 已經是 uuid
--   refund_requests   member_id 已經是 uuid
--   apply_order_points(p_member_id uuid)   會寫 points / pending_points
--   recalc_member_tier(mid uuid)           會寫 tier_id
--   release_due_points()                   會寫 points / pending_points / total_spent
--   buy_seats / change_seat / check_in     完全沒碰 members（購票流程不受影響）
--   orders            沒有 member_id，靠 email + phone 對人
--   RLS               members 只有 staff_all_members = has_perm('members')
--                     point_logs 開了 RLS 但一條政策都沒有
--   筆數              auth.users 4 / members 5 / orders 4 / point_logs 1
--
-- 結論：點數與等級機制本來就是照 uuid 設計的，只有 members 停在 bigint。
--       這支 migration 是把早就寫好卻接不上的東西接起來。
-- ============================================================

begin;

-- ── 1. 舊的 5 筆示範會員整張搬走保存，不刪 ──────────────────
--    RLS 政策會跟著表一起過去，後台仍讀得到。
alter table public.members rename to members_legacy;


-- ── 2. 新的 members：主鍵直接就是 auth.users.id ─────────────
create table public.members (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text,
  name           text,
  phone          text,

  wallet         integer not null default 0,  -- 儲值幣（Wonder V 後台在用）
  points         integer not null default 0,  -- 可用點數
  pending_points integer not null default 0,  -- 未解鎖點數
  total_spent    integer not null default 0,
  orders_count   integer not null default 0,

  tier_id        uuid references public.member_tiers(id),
  join_date      date not null default current_date,
  created_at     timestamptz not null default now()
);

create index members_email_idx on public.members (lower(email));

alter table public.members enable row level security;


-- ── 3. RLS ──────────────────────────────────────────────────
-- 3a. 後台：照原本 staff_all_members 的定義原樣重建，不自己發明條件
create policy staff_all_members on public.members
  for all
  using (has_perm('members'))
  with check (has_perm('members'));

-- 3b. 會員讀自己
create policy members_self_read on public.members
  for select
  using (auth.uid() = id);

-- 3c. 會員改自己（能改哪些欄位由下面的 trigger 把關）
create policy members_self_update on public.members
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- ── 4. 防竄改：會員只能改姓名與電話 ─────────────────────────
-- 為什麼不用欄位層級的 grant：後台人員登入後也是 authenticated 角色，
-- revoke update 會把後台改錢包的功能一起擋掉。
--
-- 為什麼判斷 current_user 而不是只看 has_perm：
-- apply_order_points / release_due_points 是 SECURITY DEFINER，由會員自己觸發。
-- 那時 has_perm('members') 是 false，若只看它，剛發的點數會被這支 trigger
-- 原地還原，點數系統會變成「有跑但數字永遠是 0」。
-- SECURITY DEFINER 執行時 current_user 是函式擁有者（postgres），
-- 前端直接打 API 才是 authenticated / anon，只擋後者。
create or replace function public.members_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') and not has_perm('members') then
    new.id             := old.id;
    new.email          := old.email;
    new.wallet         := old.wallet;
    new.points         := old.points;
    new.pending_points := old.pending_points;
    new.total_spent    := old.total_spent;
    new.orders_count   := old.orders_count;
    new.tier_id        := old.tier_id;
    new.join_date      := old.join_date;
    new.created_at     := old.created_at;
  end if;
  return new;
end;
$$;

create trigger members_guard_update
  before update on public.members
  for each row execute function public.members_guard();


-- ── 5. 註冊時自動建立會員資料列，等級給最低階 ───────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.members (id, email, name, tier_id)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    (select id from public.member_tiers order by level limit 1)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ── 6. 回填現有的 4 個 auth 帳號 ────────────────────────────
insert into public.members (id, email, name, tier_id)
select u.id,
       u.email,
       coalesce(nullif(u.raw_user_meta_data ->> 'name', ''), split_part(u.email, '@', 1)),
       (select id from public.member_tiers order by level limit 1)
from auth.users u
on conflict (id) do nothing;


-- ── 7. point_logs 開著 RLS 卻零政策，等於誰都讀不到 ─────────
drop policy if exists point_logs_self_read on public.point_logs;
create policy point_logs_self_read on public.point_logs
  for select
  using (auth.uid() = member_id);

drop policy if exists point_logs_staff_all on public.point_logs;
create policy point_logs_staff_all on public.point_logs
  for all
  using (has_perm('members'))
  with check (has_perm('members'));

commit;


-- ── 跑完自我檢查（唯讀，可單獨再執行一次）──────────────────
-- select 'members 欄位型別' as chk, data_type as val
--   from information_schema.columns
--  where table_schema='public' and table_name='members' and column_name='id'
-- union all
-- select '新 members 筆數', count(*)::text from public.members
-- union all
-- select '保留的舊資料', count(*)::text from public.members_legacy
-- union all
-- select '政策數', count(*)::text from pg_policies
--  where schemaname='public' and tablename='members';
