import { supabase } from "@/lib/supabase";

/**
 * 線上 members 資料表的真實樣子（2026-11 查證）：
 *   id bigint, name, email, phone, vip(text), wallet, orders_count, join_date
 *
 * 注意：它的 id 是 bigint，不是 auth.users 的 uuid，也沒有 tier_id，
 * 跟 member_tiers 之間沒有 foreign key。所以 lib/supabase.js 裡的
 *   getMember(userId) → .eq("id", userId).select("*, member_tiers(*)")
 * 在這個資料庫一定失敗（22P02 + PGRST200），永遠回傳 null。
 * 在 members 真的接上 auth 之前，只能用 email 當對應鍵。
 */
export async function getWvMemberByEmail(email) {
  if (!email) return null;
  const { data, error } = await supabase
    .from("members")
    .select("id,name,email,vip,wallet,orders_count")
    .eq("email", email)
    .maybeSingle();
  if (error) return null;
  return data || null;
}
