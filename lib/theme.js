/**
 * 會員相關頁面（/account、/login 的 callback、/partner）的配色。
 *
 * 原本這裡是一組淺色調色盤（白底、藍色 accent），來自 Wonder V 之前的
 * 設計。整站改成 Wonder V 的深紫配色之後，這幾頁變成唯一的白底頁面，
 * 從 header 的頭像點進去會整個斷掉。
 *
 * 這些頁面的樣式全部是 inline style 引用 C.*，所以只要把色票換掉，
 * 三頁會一起變成深色，不必逐行重寫 476 行的版面。
 * 色票數值對齊 app/wv.css 的 :root 變數。
 */
export const C = {
  bg: "#0c0a12",        // --bg
  surface: "#181227",   // --card
  surfaceL: "#1f1834",  // --card2
  border: "rgba(167,139,206,.22)",   // --line
  borderL: "rgba(255,255,255,.06)",  // --line2
  primary: "#8b6fca",   // --brand
  primaryL: "rgba(139,111,202,.14)", // --brand-soft
  accent: "#c9b6f0",    // --brand3
  accentL: "rgba(139,111,202,.14)",
  text: "#f2f0f7",      // --text
  sub: "#9d97ac",       // --muted
  muted: "#6b6579",
  red: "#e08fc0",       // --rose
  yellow: "#FFB454",
  green: "#5BD6A0",
};
