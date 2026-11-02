// ═══════════════════════════════════════════════════
//  站台文案：跑馬燈 / 公告 / Banner / 延伸體驗版位
//  真正的內容存在 Supabase 的 settings 表（後台可改），
//  這裡只放「資料庫還沒有這個鍵」時的預設值。
// ═══════════════════════════════════════════════════

export const MARQUEE_DEFAULT =
  "🎫 星夜沉浸劇場 售票中，剩 42 席｜🕶️ 裸視 3D 手機膜 限時 9 折｜📢 AI 夥伴見面會 Vol.3 開放預約";

export const ANNOUNCEMENTS_DEFAULT = [];
export const BANNERS_DEFAULT = [];

/** 首頁各區塊預設顯示幾筆（對應後台 home_layout） */
export const HOME_LAYOUT_DEFAULT = {
  programs: 3,
  tickets: 6,
  products: 8,
  plans: 2,
  lives: 6,
  creators: 6,
};

/** 「直播與 AI 夥伴」兩片導引版位的預設值（後台 promos 可覆蓋） */
export const PROMOS_DEFAULT = [
  {
    title: "Wonder V 直播大廳",
    sub: "24 小時沉浸直播與互動連麥",
    cta: "進入直播 →",
    url: "",
    on: true,
  },
  {
    title: "OnlyMate AI 夥伴",
    sub: "專屬 AI 分身，語音對話與即時互動",
    cta: "開始體驗 →",
    url: "",
    on: true,
  },
];

/** 會員儲值方案 */
export const PLANS = [
  {
    n: "星紫卡",
    amt: 500,
    unit: "／首儲",
    bonus: "贈 50 幣",
    feat: false,
    li: ["沉浸節目標準畫質", "直播彈幕互動", "電商 95 折"],
  },
  {
    n: "沉浸卡",
    amt: 1500,
    unit: "／首儲",
    bonus: "贈 300 幣 + 場域折抵",
    feat: true,
    li: ["沉浸節目 3D 高畫質", "專屬 AI 夥伴語音", "電商 9 折 · 免運", "場域門票優先購"],
  },
  {
    n: "紫鑽卡",
    amt: 5000,
    unit: "／首儲",
    bonus: "贈 1,500 幣 + 限定週邊",
    feat: false,
    li: ["沉浸節目無限觀看", "VIP 包廂 · 360° 視角", "電商 85 折", "專屬客服"],
  },
];

/** 後台 home_pick 指定的項目排前面，其餘依原順序遞補 */
export function orderPick(arr, ids, keyFn) {
  if (!Array.isArray(ids) || !ids.length) return arr;
  const out = [];
  ids.forEach((id) => {
    const it = arr.find((x) => keyFn(x) === id && !out.includes(x));
    if (it) out.push(it);
  });
  arr.forEach((x) => {
    if (!out.includes(x)) out.push(x);
  });
  return out;
}

/** 取前 N 筆；N 為 0 回傳空陣列，未指定則全取 */
export function takeN(arr, n) {
  return typeof n === "number" && n >= 0 ? arr.slice(0, n) : arr;
}
