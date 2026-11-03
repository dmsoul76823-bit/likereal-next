import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(url, key);

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";


// ══════════ 會員系統 ══════════

// 讀取會員資料（含等級）
export async function getMember(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from("members")
    .select("*, member_tiers(*)")
    .eq("id", userId)
    .maybeSingle();
  // 以前這裡只取 data 不看 error，所以 members 還沒接上 auth 的那段期間，
  // 失敗都被吞掉變成 null，查了很久才發現。寧可吵一點。
  if (error) {
    console.error("getMember 失敗：", error.message);
    return null;
  }
  return data;
}

// 更新自己的會員資料。只開放姓名與電話。
//
// 以前這裡是 upsertMember()，走 INSERT ... ON CONFLICT。那有兩個問題：
//   1. members 沒有給會員的 INSERT 政策，upsert 會被 RLS 擋掉；
//   2. 就算補了政策，members_guard 只攔 BEFORE UPDATE，
//      會員可以用 INSERT 直接塞 wallet: 99999。
// 資料列已經由 auth.users 的 on_auth_user_created trigger 建好，
// 所以前端不需要、也不該有建立的能力 —— 只更新就好。
export async function updateMyProfile({ name, phone }) {
  const { data: au } = await supabase.auth.getUser();
  const uid = au?.user?.id;
  if (!uid) throw new Error("尚未登入");

  const patch = {};
  if (name !== undefined && name !== null) patch.name = name;
  if (phone !== undefined) patch.phone = phone || null;
  if (!Object.keys(patch).length) return getMember(uid);

  const { data, error } = await supabase
    .from("members")
    .update(patch)
    .eq("id", uid)
    .select("*, member_tiers(*)")
    .maybeSingle();
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

// 會員自己的訂單。
//
// orders 沒有 member_id 欄位 —— Wonder V 的訂單是靠 email + 電話對人的
// （跟「我的票券」的查詢方式一致）。原本這裡是 .eq("member_id", memberId)
// 並 join events(title, slug, date_text, venue)，那些欄位在這個資料庫
// 通通不存在，所以這支函式一直回傳空陣列。
export async function getMyOrders(email) {
  if (!email) return [];
  const { data, error } = await supabase
    .from("orders")
    .select("id,item,amt,pay,status,order_date,used,created_at")
    .ilike("email", email)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("讀取訂單失敗：", error.message);
    return [];
  }
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


// ══════════ 場次 ══════════


