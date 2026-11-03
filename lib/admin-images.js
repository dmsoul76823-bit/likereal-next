"use client";
import { supabase } from "@/lib/supabase";

/**
 * 圖片對照表存在 settings.images（key → 網址）。
 * 以前這裡塞的是整串 base64，現在是 Storage 的網址，兩種都讀得到。
 */
export async function getImageMap() {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "images")
    .maybeSingle();
  return data?.value?.v ?? data?.value ?? {};
}

/** 設定（或刪除）某個 key 的圖片；oldKey 有值且不同時會一併搬移 */
export async function setImageKey(key, url, oldKey = null) {
  const map = await getImageMap();
  const next = { ...map };

  if (oldKey && oldKey !== key) {
    delete next[oldKey];
    delete next[`${oldKey}@pos`];
  }
  if (url) next[key] = url;
  else {
    delete next[key];
    delete next[`${key}@pos`];
  }

  const { error } = await supabase
    .from("settings")
    .upsert({ key: "images", value: { v: next } }, { onConflict: "key" });
  if (error) throw error;
  return next;
}

/** 讀取多個 settings 鍵，回傳 {key: 內層值} */
export async function getSettings(keys) {
  const { data } = await supabase.from("settings").select("key,value").in("key", keys);
  const out = {};
  (data || []).forEach((r) => {
    out[r.key] = r?.value?.v ?? r?.value ?? null;
  });
  return out;
}

/** 寫入一個 settings 鍵（一律包成 {v: ...}，與現有資料一致） */
export async function saveSetting(key, value) {
  const { error } = await supabase
    .from("settings")
    .upsert({ key, value: { v: value } }, { onConflict: "key" });
  if (error) throw error;
}
