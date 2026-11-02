-- ═══════════════════════════════════════════════════════════
--  Wonder V — 把 settings 裡殘留的 LiReal 字樣改掉
--  只有 update 兩列設定，沒有 drop / delete。
-- ═══════════════════════════════════════════════════════════

-- 1) Banner 文案：「LiReal XR沉浸場域首映」→「Wonder V 全息場域首映」
update public.settings
   set value = jsonb_set(
         value,
         '{v}',
         (
           select jsonb_agg(
             case when b->>'sub' like '%LiReal%'
                  then jsonb_set(b, '{sub}', to_jsonb(replace(b->>'sub', 'LiReal XR', 'Wonder V 全息')))
                  else b end
           )
           from jsonb_array_elements(value->'v') as b
         )
       )
 where key = 'banners';

-- 2) SEO 設定的標題、描述與網址
update public.settings
   set value = jsonb_set(
         jsonb_set(
           jsonb_set(value, '{v,t}', to_jsonb('Wonder V 沉浸式場域 | 虛擬與現實整合劇場'::text)),
           '{v,d}', to_jsonb('Wonder V 提供沉浸式場域節目、直播互動、AI 夥伴陪伴與裸視 3D 精選商品，打造虛實整合的娛樂體驗。'::text)
         ),
         '{v,u}', to_jsonb('https://likereal-next.vercel.app'::text)
       )
 where key = 'seo';

select key, value from public.settings where key in ('banners','seo');
