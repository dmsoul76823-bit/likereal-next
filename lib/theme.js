export const C = {
  bg: "#FAFBFC",
  surface: "#FFFFFF",
  border: "#E4E8ED",
  borderL: "#EFF2F5",
  primary: "#0A0E14",
  primaryL: "#F4F6F8",
  accent: "#0066FF",
  accentL: "#EBF2FF",
  text: "#0A0E14",
  sub: "#697485",
  muted: "#A4ACB8",
  red: "#FF3B30",
  yellow: "#FF9500",
  green: "#00C853",
};

export const CATEGORIES = [
  { id: "all", label: "全部場域", icon: "◇" },
  { id: "immersive", label: "沉浸裝置", icon: "◈" },
  { id: "theater", label: "劇場演出", icon: "▣" },
  { id: "interactive", label: "互動體驗", icon: "◎" },
  { id: "exhibit", label: "特展", icon: "□" },
  { id: "workshop", label: "工作坊", icon: "△" },
];

export function catLabel(id) {
  return CATEGORIES.find((c) => c.id === id)?.label || "場域";
}

// 依活動 id + 票種 id 產生固定的已售座位（demo 用；正式應從 orders 統計）
const CACHE = {};
export function getSold(eventId, ticketId, rows, cols) {
  const key = `${eventId}-${ticketId}`;
  if (CACHE[key]) return CACHE[key];
  const total = rows * cols;
  let seed = 0;
  for (const ch of key) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const pct = 0.25 + ((seed % 25) / 100);
  const n = Math.floor(total * pct);
  const all = Array.from({ length: total }, (_, i) => i);
  for (let i = all.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const j = seed % (i + 1);
    [all[i], all[j]] = [all[j], all[i]];
  }
  const set = new Set(all.slice(0, n));
  CACHE[key] = set;
  return set;
}
