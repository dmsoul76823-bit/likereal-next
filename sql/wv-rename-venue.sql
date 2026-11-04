-- ============================================================
-- 場地改名：移除「微風廣場 9F」，改為「WonderV 展演場」，保留 A–E 廳
-- 2026-11-04 ／ 使用者已確認，此版可直接執行
--
-- ⚠️ 這支會修改 1154 筆活動與 6 筆座位圖，且無法復原。
--
-- 改完長這樣：
--   D 廳 · 微風廣場 9F          →  WonderV 展演場 · D 廳
--   D+E 廳（開通）· 微風廣場 9F  →  WonderV 展演場 · D+E 廳（開通）
--
-- 範圍（已查證，整個資料庫只有這兩個欄位存場地）：
--   events.venue   1139 筆「X 廳 · 微風廣場 9F」＋ 15 筆空字串
--                  那 15 筆是「山湖夢衍」在 E 廳的售票中場次，只是沒填
--   venues.name    A/B/C 廳各 150 位、D 廳 200、E 廳 400、D+E（開通）600
--   其他表（products / creators / program_art / settings）皆無場地字串，
--   「10F」整個資料庫不存在。
--
-- 做法：先改 venues.name，再把 events.venue 直接取自對應的 venues.name。
--   格式只有一個來源，不會兩邊各寫各的；那 15 筆空白也會一併補上。
--
-- 安全性：1154 筆活動全部都有 venue_id（已查證），前台靠 id 找座位圖，
--   改文字不影響選位；目前也沒有任何活動售出過票。
--
-- 重複執行安全：兩個 update 都有防呆條件，再按一次 Run 不會疊成
--   「WonderV 展演場 · WonderV 展演場 · A 廳」，也不會改到任何一筆。
-- ============================================================

begin;

-- 1) 座位圖名稱加上場地名，保留廳別
update venues
   set name = 'WonderV 展演場 · ' || name
 where name not like 'WonderV 展演場%';

-- 2) 活動的對外場地文字直接取自座位圖名稱（含原本空白的 15 筆）
update events e
   set venue = v.name
  from venues v
 where v.id = e.venue_id
   and coalesce(e.venue, '') <> v.name;

commit;


-- ── 跑完自動確認 ────────────────────────────────────
select '活動 venue' as 項目, coalesce(nullif(venue,''),'(空白)') as 內容, count(*)::text as 筆數
  from events group by 2
union all
select '座位圖 name', name, id::text from venues
union all
select '殘留「微風」', '應為 0', count(*)::text from events where venue like '%微風%'
union all
select '殘留「9F」', '應為 0', count(*)::text from events where venue like '%9F%'
union all
select '仍空白的活動', '應為 0', count(*)::text from events where coalesce(venue,'') = ''
order by 1, 3 desc;
