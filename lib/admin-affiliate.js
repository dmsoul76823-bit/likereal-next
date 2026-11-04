import { supabase } from "@/lib/supabase";

/**
 * 後台分潤管理的資料存取。
 *
 * 規則的目標用兩欄描述（2026-11-04 改）：
 *   target_type  'all' | 'program' | 'product'
 *   target_key   null  | program_art.name | products.id
 * 原本是 event_id uuid，但線上 events.id 是 bigint，
 * 那個欄位指向一個不存在的資料表。
 *
 * 套用順序：愈具體愈優先。有該產品／節目的規則就用它，
 * 否則用 target_type='all' 的預設費率。
 */

export const TARGET_LABEL = {
  all: "全站預設",
  program: "節目",
  product: "商品",
};

export const RATE_LABEL = {
  percent: "百分比",
  fixed: "固定金額",
};

export const STATUS_LABEL = {
  pending: "待確認",
  approved: "已核准",
  paid: "已付款",
  reversed: "已沖銷",
};

/** 夥伴清單，附帶規則與分潤統計 */
export async function getAffiliateList() {
  const { data, error } = await supabase
    .from("affiliates")
    .select("*, affiliate_rules(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

/**
 * 追蹤天數限制在 1–365。
 * 表單的 min/max 只擋得住用介面輸入的人，直接打 API 或貼上負數都能繞過；
 * 負數會讓到期時間落在過去，推薦碼一存進去就失效，而且不會有任何錯誤訊息，
 * 排查起來會很痛苦。
 */
function clampDays(v) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return 30;
  return Math.min(365, Math.max(1, n));
}

export async function saveAffiliate(row) {
  const payload = {
    name: (row.name || "").trim(),
    code: (row.code || "").trim().toLowerCase(),
    contact: row.contact || null,
    cookie_days: clampDays(row.cookie_days),
    is_active: row.is_active !== false,
    note: row.note || null,
  };
  if (!payload.name) throw new Error("請填寫夥伴名稱");
  if (!/^[a-z0-9_-]{2,32}$/.test(payload.code)) {
    throw new Error("推廣代碼只能用英文小寫、數字、- 與 _，長度 2–32");
  }

  const q = row.id
    ? supabase.from("affiliates").update(payload).eq("id", row.id)
    : supabase.from("affiliates").insert(payload);

  const { data, error } = await q.select().single();
  if (error) {
    if (String(error.message).includes("duplicate") || error.code === "23505") {
      throw new Error("這個推廣代碼已經有人用了");
    }
    throw error;
  }
  return data;
}

/** 停用而不是刪除 —— 分潤帳本會參照夥伴，刪掉會連帶清掉歷史紀錄 */
export async function setAffiliateActive(id, active) {
  const { error } = await supabase
    .from("affiliates")
    .update({ is_active: !!active })
    .eq("id", id);
  if (error) throw error;
}

export async function saveRule(rule) {
  const type = rule.target_type || "all";
  const payload = {
    affiliate_id: rule.affiliate_id,
    target_type: type,
    target_key: type === "all" ? null : (rule.target_key || "").trim() || null,
    commission_type: rule.commission_type || "percent",
    commission_value: Number(rule.commission_value) || 0,
    is_active: rule.is_active !== false,
  };
  if (type !== "all" && !payload.target_key) {
    throw new Error(type === "program" ? "請選擇節目" : "請選擇商品");
  }
  if (payload.commission_value <= 0) throw new Error("分潤數值要大於 0");
  if (payload.commission_type === "percent" && payload.commission_value > 100) {
    throw new Error("百分比不能超過 100");
  }

  const q = rule.id
    ? supabase.from("affiliate_rules").update(payload).eq("id", rule.id)
    : supabase.from("affiliate_rules").insert(payload);

  const { error } = await q;
  if (error) {
    if (error.code === "23505") throw new Error("這個夥伴對同一個目標已經有規則了");
    throw error;
  }
}

export async function deleteRule(id) {
  const { error } = await supabase.from("affiliate_rules").delete().eq("id", id);
  if (error) throw error;
}

/** 分潤帳本，預設只看未結清的 */
export async function getCommissions({ affiliateId, status } = {}) {
  let q = supabase
    .from("affiliate_commissions")
    .select("*, affiliates(name, code)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (affiliateId) q = q.eq("affiliate_id", affiliateId);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function setCommissionStatus(ids, status) {
  if (!ids?.length) return;
  const patch = { status };
  if (status === "paid") patch.settled_at = new Date().toISOString();
  const { error } = await supabase
    .from("affiliate_commissions")
    .update(patch)
    .in("id", ids);
  if (error) throw error;
}

/** 規則編輯器的下拉選單用 */
export async function getTargetOptions() {
  const [progs, prods] = await Promise.all([
    supabase.from("program_art").select("name").order("name"),
    supabase.from("products").select("id,name").order("id"),
  ]);
  return {
    programs: (progs.data || []).map((p) => p.name),
    products: (prods.data || []).map((p) => ({ id: String(p.id), name: p.name })),
  };
}
