// ═══════════════════════════════════════════════════
//  後台共用：權限、分頁定義、格式化
// ═══════════════════════════════════════════════════

export const ALL_PERMS = [
  "dash", "events", "venues", "home", "creators",
  "products", "orders", "members", "checkin", "settings", "staff",
];

export const ROLE = { admin: "管理者", editor: "編輯者", staff: "驗票員" };

export const NAV = [
  { k: "dash",     t: "儀表板",     i: "◈", d: "整體營運概況" },
  { k: "events",   t: "節目管理",   i: "◐", d: "沉浸場域節目與票種" },
  { k: "venues",   t: "場地管理",   i: "▦", d: "座位圖範本：走道、包廂、舞台位置" },
  { k: "home",     t: "首頁編排",   i: "⌂", d: "指定哪些節目出現在首頁與顯示數量" },
  { k: "creators", t: "創作者管理", i: "☺", d: "AI 夥伴 / 直播角色" },
  { k: "products", t: "商品管理",   i: "▣", d: "裸視 3D 電商商品" },
  { k: "orders",   t: "訂單查詢",   i: "▤", d: "票券與商品訂單" },
  { k: "members",  t: "會員管理",   i: "◍", d: "前台會員與儲值" },
  { k: "checkin",  t: "驗票入場",   i: "⛨", d: "掃描 QR Code 或手動輸入票號" },
  { k: "settings", t: "網站設定",   i: "⚙", d: "跑馬燈、公告、Banner、圖片與 SEO" },
  { k: "staff",    t: "人員權限",   i: "⚿", d: "後台帳號與功能權限" },
];

/**
 * staff 資料列 → 畫面用的物件；管理者自動擁有全部權限。
 * 權限欄位實際叫 perms（不是 permissions），舊 SQL 檔案裡的欄位名
 * 跟線上資料庫不一致，以線上為準。
 */
export function toMe(row) {
  const perms = Array.isArray(row?.perms) ? row.perms : [];
  return {
    id: row?.id,
    email: row?.email || "",
    name: row?.name || "",
    role: row?.role || "staff",
    perms: row?.role === "admin" ? ALL_PERMS.slice() : perms,
  };
}

export const money = (n) => "NT$" + (Number(n) || 0).toLocaleString();

export function tpeTime(iso) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("zh-TW", {
      timeZone: "Asia/Taipei",
      month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return String(iso).slice(0, 16).replace("T", " ");
  }
}
