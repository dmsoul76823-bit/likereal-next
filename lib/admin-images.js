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
