// ═══════════════════════════════════════════════════
//  Wonder V 資料層
//  對應現行 Supabase 結構（events / program_art / venues / settings）
//  資料現況：57 個節目、1154 場次（2027-03 ~ 2027-08）
// ═══════════════════════════════════════════════════
import { supabase } from "@/lib/supabase";

// ── 工具 ──────────────────────────────────────────

/** 台北時區的今天，格式 YYYY-MM-DD */
export function todayTaipei() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** 圖片可能是網址，也可能是 base64，兩種都要能用 */
export function resolveImg(src) {
  if (!src) return null;
  const s = String(src).trim();
  if (!s) return null;
  if (s.startsWith("data:") || s.startsWith("http") || s.startsWith("/")) return s;
  return null;
}

// ── 缺圖時的向量海報（沿用原站 posterSVG，改成依名稱決定、不用亂數）──
const TICKET_PALS = [
  ["#3a2a6a", "#120c22", "#c6a6ff"],
  ["#1c2a6a", "#0a0f26", "#7aa0ff"],
  ["#5a2a3a", "#200f16", "#ff9fb0"],
  ["#2a5a5a", "#0a1e1e", "#6ff0e0"],
  ["#7a2a5a", "#260f20", "#ff9fd6"],
  ["#2a3a5a", "#0e1422", "#9fc0ff"],
];

