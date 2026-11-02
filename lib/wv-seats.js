// ═══════════════════════════════════════════════════
//  座位圖工具（移植自原站 lireal_platform.html）
//  座位代碼格式："列-欄"，例如 "0-3" 代表第 1 列第 4 個位子 → A4
// ═══════════════════════════════════════════════════

export const ZONE_COLORS = [
  "rgba(139,111,202,.6)",
  "rgba(224,143,192,.55)",
  "rgba(122,168,255,.55)",
  "rgba(95,230,192,.5)",
  "rgba(240,192,106,.55)",
  "rgba(255,140,120,.55)",
  "rgba(180,120,255,.55)",
  "rgba(120,220,255,.5)",
];

/** 一次最多可選幾個單位（包廂整間算 1 個） */
export const SEAT_MAX = 4;

/** 0 → A、25 → Z、26 → AA */
export function rowLabel(i) {
  let s = "";
  let n = i + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export const sid = (r, c) => r + "-" + c;

/** "2-5" → "C6" */
export function seatLabelOf(id) {
  const [r, c] = String(id || "").split("-").map(Number);
  if (Number.isNaN(r) || Number.isNaN(c)) return String(id || "");
  return rowLabel(r) + (c + 1);
}

/** 這個座位屬於哪個包廂 */
export const boxOf = (venue, id) =>
  (venue?.boxes || []).find((b) => (b.seats || []).includes(id));

/** 座位 → 票種對照表 { "0-3": { i, t, col } } */
export function zoneMap(ev) {
  const m = {};
  (ev?.tickets || []).forEach((t, i) => {
    (t.seats || []).forEach((id) => {
      m[id] = { i, t, col: ZONE_COLORS[i % ZONE_COLORS.length] };
    });
  });
  return m;
}

/** 已售出的座位集合；沒有 sold_seats 時用 sold 數量往前補 */
export function soldSet(ev) {
  const s = new Set();
  if (Array.isArray(ev?.soldSeats) && ev.soldSeats.length) {
    ev.soldSeats.forEach((x) => s.add(x));
  } else {
    let n = Number(ev?.sold) || 0;
    (ev?.tickets || []).forEach((t) =>
      (t.seats || []).forEach((id) => {
        if (n > 0) {
          s.add(id);
          n--;
        }
      })
    );
  }
  return s;
}

/** 舞台位置：資料庫可能存 "top"/"bottom" 字串，也可能存 {x,y,w,h} */
export function normStage(v) {
  let s = v?.stage;
  if (!s || typeof s === "string") {
    const side = s || "top";
    const R = v?.rows || 10;
    const C = v?.cols || 10;
    s =
      side === "bottom"
        ? { x: C * 0.2, y: R + 1.2, w: C * 0.6, h: 1.8 }
        : side === "left"
        ? { x: -3.2, y: R * 0.2, w: 1.8, h: R * 0.6 }
        : side === "right"
        ? { x: C + 1.4, y: R * 0.2, w: 1.8, h: R * 0.6 }
        : { x: C * 0.2, y: -3, w: C * 0.6, h: 1.8 };
  }
  return {
    x: Number(s.x) || 0,
    y: Number(s.y) || 0,
    w: Number(s.w) || 1,
    h: Number(s.h) || 1,
    shape: s.shape || "round",
    label: s.label || "STAGE · 舞台",
  };
}

/** 一個「單位」＝ 一席；票種若是整間販售，則同包廂的席位視為一個單位 */
export function unitOf(venue, zm, id) {
  const z = zm[id];
  const bx = boxOf(venue, id);
  if (z && z.t?.unit === "box" && bx) {
    return bx.seats.filter((x) => zm[x] && zm[x].i === z.i);
  }
  return [id];
}

/** 把已選座位收合成單位陣列 */
export function selUnits(venue, zm, sel) {
  const seen = new Set();
  const units = [];
  [...sel].forEach((id) => {
    if (seen.has(id)) return;
    const u = unitOf(venue, zm, id);
    u.forEach((x) => seen.add(x));
    units.push(u);
  });
  return units;
}

export function unitName(venue, zm, u) {
  const z = zm[u[0]];
  const bx = boxOf(venue, u[0]);
  if (!z) return seatLabelOf(u[0]);
  return z.t?.unit === "box" && bx
    ? `${z.t.n}（${bx.name}）`
    : `${z.t.n} ${seatLabelOf(u[0])}`;
}

export function unitPrice(zm, u) {
  const z = zm[u[0]];
  if (!z) return 0;
  const p = Number(z.t?.p) || 0;
  return z.t?.unit === "box" ? p : p * u.length;
}

/** 某票種剩餘數量 */
export function tierStat(ev, venue, sold, idx) {
  const t = ev?.tickets?.[idx] || {};
  const seats = t.seats || [];
  if (t.unit === "box") {
    const boxes = (venue?.boxes || []).filter((b) =>
      (b.seats || []).some((s) => seats.includes(s))
    );
    const free = boxes.filter((b) => (b.seats || []).every((s) => !sold.has(s)));
    return { total: boxes.length, left: free.length, unit: "間" };
  }
  return {
    total: seats.length,
    left: seats.filter((s) => !sold.has(s)).length,
    unit: "席",
  };
}
