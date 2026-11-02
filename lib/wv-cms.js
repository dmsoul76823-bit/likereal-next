// ═══════════════════════════════════════════════════
//  站台文案（跑馬燈 / 公告 / Banner）
//  原站把這些存在瀏覽器 localStorage 的 LIREAL_ADMIN_DB，
//  線上訪客其實看到的是程式內建的預設值，等於每台裝置各有一份。
//  這裡先原樣移植，階段 4 做後台時再搬進 settings 資料表共用。
// ═══════════════════════════════════════════════════

export const MARQUEE =
  "🎫 星夜沉浸劇場 售票中，剩 42 席｜🕶️ 裸視 3D 手機膜 限時 9 折｜📢 AI 夥伴見面會 Vol.3 開放預約";

export const ANNOUNCEMENTS = [
  {
    id: 1,
    title: "9/12 星夜沉浸劇場 售票開跑",
    tag: "系統公告",
    date: "2026-08-25",
    body: "VIP 沉浸席限量 100 席，售完為止。",
  },
  {
    id: 2,
    title: "場域入場須知更新",
    tag: "入場須知",
    date: "2026-08-20",
    body: "請於開演前 30 分鐘抵達，並攜帶電子票券 QR Code。",
  },
  {
    id: 3,
    title: "裸視 3D 觀看模式上線",
    tag: "新功能",
    date: "2026-08-14",
    body: "搭配裸視 3D 手機膜即可享立體觀看體驗。",
  },
];

export const BANNERS = [
  { id: 1, pos: "頂部", title: "沉浸 · 無極限", sub: "Wonder V 全息場域首映", link: "/programs", on: true },
  { id: 2, pos: "底部", title: "裸視 3D 精選", sub: "沉浸觀看裝備 9 折起", link: "/programs", on: true },
];
