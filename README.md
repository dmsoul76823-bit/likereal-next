# Like Real — Next.js 專案安裝步驟

## 1. 建立 Next.js 專案

終端機（在你想放專案的資料夾）：

```
npx create-next-app@latest likereal-next
```

問答一路這樣選：

| 問題 | 選 |
|---|---|
| TypeScript? | **No** |
| ESLint? | Yes |
| Tailwind CSS? | **No** |
| src/ directory? | **No** |
| App Router? | **Yes** |
| Turbopack? | Yes |
| import alias? | **No**（用預設） |

然後：

```
cd likereal-next
npm install @supabase/supabase-js
```

## 2. 覆蓋檔案

把這個資料夾裡的所有檔案，**照原本的資料夾結構**覆蓋到 `likereal-next` 裡。

會覆蓋／新增這些：

```
likereal-next/
├── .env.local                        ← 新增（金鑰，已幫你填好）
├── jsconfig.json                     ← 覆蓋
├── lib/
│   ├── supabase.js                   ← 新增
│   └── theme.js                      ← 新增
├── components/
│   └── ui.js                         ← 新增
└── app/
    ├── layout.js                     ← 覆蓋
    ├── globals.css                   ← 覆蓋
    ├── page.js                       ← 覆蓋
    ├── HomeClient.js                 ← 新增
    ├── sitemap.js                    ← 新增
    ├── robots.js                     ← 新增
    ├── admin/
    │   └── page.js                   ← 新增
    └── events/
        └── [slug]/
            ├── page.js               ← 新增
            ├── EventClient.js        ← 新增
            └── buy/
                ├── page.js           ← 新增
                └── BuyClient.js      ← 新增
```

**注意：** `[slug]` 資料夾名稱要含中括號，這是 Next.js 的動態路由寫法。

如果 create-next-app 產生了 `app/page.module.css`，可以直接刪掉，用不到。

## 3. 啟動

```
npm run dev
```

瀏覽器開 http://localhost:3000

- 首頁：活動列表
- 活動頁：http://localhost:3000/events/interstitial
- 後台：http://localhost:3000/admin
- Sitemap：http://localhost:3000/sitemap.xml

## 4. 後台登入

用你在 Supabase 建的帳號密碼登入 `/admin`。

## 5. 部署到 Vercel

推上 GitHub 後，在 Vercel 匯入專案。

**重要：** 在 Vercel 專案設定 → Environment Variables，加入這三個：

```
NEXT_PUBLIC_SUPABASE_URL=https://xabgfhkoufwdvlpaamha.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xeD6pswTSGJG10sWLY6qKw_9i7-X7K2
NEXT_PUBLIC_SITE_URL=https://你的網址.vercel.app
```

第三個要填你部署後拿到的實際網址（第一次部署完才知道，補上後重新 deploy 一次）。這個值會影響 SEO 的 canonical 網址和 sitemap，一定要填對。

## 6. SEO 上線後要做的事

1. 到 [Google Search Console](https://search.google.com/search-console) 新增你的網站
2. 驗證方式選 HTML 標籤，把驗證碼貼到後台「SEO 設定 → Google Search Console 驗證碼」
3. 提交 sitemap：輸入 `sitemap.xml`
4. 想要流量數據的話，去 Google Analytics 開一個帳號，把 `G-XXXXXXXXXX` 貼到後台
