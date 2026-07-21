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

// ══════════ 分潤 ══════════

// 計算某筆訂單的分潤（回傳 { ok, affiliate_id, amount }）
export async function calcCommission(code, eventId, total, ticketCount) {
  if (!code) return { ok: false };
  const { data, error } = await supabase.rpc("calc_commission", {
    p_code: code,
    p_event_id: eventId,
    p_total: total,
    p_ticket_count: ticketCount,
  });
  if (error) return { ok: false };
  return data || { ok: false };
}

// 合作夥伴儀表板（用密鑰讀取，不需登入）
export async function getAffiliateDashboard(token) {
  const { data, error } = await supabase.rpc("get_affiliate_dashboard", {
    p_token: token,
  });
  if (error) return { ok: false };
  return data || { ok: false };
}

// 後台：讀取所有夥伴與其規則
export async function getAffiliates() {
  const { data } = await supabase
    .from("affiliates")
    .select("*, affiliate_rules(*, events(title, slug))")
    .order("created_at", { ascending: false });
  return data || [];
}

// ══════════ 優惠券 / 折扣碼 ══════════

// 驗證折扣碼
export async function validateCoupon({ code, eventId, subtotal, memberId, email }) {
  if (!code?.trim()) return { ok: false, reason: "empty" };
  const { data, error } = await supabase.rpc("validate_coupon", {
    p_code: code.trim(),
    p_event_id: eventId,
    p_subtotal: subtotal,
    p_member_id: memberId || null,
    p_email: email || null,
  });
  if (error) return { ok: false, reason: "error" };
  return data || { ok: false };
}

// 訂單成立後登記使用
export async function redeemCoupon({ couponId, orderId, memberId, email, amount }) {
  if (!couponId) return;
  await supabase.rpc("redeem_coupon", {
    p_coupon_id: couponId,
    p_order_id: orderId,
    p_member_id: memberId || null,
    p_email: email || null,
    p_amount: amount || 0,
  });
}

// 依推廣代碼取得綁定的折扣碼（自動帶入用）
export async function getAffiliateCoupon(refCode) {
  if (!refCode) return { ok: false };
  const { data, error } = await supabase.rpc("get_affiliate_coupon", {
    p_code: refCode,
  });
  if (error) return { ok: false };
  return data || { ok: false };
}

// 後台：所有優惠券
export async function getCoupons() {
  const { data } = await supabase
    .from("coupons")
    .select("*, events(title), affiliates(name, code)")
    .order("created_at", { ascending: false });
  return data || [];
}

// 前台：目前可販售的票種（已過濾隱藏與銷售時間）
export async function getAvailableTickets(eventId) {
  const { data } = await supabase.rpc("get_available_tickets", {
    p_event_id: eventId,
  });
  return data || [];
}
