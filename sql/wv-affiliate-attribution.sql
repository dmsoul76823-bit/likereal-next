-- ============================================================
-- Wonder V 分潤系統 — 階段 3：購票歸因
-- 2026-11-04
--
-- ⚠️ 這支【完全不修改 buy_seats】。
--    原因：CREATE OR REPLACE 不能改參數列表，加一個參數會變成
--    多載而不是取代，資料庫裡會有兩個 buy_seats，PostgREST 就會
--    回「could not choose best candidate function」（reserve_seats
--    現在就是兩個多載版本，正是前車之鑑）。要避開就得 DROP 再
--    CREATE，等於把線上正在賣票的函式刪掉重建 —— 不值得冒這個險。
--
--    改為新建一支包裝函式 buy_seats_ref，它呼叫原本的 buy_seats，
--    再補上歸因。前端改呼叫這一支。出事只要把前端改回去就好。
--
-- buy_seats 的事實（已查證）：
--   (p_event_id bigint, p_seats jsonb, p_name text, p_phone text,
--    p_email text, p_invoice jsonb) → jsonb，security definer
--   回傳 { order_id, amount, passes[] }
-- ============================================================

begin;

-- ── 1. 修好 record_affiliate_click ──────────────────────────
-- 它原本寫入 affiliate_clicks.event_id，但那個欄位在階段 1 被我
-- 換成 target_type / target_key 了 —— 所以從階段 1 之後，點擊紀錄
-- 就一直靜靜地失敗（RefCapture 用 try/catch 包著，不會有任何跡象）。
-- 參數也跟著改，所以必須 drop 再 create；這支只是記點擊，不涉及金流。
drop function if exists public.record_affiliate_click(text, uuid);

create or replace function public.record_affiliate_click(
  p_code        text,
  p_target_type text default null,
  p_target_key  text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id
    from affiliates
   where code = lower(p_code) and is_active
   limit 1;
  if v_id is null then return; end if;

  insert into affiliate_clicks (affiliate_id, target_type, target_key)
  values (v_id, p_target_type, p_target_key);
end;
$$;

grant execute on function public.record_affiliate_click(text, text, text) to anon, authenticated;


-- ── 2. 挑出最適用的規則 ─────────────────────────────────────
-- 愈具體愈優先：先找該節目／商品的規則，沒有才用全站預設。
create or replace function public.resolve_affiliate_rule(
  p_affiliate_id uuid,
  p_target_type  text,
  p_target_key   text
)
returns affiliate_rules
language sql
stable
security definer
set search_path = public
as $$
  select *
    from affiliate_rules
   where affiliate_id = p_affiliate_id
     and is_active is not false
     and (
       (target_type = p_target_type and target_key = p_target_key)
       or target_type = 'all'
     )
   order by case when target_type = 'all' then 1 else 0 end
   limit 1;
$$;


-- ── 3. 包裝函式：買票 + 歸因 ────────────────────────────────
create or replace function public.buy_seats_ref(
  p_event_id bigint,
  p_seats    jsonb,
  p_name     text,
  p_phone    text,
  p_email    text,
  p_invoice  jsonb,
  p_ref      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result   jsonb;
  v_order_id text;
  v_amount   integer;
  v_aff      affiliates%rowtype;
  v_rule     affiliate_rules%rowtype;
  v_program  text;
  v_amt      numeric;
begin
  -- 先賣票。這一段原封不動交給既有的 buy_seats，
  -- 它要是失敗就讓它正常往外丟，跟以前的行為完全一樣。
  v_result := buy_seats(p_event_id, p_seats, p_name, p_phone, p_email, p_invoice);

  if p_ref is null or btrim(p_ref) = '' then
    return v_result;
  end if;

  -- 以下全部包在例外處理裡：
  -- 分潤記帳出任何差錯，都不可以讓已經成立的訂單失敗。
  -- 寧可少記一筆分潤，也不能讓客人買不到票。
  begin
    v_order_id := v_result ->> 'order_id';
    v_amount   := coalesce((v_result ->> 'amount')::integer, 0);
    if v_order_id is null then return v_result; end if;

    select * into v_aff
      from affiliates
     where code = lower(btrim(p_ref)) and is_active
     limit 1;
    if not found then return v_result; end if;

    select name into v_program from events where id = p_event_id;

    v_rule := resolve_affiliate_rule(v_aff.id, 'program', v_program);
    if v_rule.id is null then
      -- 沒有任何適用規則就只記歸因，不產生分潤
      update orders
         set ref_code = v_aff.code, attributed_by = 'click'
       where id = v_order_id;
      return v_result;
    end if;

    v_amt := case
      when v_rule.commission_type = 'percent'
        then round(v_amount * v_rule.commission_value / 100.0, 2)
      else v_rule.commission_value
    end;

    update orders
       set ref_code = v_aff.code, attributed_by = 'click'
     where id = v_order_id;

    insert into affiliate_commissions (
      affiliate_id, order_id, rule_id,
      target_type, target_key,
      base_amount, rate_type, rate_value, amount, status
    ) values (
      v_aff.id, v_order_id, v_rule.id,
      v_rule.target_type, v_rule.target_key,
      v_amount, v_rule.commission_type, v_rule.commission_value, v_amt, 'pending'
    )
    on conflict (order_id, affiliate_id) do nothing;

  exception when others then
    -- 吞掉並繼續。訂單已經成立，這裡不能翻盤。
    raise warning 'buy_seats_ref 歸因失敗 order=% ref=% err=%', v_order_id, p_ref, sqlerrm;
  end;

  return v_result;
end;
$$;

grant execute on function public.buy_seats_ref(bigint, jsonb, text, text, text, jsonb, text)
  to anon, authenticated;

commit;


-- ── 跑完確認（唯讀）────────────────────────────────────────
select p.proname as func,
       pg_get_function_identity_arguments(p.oid) as args,
       pg_get_function_result(p.oid) as returns
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.prokind = 'f'
   and p.proname in ('buy_seats', 'buy_seats_ref',
                     'record_affiliate_click', 'resolve_affiliate_rule')
 order by 1, 2;
