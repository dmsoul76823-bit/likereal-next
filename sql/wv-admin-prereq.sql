-- ═══════════════════════════════════════════════════════════
--  Wonder V 後台前置：場次編號自動產生 + 圖片上傳權限
--
--  只有 create / alter，沒有 drop table、delete 或 truncate。
--  可以重複執行，不會出錯。
-- ═══════════════════════════════════════════════════════════

-- ── 1. events.id 改成自動編號 ──────────────────────────────
-- 現況：events.id 是 bigint 但沒有預設值，新增場次時前端必須自己算號碼。
--       舊後台用 Date.now() 當號碼，兩個人同時新增就可能撞號。
create sequence if not exists public.events_id_seq;

select setval(
  'public.events_id_seq',
  greatest(coalesce((select max(id) from public.events), 0), 1)
);

alter table public.events
  alter column id set default nextval('public.events_id_seq');

alter sequence public.events_id_seq owned by public.events.id;

-- ── 2. 讓後台人員可以上傳圖片到 site-images ────────────────
-- site-images 是公開可讀的 bucket，但沒有寫入政策，所以後台帳號傳不上去。
-- 開放給 staff 名單內的帳號。
-- （staff 表只有 id / email / name / role / perms，沒有停用欄位，
--   所以這裡用「在不在名單內」判斷。）
drop policy if exists "staff upload site images" on storage.objects;
create policy "staff upload site images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'site-images'
    and exists (select 1 from public.staff where id = auth.uid())
  );

drop policy if exists "staff update site images" on storage.objects;
create policy "staff update site images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'site-images'
    and exists (select 1 from public.staff where id = auth.uid())
  );

-- ── 3. 順便印出目前真正的 staff 欄位與 has_perm 內容 ───────
-- 專案裡的 SQL 檔案與線上結構已經對不上，之後要改東西前先看這個。
select column_name, data_type
  from information_schema.columns
 where table_schema = 'public' and table_name = 'staff'
 order by ordinal_position;

select pg_get_functiondef(oid) as has_perm_定義
  from pg_proc
 where proname = 'has_perm' and pronamespace = 'public'::regnamespace;
