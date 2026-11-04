-- ============================================================
-- Wonder V 分潤系統 — 階段 1b：補上後台的 RLS 政策
-- 2026-11-04
--
-- 為什麼需要這支：
--   建立測試夥伴時噴了
--     new row violates row-level security policy for table "affiliates"
--   affiliates / affiliate_rules / coupons 這些表都開了 RLS，
--   但沒有任何政策讓後台寫入 —— 我先前只替新建的
--   affiliate_commissions 加了政策，誤以為既有的表已經有了。
--
-- has_perm 的行為（已查證）：對 role='admin' 一律回 true，
--   連不存在的權限字串也是；非管理者才會去比對 perms 陣列。
--   所以用 has_perm('affiliate') 是安全的。
--
-- 這幾支政策是「新增」而不是「取代」—— 既有的其他政策
-- （如果有的話）仍然有效，permissive 政策之間是 OR 關係。
-- ============================================================

begin;

-- affiliates
alter table public.affiliates enable row level security;
drop policy if exists staff_all_affiliates on public.affiliates;
create policy staff_all_affiliates on public.affiliates
  for all using (has_perm('affiliate')) with check (has_perm('affiliate'));

-- affiliate_rules
alter table public.affiliate_rules enable row level security;
drop policy if exists staff_all_affiliate_rules on public.affiliate_rules;
create policy staff_all_affiliate_rules on public.affiliate_rules
  for all using (has_perm('affiliate')) with check (has_perm('affiliate'));

-- affiliate_clicks
-- 前台記錄點擊是透過 record_affiliate_click（security definer），
-- 不需要開放一般使用者直接寫入。這裡只給後台查看。
alter table public.affiliate_clicks enable row level security;
drop policy if exists staff_all_affiliate_clicks on public.affiliate_clicks;
create policy staff_all_affiliate_clicks on public.affiliate_clicks
  for all using (has_perm('affiliate')) with check (has_perm('affiliate'));

-- coupons：折扣碼的驗證走 validate_coupon（security definer），
-- 前台不直接讀表，所以一樣只給後台。
alter table public.coupons enable row level security;
drop policy if exists staff_all_coupons on public.coupons;
create policy staff_all_coupons on public.coupons
  for all using (has_perm('affiliate')) with check (has_perm('affiliate'));

-- coupon_redemptions
alter table public.coupon_redemptions enable row level security;
drop policy if exists staff_all_coupon_redemptions on public.coupon_redemptions;
create policy staff_all_coupon_redemptions on public.coupon_redemptions
  for all using (has_perm('affiliate')) with check (has_perm('affiliate'));

commit;


-- ── 跑完確認（唯讀）────────────────────────────────────────
select tablename, policyname, cmd
  from pg_policies
 where schemaname = 'public'
   and tablename in ('affiliates','affiliate_rules','affiliate_clicks',
                     'coupons','coupon_redemptions','affiliate_commissions')
 order by tablename, policyname;
