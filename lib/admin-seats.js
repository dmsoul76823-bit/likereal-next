// ═══════════════════════════════════════════════════
//  後台：把場地座位自動分配給各票種
//  （移植自舊後台 autoAssignSeats）
// ═══════════════════════════════════════════════════
import { sid } from "@/lib/wv-seats";

/**
 * 包廂票種分到場地的包廂；一般票種依「排數由前而後」平分，
 * 第一個票種在最前排。會直接改寫 tiers 裡每個 t.seats。
 */
export function autoAssignSeats(venue, tiers) {
  if (!venue) return tiers;

  const off = new Set(venue.off || []);
  const boxSeats = new Set();
  (venue.boxes || []).forEach((b) => (b.seats || []).forEach((s) => boxSeats.add(s)));

  const boxTiers = tiers.filter((t) => t.unit === "box");
  const seatTiers = tiers.filter((t) => t.unit !== "box");

  boxTiers.forEach((t) => (t.seats = []));
  (venue.boxes || []).forEach((b, bi) => {
    if (boxTiers.length) boxTiers[bi % boxTiers.length].seats.push(...(b.seats || []));
  });

  const rows = [];
  for (let r = 0; r < (venue.rows || 0); r++) {
    const cells = [];
    for (let c = 0; c < (venue.cols || 0); c++) {
      const id = sid(r, c);
      if (!off.has(id) && !boxSeats.has(id)) cells.push(id);
    }
    if (cells.length) rows.push(cells);
  }

  seatTiers.forEach((t) => (t.seats = []));
  if (seatTiers.length) {
    const per = Math.ceil(rows.length / seatTiers.length);
    rows.forEach((cells, ri) => {
      const ti = Math.min(seatTiers.length - 1, Math.floor(ri / per));
      seatTiers[ti].seats.push(...cells);
    });
  }

  return tiers;
}

/** 場地可售席次（扣掉走道） */
export const venueSeatCount = (v) =>
  v ? (v.rows || 0) * (v.cols || 0) - (v.off || []).length : 0;

/** YouTube 網址或 ID → ID */
export function ytId(s) {
  const m = /(?:v=|youtu\.be\/|embed\/|live\/)([A-Za-z0-9_-]{6,})/.exec(s || "");
  return m ? m[1] : String(s || "").trim();
}
