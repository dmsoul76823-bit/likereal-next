import { getSiteSeo } from "@/lib/seo";
import { getAllProgramNames, getProducts } from "@/lib/wv";

export default async function sitemap() {
  // 網址以後台「設定 → 網站網址」為準，不走環境變數
  //（Vercel 上那個被鎖成 Secret 類型改不動，而且還指著舊網域）。
  const { site_url: base } = await getSiteSeo();
  const now = new Date();

  const [names, products] = await Promise.all([getAllProgramNames(), getProducts()]);

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/programs`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/tickets`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/shop`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/live`, lastModified: now, changeFrequency: "hourly", priority: 0.6 },
    { url: `${base}/ai`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/dining`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/vip`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    ...products.map((p) => ({
      url: `${base}/shop/${p.id}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    })),
    ...names.map((name) => ({
      url: `${base}/programs/${encodeURIComponent(name)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    })),
  ];
}
