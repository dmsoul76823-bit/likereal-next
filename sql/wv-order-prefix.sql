-- ═══════════════════════════════════════════════════════════
--  Wonder V — 新訂單編號改用 WV- 前綴
--  用法：Supabase SQL Editor → New query → 全部貼上 → Run
--
--  這份只用 create or replace 覆蓋兩支函式，
--  沒有任何 drop / delete，不會動到任何既有資料。
--  舊訂單仍保留原本的 LR- 編號，只有之後新開的單會變成 WV-。
-- ═══════════════════════════════════════════════════════════

create or replace function public.buy_seats(
  p_event_id bigint,
  p_seats    jsonb,      -- [{"seat":"0-3","label":"A4","ticket":"VIP 沉浸席","price":2880}, ...]
  p_name     text,
  p_phone    text,
  p_email    text,
  p_invoice  jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_sold   jsonb;
  v_cap    int;
  v_name   text;
  v_dup    text;
  v_ids    jsonb;
  v_new    jsonb;
  v_order  text;
  v_amt    int;
  v_item   text;
  v_code   text;
  v_i      int := 0;
  r        record;
  v_passes jsonb := '[]'::jsonb;
begin
  if p_seats is null or jsonb_array_length(p_seats) = 0 then
    raise exception '沒有選擇座位';
  end if;
  if coalesce(trim(p_name),'') = '' or coalesce(trim(p_phone),'') = '' or coalesce(trim(p_email),'') = '' then
    raise exception '請填寫姓名、電話與 Email';
  end if;

  -- 鎖定場次
  select sold_seats, cap, name into v_sold, v_cap, v_name
    from public.events where id = p_event_id for update;
  if not found then raise exception '找不到此場次'; end if;

  -- 取出座位代碼陣列
  select coalesce(jsonb_agg(x->>'seat'), '[]'::jsonb) into v_ids
    from jsonb_array_elements(p_seats) as x;

  -- 檢查是否已售
  select t.value into v_dup
    from jsonb_array_elements_text(v_ids) as t(value)
   where v_sold ? t.value
   limit 1;
  if v_dup is not null then
    raise exception '座位已被其他人購買，請重新選位';
  end if;

  v_new := v_sold || v_ids;

  select coalesce(sum((x->>'price')::int), 0),
         string_agg(coalesce(x->>'ticket','') || ' ' || coalesce(x->>'label',''), '、')
    into v_amt, v_item
    from jsonb_array_elements(p_seats) as x;

  update public.events
     set sold_seats = v_new,
         sold       = jsonb_array_length(v_new),
         status     = case
                        when jsonb_array_length(v_new) >= cap then '已售罄'
                        when cap - jsonb_array_length(v_new) <= greatest(5, round(cap * 0.05)) then '即將售罄'
                        else status end,
         updated_at = now()
   where id = p_event_id;

  v_order := 'WV-' || to_char(now(),'YYYY') || '-' ||
             lpad(nextval('public.order_seq')::text, 4, '0');

  insert into public.orders (id, name, phone, email, item, amt, status, pay, order_date, used, invoice)
  values (v_order, trim(p_name), trim(p_phone), trim(p_email),
          v_name || ' · ' || coalesce(v_item,''), v_amt,
          '已付款', '線上', to_char(now(),'YYYY-MM-DD'), false, coalesce(p_invoice,'{}'::jsonb));

  -- 每個座位產生一張票
  for r in select value from jsonb_array_elements(p_seats) loop
    v_i := v_i + 1;
    v_code := v_order || '-' || v_i || '-' ||
              upper(substring(md5(random()::text || clock_timestamp()::text), 1, 4));
    insert into public.passes (code, order_id, event_id, event_name, seat, seat_label, ticket_name, price)
    values (v_code, v_order, p_event_id, v_name,
            r.value->>'seat', r.value->>'label', r.value->>'ticket',
            coalesce((r.value->>'price')::int, 0));
    v_passes := v_passes || jsonb_build_object(
      'code', v_code, 'seat_label', r.value->>'label',
      'ticket', r.value->>'ticket', 'price', (r.value->>'price')::int);
  end loop;

  return jsonb_build_object(
    'order_id', v_order, 'amount', v_amt,
    'event', v_name, 'passes', v_passes);
end $$;

create or replace function public.change_seat(
  p_code   text,     -- 票券編號
  p_seat   text,     -- 新座位 "3-12"
  p_label  text,     -- 新座位代號 "D13"
  p_ticket text,     -- 新票種名稱
  p_price  int       -- 新票種單價
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  p      public.passes%rowtype;
  o      public.orders%rowtype;
  e      public.events%rowtype;
  v_sold jsonb;
  v_diff int;
  v_ord  text;
begin
  select * into p from public.passes where upper(code) = upper(trim(p_code)) for update;
  if not found then raise exception '查無此票券'; end if;

  select * into o from public.orders where id = p.order_id;
  if o.status <> '已付款' then raise exception '訂單狀態為「%」，無法換位', o.status; end if;
  if p.used then raise exception '此票券已入場，無法換位'; end if;
  if coalesce(p.changed_count,0) > 0 then
    raise exception '每張票券僅限換位一次，此票券已於 % 換過',
      to_char(p.changed_at at time zone 'Asia/Taipei','YYYY/MM/DD HH24:MI');
  end if;

  -- 鎖定場次，避免與其他人同時搶同一個位子
  select * into e from public.events where id = p.event_id for update;
  if not found then raise exception '找不到此場次'; end if;
  if e.show_date < current_date then raise exception '演出已結束，無法換位'; end if;

  if p_seat = p.seat then raise exception '新座位與原座位相同'; end if;

  v_sold := coalesce(e.sold_seats, '[]'::jsonb);
  if v_sold ? p_seat then raise exception '這個座位已被購買，請重新選位'; end if;

  -- 只能換同價或更高價的票種（差額補款，不退差額）
  v_diff := coalesce(p_price,0) - coalesce(p.price,0);
  if v_diff < 0 then
    raise exception '僅提供同級或升級換位，不受理降級退差額';
  end if;

  -- 釋放舊位、佔用新位
  update public.events
     set sold_seats = (
           select coalesce(jsonb_agg(t.value), '[]'::jsonb) || to_jsonb(array[p_seat])
             from jsonb_array_elements_text(v_sold) as t(value)
            where t.value <> p.seat),
         updated_at = now()
   where id = e.id;

  update public.events
     set sold   = jsonb_array_length(coalesce(sold_seats,'[]'::jsonb)),
         status = case
                    when jsonb_array_length(coalesce(sold_seats,'[]'::jsonb)) >= cap then '已售罄'
                    when cap - jsonb_array_length(coalesce(sold_seats,'[]'::jsonb))
                         <= greatest(5, round(cap * 0.05)) then '即將售罄'
                    else '售票中' end
   where id = e.id;

  -- 保留原始資料後更新票券
  update public.passes
     set orig_seat       = coalesce(orig_seat, seat),
         orig_seat_label = coalesce(orig_seat_label, seat_label),
         orig_ticket     = coalesce(orig_ticket, ticket_name),
         orig_price      = coalesce(orig_price, price),
         seat            = p_seat,
         seat_label      = p_label,
         ticket_name     = p_ticket,
         price           = coalesce(p_price, price),
         changed_count   = 1,
         changed_at      = now()
   where code = p.code
   returning * into p;

  -- 有差額就開一張補款訂單（方便對帳；金流串接後可改為線上補款）
  if v_diff > 0 then
    v_ord := 'WV-' || to_char(now(),'YYYY') || '-' ||
             lpad(nextval('public.order_seq')::text, 4, '0');
    insert into public.orders (id, name, phone, email, item, amt, status, pay, order_date, used, invoice)
    values (v_ord, o.name, o.phone, o.email,
            e.name || ' · 換位補差額（' || coalesce(p.orig_seat_label,'') || ' → ' || p_label || '）',
            v_diff, '待付款', '補差額', to_char(now(),'YYYY-MM-DD'), false, coalesce(o.invoice,'{}'::jsonb));
  end if;

  return jsonb_build_object(
    'ok', true,
    'pass', to_jsonb(p),
    'diff', v_diff,
    'diff_order', v_ord,
    'msg', case when v_diff > 0
                then '換位成功，需補差額 NT$' || v_diff
                else '換位成功' end);
end $$;

select '訂單編號前綴已改為 WV- ✓' as result;
