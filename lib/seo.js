import { supabase, SITE_URL } from "@/lib/supabase";

/**
 * 根 layout 的 SEO 與追蹤碼設定。
 *
 * 原本這裡呼叫 lib/supabase.js 的 getSettings()，它讀的是 site_settings 表 ——
 * 而那張表在這個資料庫根本不存在，所以每一頁拿到的都是空物件 {}，
 * 後台「設定」分頁填的 GA、Search Console、OG 圖片全站都沒生效。
 *
 * 後台實際是把 SEO 存進 settings 表的 seo 鍵，欄位代號很短：
 *   t  = 網站標題        d  = 描述
 *   k  = 關鍵字          u  = 網站網址
 *   ga = GA 評估 ID      sc = Search Console 驗證碼
 *   og = OG 分享圖
 */
export async function getSiteSeo() {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "seo")
    .maybeSingle();

  if (error) {
    console.error("讀取 SEO 設定失敗：", error.message);
    return fallback();
  }

  const v = data?.value?.v ?? data?.value ?? {};
  if (!v || typeof v !== "object") return fallback();

  const title = (v.t || "").trim();

  return {
    site_title: title || "Wonder V｜沉浸式場域娛樂平台",
    // 標題常寫成「Wonder V 沉浸式場域 | 虛擬與現實整合劇場」這種長句，
    // 直接拿去當每頁標題的後綴會又臭又長，所以取第一段當品牌名。
    site_name: shortName(title),
    site_desc: v.d || "",
    site_keywords: v.k || "",
    // 網站網址以後台填的為準。NEXT_PUBLIC_SITE_URL 在 Vercel 上被鎖成
    // Secret 類型改不動，還指著舊網域；後台這欄改起來容易得多。
    site_url: normUrl(v.u) || SITE_URL,
    ga_id: v.ga || "",
    gsc_token: v.sc || "",
    og_image: v.og || "",
    meta_pixel_id: v.pixel || "",
    line_tag_id: v.line || "",
  };
}

function shortName(title) {
  if (!title) return "Wonder V";
  const first = title.split(/[|｜·・–—-]/)[0].trim();
  return first || "Wonder V";
}

function normUrl(u) {
  const s = (u || "").trim();
  if (!s) return "";
  const withProto = /^https?:\/\//i.test(s) ? s : "https://" + s;
  try {
    return new URL(withProto).origin;
  } catch {
    return "";
  }
}

function fallback() {
  return {
    site_title: "Wonder V｜沉浸式場域娛樂平台",
    site_name: "Wonder V",
    site_desc: "",
    site_keywords: "",
    site_url: SITE_URL,
    ga_id: "",
    gsc_token: "",
    og_image: "",
    meta_pixel_id: "",
    line_tag_id: "",
  };
}
