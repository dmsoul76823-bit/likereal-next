-- ============================================================
-- 清理階段 3 的測試資料
-- 2026-11-04
--
-- ⚠️ 這支會【永久刪除】訂單與票券，無法復原。跑之前請先看預覽。
--
-- 刪除範圍：姓名以「測試」開頭的訂單（WV-2026-1005~1008），
--           以及它們的票券、分潤紀錄，並把座位釋放回場次。
--
-- 【保留】測試夥伴 A（test-kol）與它的兩條分潤規則 ——
--         階段 4 改寫 get_affiliate_dashboard 時還要用它驗證。
--
-- 為什麼要清：後台儀表板的總營收、訂單數、售出票券都已經把這些
--             測試資料算進去了，留著會污染你的營運數字。
-- ============================================================

-- ── 第一段：預覽。可以單獨先跑這一段確認範圍 ────────────────
select '將刪除的訂單' as 項目, id as 內容, name as 備註, amt::text as 金額
  from orders where name like '測試%'
union all
select '將刪除的票券', code, event_name, seat_label
  from passes where order_id in (select id from orders where name like '測試%')
union all
select '將刪除的分潤', order_id, target_key, amount::text
  from affiliate_commissions
 where order_id in (select id from orders where name like '測試%')
union all
select '將釋放的座位', p.seat, e.name, e.id::text
  from passes p join events e on e.id = p.event_id
 where p.order_id in (select id from orders where name like '測試%')
order by 1, 2;


-- ── 第二段：實際刪除 ────────────────────────────────────────
-- 確認過預覽之後，再把下面整段的註解拿掉來執行。

-- begin;
--
-- -- 1) 先把座位釋放回場次（這一步要在刪 passes 之前，因為它讀 passes）
-- update events e
--    set sold_seats = (
--          select coalesce(jsonb_agg(x), '[]'::jsonb)
--            from jsonb_array_elements_text(e.sold_seats) x
--           where x not in (
--             select p.seat from passes p
--              where p.event_id = e.id
--                and p.order_id in (select id from orders where name like '測試%')
--           )
--        ),
--        sold = greatest(0, coalesce(e.sold, 0) - (
--          select count(*) from passes p
--           where p.event_id = e.id
--             and p.order_id in (select id from orders where name like '測試%')
--        ))
--  where e.id in (
--    select distinct p.event_id from passes p
--     where p.order_id in (select id from orders where name like '測試%')
--  );
--
-- -- 2) 分潤紀錄
-- delete from affiliate_commissions
--  where order_id in (select id from orders where name like '測試%');
--
-- -- 3) 票券
-- delete from passes
--  where order_id in (select id from orders where name like '測試%');
--
-- -- 4) 測試期間的點擊紀錄
-- delete from affiliate_clicks
--  where affiliate_id in (select id from affiliates where code = 'test-kol');
--
-- -- 5) 訂單本身（最後刪，前面幾步都靠它篩選）
-- delete from orders where name like '測試%';
--
-- commit;


-- ── 第三段：刪除後確認（唯讀）──────────────────────────────
-- select '剩餘測試訂單' as chk, count(*)::text as val from orders where name like '測試%'
-- union all
-- select '妖怪森林已售', coalesce(sold,0)::text from events where id = 900038
-- union all
-- select '妖怪森林座位', coalesce(sold_seats::text,'[]') from events where id = 900038
-- union all
-- select '剩餘分潤紀錄', count(*)::text from affiliate_commissions
-- union all
-- select '保留的夥伴', coalesce(string_agg(code, ', '), '（無）') from affiliates;