function hashStr(str) {
  let h = 2166136261;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 依節目名稱產生固定的星空海報（同一個節目每次結果都一樣，SSR 才不會對不起來） */
export function posterSVG(name) {
  const seed = hashStr(name) || 1;
  const p = TICKET_PALS[seed % TICKET_PALS.length];
  let st8 = seed;
  const rnd = () => {
    st8 = (st8 + 0x6d2b79f5) | 0;
    let t = Math.imul(st8 ^ (st8 >>> 15), 1 | st8);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  let g = "";
  for (let i = 1; i < 9; i++) {
    const y = 196 + i * i * 2.6;
    g += "<line x1='0' y1='" + y + "' x2='500' y2='" + y + "' stroke='" + p[2] +
      "' stroke-opacity='" + (0.3 - i * 0.03).toFixed(2) + "'/>";
  }
  for (let i = -6; i <= 6; i++) {
    g += "<line x1='250' y1='196' x2='" + (250 + i * 140) +
      "' y2='330' stroke='" + p[2] + "' stroke-opacity='0.12'/>";
  }
  let stars = "";
  for (let i = 0; i < 28; i++) {
    stars += "<circle cx='" + Math.floor(rnd() * 500) + "' cy='" + Math.floor(rnd() * 170) +
      "' r='" + (rnd() * 1.6 + 0.4).toFixed(1) + "' fill='#fff' opacity='" +
      (rnd() * 0.5 + 0.2).toFixed(2) + "'/>";
  }

  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 320'>" +
    "<defs><linearGradient id='b' x1='0' y1='0' x2='0' y2='1'>" +
    "<stop offset='0' stop-color='" + p[0] + "'/><stop offset='1' stop-color='" + p[1] + "'/></linearGradient>" +
    "<radialGradient id='h' cx='0.5' cy='0.62' r='0.5'>" +
    "<stop offset='0' stop-color='" + p[2] + "' stop-opacity='0.85'/>" +
    "<stop offset='1' stop-color='" + p[2] + "' stop-opacity='0'/></radialGradient></defs>" +
    "<rect width='500' height='320' fill='url(#b)'/>" + stars +
    "<ellipse cx='250' cy='200' rx='190' ry='46' fill='url(#h)'/>" + g +
    "<path d='M188 200 Q250 150 312 200 Q250 172 188 200 Z' fill='#000' opacity='0.4'/>" +
    "<circle cx='250' cy='150' r='30' fill='#fff' opacity='0.12'/></svg>";

  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/** 有圖就用圖，沒圖就用海報 —— 畫面永遠不會開天窗 */
export function imgFor(src, name) {
  return resolveImg(src) || posterSVG(name);
}

/** 票種 jsonb 形如 [{name, p, seats:[...]}]，取最低價 */
export function minPrice(tickets) {
  const list = Array.isArray(tickets) ? tickets : [];
  const prices = list.map((t) => Number(t?.p) || 0).filter((p) => p > 0);
  return prices.length ? Math.min(...prices) : 0;
}

/** 2027-03-01 → { y, m, d, weekday } */
export function parseDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = String(dateStr).split("-").map(Number);
  if (!y || !m || !d) return null;
  const wk = ["日", "一", "二", "三", "四", "五", "六"][
    new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  ];
  return { y, m, d, weekday: wk };
}

/** 節目名稱 ↔ 網址片段 */
export const toSlug = (name) => encodeURIComponent(String(name || ""));
export const fromSlug = (slug) => {
  const s = String(slug || "");
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

// ── 查詢 ──────────────────────────────────────────

/** settings 是 key/value 表，攤平成物件 */
export async function getWvSettings() {
  // images 那一列是整包 base64（3MB 以上），不能跟著每頁抓，
  // 要用圖片請改呼叫 getWvImages()
  const { data } = await supabase.from("settings").select("*").neq("key", "images");
  const out = {};
  for (const row of data || []) {
    // value 形如 {"v": ...}，取出內層
    out[row.key] = row?.value?.v ?? row?.value ?? null;
  }
  return out;
}

/** 後台上傳的圖片（key → base64 或網址）。很大，只在真的要用的頁面呼叫。 */
export async function getWvImages() {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "images")
    .maybeSingle();
  return data?.value?.v ?? data?.value ?? {};
}

/**
 * PostgREST 單次查詢預設上限 1000 筆，目前有 1154 場，
 * 所以要分頁抓完，否則部分節目會顯示「沒有場次」。
 */
async function fetchAllEvents(today) {
  const PAGE = 1000;
  const out = [];
  for (let from = 0; from < 10000; from += PAGE) {
    const { data, error } = await supabase
      .from("events")
      .select("name,show_date,show_time,venue,cap,sold")
      .gte("show_date", today)
      .order("show_date", { ascending: true })
      .order("show_time", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data?.length) break;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

/**
 * 節目列表：program_art 為主（57 筆），
 * 再用輕量查詢補上場次統計。不取 tickets jsonb，避免拉太多資料。
 */
export async function getPrograms({ featuredOnly = false } = {}) {
  const today = todayTaipei();

  let artQ = supabase.from("program_art").select("*");
  if (featuredOnly) artQ = artQ.eq("featured", true);

  const [{ data: art }, evs] = await Promise.all([
    artQ.order("sort_order", { ascending: true }),
    fetchAllEvents(today),
  ]);

  // 依節目名稱歸戶
  const byName = new Map();
  for (const e of evs || []) {
    if (!byName.has(e.name)) byName.set(e.name, []);
    byName.get(e.name).push(e);
  }

  const list = (art || []).map((a) => {
    const sessions = byName.get(a.name) || [];
    const first = sessions[0] || null;
    const totalCap = sessions.reduce((s, e) => s + (Number(e.cap) || 0), 0);
    const totalSold = sessions.reduce((s, e) => s + (Number(e.sold) || 0), 0);
    return {
      name: a.name,
      slug: toSlug(a.name),
      img: imgFor(a.img, a.name),
      intro: a.intro || "",
      ytId: a.yt_id || null,
      videoUrl: a.video_url || null,
      liveUrl: a.live_url || null,
      isLive: !!a.is_live,
      liveTitle: a.live_title || "",
      featured: !!a.featured,
      sortOrder: Number(a.sort_order) || 0,
      sessionCount: sessions.length,
      firstDate: first?.show_date || null,
      firstTime: first?.show_time || null,
      venue: first?.venue || "",
      soldRate: totalCap > 0 ? Math.round((totalSold / totalCap) * 100) : 0,
    };
  });

  // 有場次的排前面，其餘依 sort_order
  return list.sort((a, b) => {
    if (!!b.sessionCount !== !!a.sessionCount) return b.sessionCount - a.sessionCount;
    return a.sortOrder - b.sortOrder;
  });
}

/** 首頁精選節目 */
export async function getFeaturedPrograms(limit = 6) {
  const list = await getPrograms({ featuredOnly: true });
  if (list.length) return list.slice(0, limit);
  // 後台還沒勾選精選時，退而取有場次的前幾個
  const all = await getPrograms();
  return all.slice(0, limit);
}

/** 單一節目（含完整場次，這裡才取 tickets jsonb 算價格） */
export async function getProgram(name) {
  if (!name) return null;
  const today = todayTaipei();

  const [{ data: art }, { data: evs }] = await Promise.all([
    supabase.from("program_art").select("*").eq("name", name).maybeSingle(),
    supabase
      .from("events")
      .select("*")
      .eq("name", name)
      .gte("show_date", today)
      .order("show_date", { ascending: true })
      .order("show_time", { ascending: true }),
  ]);

  const sessions = evs || [];
  if (!art && !sessions.length) return null;

  const latestIntro = sessions.find((e) => e.intro)?.intro || "";
  const heroImg =
    resolveImg(art?.img) ||
    resolveImg(sessions.find((e) => e.img)?.img) ||
    posterSVG(name);

  const prices = sessions.map((e) => minPrice(e.tickets)).filter((p) => p > 0);

  return {
    name,
    slug: toSlug(name),
    img: heroImg,
    intro: art?.intro || latestIntro,
    ytId: art?.yt_id || sessions.find((e) => e.yt)?.yt || null,
    videoUrl: art?.video_url || null,
    liveUrl: art?.live_url || null,
    isLive: !!art?.is_live,
    liveTitle: art?.live_title || "",
    cat: sessions[0]?.cat || "",
    venue: sessions[0]?.venue || "",
    venues: [...new Set(sessions.map((e) => e.venue).filter(Boolean))],
    lowestPrice: prices.length ? Math.min(...prices) : 0,
    sessions: sessions.map((e) => ({
      id: e.id,
      date: e.show_date,
      time: e.show_time,
      venue: e.venue || "",
      status: e.status || "",
      sale: e.sale || "",
      cap: Number(e.cap) || 0,
      sold: Number(e.sold) || 0,
      left: Math.max(0, (Number(e.cap) || 0) - (Number(e.sold) || 0)),
      price: minPrice(e.tickets),
      venueId: e.venue_id ?? null,
      tickets: Array.isArray(e.tickets) ? e.tickets : [],
      soldSeats: Array.isArray(e.sold_seats) ? e.sold_seats : [],
    })),
  };
}

/** 商品（3D 精選）。圖片放在 settings.images，用 img_key 對應。 */
export async function getProducts() {
  const [{ data }, images] = await Promise.all([
    supabase.from("products").select("*").order("id", { ascending: true }),
    getWvImages(),
  ]);
  return (data || [])
    .filter((p) => p.on_sale !== false)
    .map((p) => ({
      id: p.id,
      name: p.name || "",
      sub: p.sub || "",
      price: Number(p.price) || 0,
      oldPrice: Number(p.old_price) || 0,
      badge: p.badge || "",
      stock: p.stock == null ? null : Number(p.stock),
      intro: p.intro || "",
      spec: p.spec || "",
      ytId: p.yt_id || null,
      img: resolveImg(images?.[p.img_key]) || null,
    }));
}

/** 場地設定（座位圖要用）：欄位名稱統一成 rows / cols / off */
export async function getVenues() {
  const { data } = await supabase
    .from("venues")
    .select("id,name,n_rows,n_cols,stage,off_seats,boxes");
  return (data || []).map((v) => ({
    id: v.id,
    name: v.name || "",
    rows: Number(v.n_rows) || 0,
    cols: Number(v.n_cols) || 0,
    stage: v.stage || null,
    off: Array.isArray(v.off_seats) ? v.off_seats : [],
    boxes: Array.isArray(v.boxes) ? v.boxes : [],
  }));
}

/** 所有節目名稱（給 sitemap 與靜態產生用） */
export async function getAllProgramNames() {
  const { data } = await supabase.from("program_art").select("name");
  return (data || []).map((r) => r.name).filter(Boolean);
}

/** 首頁的近期場次 */
export async function getUpcomingSessions(limit = 8) {
  const today = todayTaipei();
  const { data } = await supabase
    .from("events")
    .select("id,name,show_date,show_time,venue,cap,sold,status")
    .gte("show_date", today)
    .order("show_date", { ascending: true })
    .order("show_time", { ascending: true })
    .limit(limit);
  return (data || []).map((e) => ({
    id: e.id,
    name: e.name,
    slug: toSlug(e.name),
    date: e.show_date,
    time: e.show_time,
    venue: e.venue || "",
    status: e.status || "",
    left: Math.max(0, (Number(e.cap) || 0) - (Number(e.sold) || 0)),
  }));
}
