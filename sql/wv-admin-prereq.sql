-- ═══════════════════════════════════════════════════════════
--  Wonder V 後台前置：場次編號自動產生 + 圖片上傳權限
--
--  只有 create / alter / grant，沒有 drop table / delete，
--  不會動到任何既有資料。
-- ═══════════════════════════════════════════════════════════

-- ── 1. events.id 改成自動編號 ──────────────────────────────
-- 現況：events.id 是 bigint 但沒有預設值，所以新增場次時
--       前端必須自己算一個號碼。舊後台用 Date.now()，
--       兩個人同時新增就可能撞號，整批新增直接失敗。
-- 改法：建一個序列，從現有最大號之後開始發號。
create sequence if not exists public.events_id_seq;

select setval(
  'public.events_id_seq',
  greatest(coalesce((select max(id) from public.events), 0), 1)
);

alter table public.events
  alter column id set default nextval('public.events_id_seq');

alter sequence public.events_id_seq owned by public.events.id;

-- ── 2. 讓後台人員可以上傳圖片到 site-images ────────────────
-- 現況：bucket 是 service_role 建的，公開可讀，但沒有寫入政策，
--       所以後台登入的帳號傳不上去（只能像以前那樣塞 base64 進資料庫）。
-- 改法：只有 staff 名單內、且啟用中的帳號可以上傳與覆蓋。

create policy "staff upload site images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'site-images'
    and exists (
      select 1 from public.staff
      where id = auth.uid() and is_active = true
    )
  );

create policy "staff update site images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'site-images'
    and exists (
      select 1 from public.staff
      where id = auth.uid() and is_active = true
    )
  );

select '後台前置設定完成 ✓' as result;
