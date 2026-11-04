-- ============================================================
-- Wonder V 分潤系統 — 階段 5：退款時自動沖銷分潤
-- 2026-11-04（已於線上執行並驗證）
--
-- 為什麼放在資料庫而不是後台程式：
--   這是「付錢出去」的事。漏沖銷＝多付一筆給夥伴，而且沒人會發現。
--   放在 trigger，不管狀態是誰改的、從哪裡改的都會跟著沖銷：
--     後台介面改              → 觸發
--     直接下 SQL              → 觸發
--     之後接綠界的退款 webhook → 自動涵蓋，不必再寫一次
--
-- 線上退票目前還沒做（節目頁寫的是來信申請），但後台的訂單狀態
-- 已經有「已退款」選項，那就是現成的觸發點。
--
-- 刻意不處理的情況：已經標為 paid 的分潤不自動沖銷。
--   錢已經匯出去了，系統不該假裝沒發生。那種情況留著 paid 狀態
--   並在 note 記上訂單已退款，由人工決定要不要跟夥伴追回。
-- ============================================================

begin;

create or replace function public.sync_commission_on_refund()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 轉為已退款 → 沖銷（但不動已付款的）
  if new.status = '已退款' and coalesce(old.status, '') <> '已退款' then
    update affiliate_commissions
       set status = 'reversed',
           note   = coalesce(note || ' / ', '') || '訂單於 ' ||
                    to_char(now() at time zone 'Asia/Taipei', 'YYYY-MM-DD') || ' 退款'
     where order_id = new.id
       and status in ('pending', 'approved');

    -- 已經付出去的只留註記，不改狀態
    update affiliate_commissions
       set note = coalesce(note || ' / ', '') || '⚠️ 訂單已退款，但分潤已付，需人工追回'
     where order_id = new.id
       and status = 'paid'
       and coalesce(note, '') not like '%需人工追回%';

  -- 從已退款改回來（誤標修正）→ 恢復成待確認
  elsif coalesce(old.status, '') = '已退款' and new.status <> '已退款' then
    update affiliate_commissions
       set status = 'pending',
           note   = coalesce(note || ' / ', '') || '退款狀態已取消，分潤恢復'
     where order_id = new.id
       and status = 'reversed';
  end if;

  return new;
end;
$$;

drop trigger if exists orders_commission_refund on public.orders;
create trigger orders_commission_refund
  after update of status on public.orders
  for each row
  when (old.status is distinct from new.status)
  execute function public.sync_commission_on_refund();

commit;


-- ── 跑完確認（唯讀）────────────────────────────────────────
-- select tgname, c.relname, pg_get_triggerdef(t.oid)
--   from pg_trigger t join pg_class c on c.oid = t.tgrelid
--  where not t.tgisinternal and t.tgname = 'orders_commission_refund';
