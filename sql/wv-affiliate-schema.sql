-- ============================================================
-- Wonder V 分潤系統 — 階段 1：資料表結構
-- 2026-11-04
--
-- 決定（Aden 2026-11-04）：
--   A3 歸因：券碼優先，沒有券碼才用瀏覽器存的推薦碼
--   B3 規則：全站預設費率 + 個別節目／產品加碼
--   C2 金額：另開分潤帳本，不直接記在 orders 上
--   追加：電商分潤以「產品 + 夥伴」計算
--
-- 查證後的現況：
--   affiliates / affiliate_rules / affiliate_clicks /
--   coupons / coupon_redemptions 全部 0 筆 → 改結構不用搬資料
--   affiliate_rules.event_id、coupons.event_id、affiliate_clicks.event_id
--     都是 uuid，但線上 events.id 是 bigint → 指向不存在的表，直接換掉
--   passes.event_id 是 bigint 且有 event_name
--     → 票券訂單的節目歸因走 orders.id → passes.order_id → passes.event_name
--   orders 只有 4 筆，加可為 null 的欄位是安全的
--
-- 這支可以重複執行（2026-11-04 補）：原本 add constraint 沒有
-- if not exists，重跑會噴 42710，現在每個都先 drop if exists。
--
-- 這支不動 buy_seats。結帳函式是線上實際在跑的，
-- 留到階段 3 單獨處理並單獨驗證。
-- ============================================================

begin;

-- ── 1. 規則目標改成 target_type / target_key ────────────────
--    'all'     → target_key 為 null，此夥伴的全站預設費率
--    'program' → target_key = program_art.name
--    'product' → target_key = products.id 的文字形式
alter table public.affiliate_rules
  drop column if exists event_id,
  add  column if not exists target_type text not null default 'all',
  add  column if not exists target_key  text;

alter table public.affiliate_rules drop constraint if exists affiliate_rules_target_type_chk;
alter table public.affiliate_rules
  add constraint affiliate_rules_target_type_chk
  check (target_type in ('all', 'program', 'product'));

-- 'all' 不該帶 target_key；'program'/'product' 一定要帶
alter table public.affiliate_rules drop constraint if exists affiliate_rules_target_key_chk;
alter table public.affiliate_rules
  add constraint affiliate_rules_target_key_chk
  check (
    (target_type = 'all' and target_key is null)
    or (target_type <> 'all' and target_key is not null)
  );

-- 同一個夥伴對同一個目標只能有一條規則
create unique index if not exists affiliate_rules_uniq
  on public.affiliate_rules (affiliate_id, target_type, coalesce(target_key, ''));


-- ── 2. 優惠券的適用範圍，用同一套描述方式 ───────────────────
alter table public.coupons
  drop column if exists event_id,
  add  column if not exists target_type text not null default 'all',
  add  column if not exists target_key  text;

alter table public.coupons drop constraint if exists coupons_target_type_chk;
alter table public.coupons
  add constraint coupons_target_type_chk
  check (target_type in ('all', 'program', 'product'));


-- ── 3. 點擊紀錄：記下是從哪個節目／產品頁進來的 ─────────────
alter table public.affiliate_clicks
  drop column if exists event_id,
  add  column if not exists target_type text,
  add  column if not exists target_key  text;


-- ── 4. orders 只存「歸因結果」，金額放帳本 ──────────────────
alter table public.orders
  add column if not exists ref_code      text,
  add column if not exists attributed_by text;

alter table public.orders drop constraint if exists orders_attributed_by_chk;
alter table public.orders
  add constraint orders_attributed_by_chk
  check (attributed_by is null or attributed_by in ('coupon', 'click'));

create index if not exists orders_ref_code_idx on public.orders (ref_code)
  where ref_code is not null;


-- ── 5. 分潤帳本 ─────────────────────────────────────────────
-- 為什麼不直接記在 orders 上：票會退，分潤要跟著沖銷。
-- 帳本才查得出「這筆錢為什麼變了」。後台會員分頁那個
-- 「直接改錢包不留紀錄」就是反面教材。
create table if not exists public.affiliate_commissions (
  id            uuid primary key default gen_random_uuid(),
  affiliate_id  uuid not null references public.affiliates(id) on delete cascade,
  order_id      text not null,
  rule_id       uuid references public.affiliate_rules(id) on delete set null,

  -- 留存計算當下的條件，之後規則改了也查得出這筆是怎麼算的
  target_type   text,
  target_key    text,
  base_amount   integer not null default 0,
  rate_type     text,
  rate_value    numeric,

  amount        numeric not null default 0,
  status        text    not null default 'pending',
  note          text,
  created_at    timestamptz not null default now(),
  settled_at    timestamptz
);

alter table public.affiliate_commissions drop constraint if exists affiliate_commissions_status_chk;
alter table public.affiliate_commissions
  add constraint affiliate_commissions_status_chk
  check (status in ('pending', 'approved', 'paid', 'reversed'));

-- 一筆訂單對同一個夥伴只記一次
create unique index if not exists affiliate_commissions_order_uniq
  on public.affiliate_commissions (order_id, affiliate_id);

create index if not exists affiliate_commissions_affiliate_idx
  on public.affiliate_commissions (affiliate_id, status);


-- ── 6. RLS ──────────────────────────────────────────────────
-- 分潤資料只有後台能碰。夥伴看自己的數字是透過
-- get_affiliate_dashboard（security definer + dashboard_token），
-- 不需要、也不應該給他們直接讀表的權限。
alter table public.affiliate_commissions enable row level security;

drop policy if exists staff_all_affiliate_commissions on public.affiliate_commissions;
create policy staff_all_affiliate_commissions on public.affiliate_commissions
  for all
  using (has_perm('affiliate'))
  with check (has_perm('affiliate'));

commit;


-- ── 跑完確認（唯讀）────────────────────────────────────────
select 'affiliate_rules 欄位' as chk, string_agg(column_name, ', ' order by ordinal_position) as val
  from information_schema.columns
 where table_schema='public' and table_name='affiliate_rules'
union all
select 'coupons 新欄位', string_agg(column_name, ', ')
  from information_schema.columns
 where table_schema='public' and table_name='coupons' and column_name in ('target_type','target_key')
union all
select 'orders 新欄位', string_agg(column_name, ', ')
  from information_schema.columns
 where table_schema='public' and table_name='orders' and column_name in ('ref_code','attributed_by')
union all
select 'affiliate_commissions 欄位數', count(*)::text
  from information_schema.columns
 where table_schema='public' and table_name='affiliate_commissions'
union all
select '殘留的 event_id 欄位', coalesce(string_agg(table_name, ', '), '（已清除）')
  from information_schema.columns
 where table_schema='public' and column_name='event_id'
   and table_name in ('affiliate_rules','coupons','affiliate_clicks');
