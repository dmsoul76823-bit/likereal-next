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
