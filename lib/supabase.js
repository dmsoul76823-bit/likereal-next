import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(url, key);

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// ── 讀取全站設定 ──
export async function getSettings() {
  const { data } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();
  return data || {};
}

// ── 讀取所有已發布活動 ──
export async function getEvents() {
  const { data } = await supabase
    .from("events")
    .select("*, tickets(*)")
    .eq("status", "published")
    .order("sort_order");
  return data || [];
}

// ── 讀取單一活動（用 slug）──
export async function getEvent(slug) {
  const { data } = await supabase
    .from("events")
    .select("*, tickets(*)")
    .eq("slug", slug)
    .single();
  if (data?.tickets) {
    data.tickets.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }
  return data;
}

// ── 讀取公告 ──
export async function getAnnouncements() {
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .order("sort_order");
  return data || [];
}

// ── 讀取 Banner ──
export async function getBanners(position) {
  const q = supabase
    .from("banners")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (position) q.eq("position", position);
  const { data } = await q;
  return data || [];
}

// ── 建立訂單 ──
export async function createOrder(order) {
  const { data, error } = await supabase
    .from("orders")
    .insert(order)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ══════════ 會員系統 ══════════

// 讀取會員資料（含等級）
export async function getMember(userId) {
  const { data } = await supabase
    .from("members")
    .select("*, member_tiers(*)")
    .eq("id", userId)
    .single();
  return data;
}

// 建立/更新會員資料
export async function upsertMember(member) {
  const { data, error } = await supabase
    .from("members")
    .upsert(member)
    .select("*, member_tiers(*)")
    .single();
  if (error) throw error;
  return data;
}

// 讀取會員點數明細
export async function getPointLogs(memberId) {
  const { data } = await supabase
    .from("point_logs")
    .select("*")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });
  return data || [];
}

// 讀取會員的訂單
export async function getMemberOrders(memberId) {
  const { data } = await supabase
    .from("orders")
    .select("*, events(title, slug, date_text, venue)")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });
  return data || [];
}

// 讀取等級設定
export async function getTiers() {
  const { data } = await supabase
    .from("member_tiers")
    .select("*")
    .order("level");
  return data || [];
}

// ══════════ 真實庫存 / 訂位 ══════════

// 讀取某票種的座位狀態（真實庫存）
export async function getSeats(ticketId) {
  const { data } = await supabase
    .from("seats")
    .select("seat_no, status")
    .eq("ticket_id", ticketId);
  return data || [];
}

// 原子性訂位（防超賣）：回傳 { ok, reason }
export async function reserveSeats(ticketId, seatNos, orderId) {
  const { data, error } = await supabase.rpc("reserve_seats", {
    p_ticket_id: ticketId,
    p_seat_nos: seatNos,
    p_order_id: orderId,
  });
  if (error) return { ok: false, reason: error.message };
  return data;
}

// 讀取單筆訂單（含活動與票種，供會員看票券）
export async function getOrder(orderId) {
  const { data } = await supabase
    .from("orders")
    .select("*, events(title, slug, date_text, venue, address), tickets(label)")
    .eq("id", orderId)
    .single();
  return data;
}

// ══════════ 退票 ══════════
export async function requestRefund(orderId, memberId, reason) {
  const { error } = await supabase.from("refund_requests").insert({
    order_id: orderId,
    member_id: memberId,
    reason,
  });
  if (error) throw error;
}

export async function getMyRefunds(memberId) {
  const { data } = await supabase
    .from("refund_requests")
    .select("*, orders(id, total, events(title))")
    .eq("member_id", memberId)
    .order("requested_at", { ascending: false });
  return data || [];
}

// ══════════ 後台帳號建立 ══════════
// 用獨立連線註冊，避免頂掉目前管理者的登入狀態
export async function createStaffAccount({ email, password, name, permissions }) {
  const tmp = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await tmp.auth.signUp({ email, password });
  if (error) {
    if (error.message?.includes("already")) {
      throw new Error("此 Email 已被註冊過");
    }
    throw new Error(error.message);
  }
  if (!data.user) throw new Error("帳號建立失敗");

  // 用目前管理者的連線寫入 staff（RLS 需要 admin 身分）
  const { error: e2 } = await supabase.from("staff").insert({
    id: data.user.id,
    email,
    name,
    role: "staff",
    is_active: true,
    permissions: permissions || [],
  });
  if (e2) throw new Error("權限設定失敗：" + e2.message);

  return data.user;
}
