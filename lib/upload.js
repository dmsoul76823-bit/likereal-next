"use client";
import { supabase } from "@/lib/supabase";

const BUCKET = "site-images";
const MAX_BYTES = 4 * 1024 * 1024;

/** 把檔案上傳到 Storage，回傳公開網址 */
export async function uploadImage(file, keyPrefix = "img") {
  if (!file) throw new Error("沒有選到檔案");
  if (!file.type.startsWith("image/")) throw new Error("請選擇圖片檔");
  if (file.size > MAX_BYTES) {
    throw new Error(`圖片 ${(file.size / 1024 / 1024).toFixed(1)} MB 太大了，請壓到 4 MB 以內`);
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const name = `${keyPrefix}-${Date.now()}.${ext || "jpg"}`;

  const { error } = await supabase.storage.from(BUCKET).upload(name, file, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) {
    if (/row-level security|policy/i.test(error.message)) {
      throw new Error("沒有上傳權限 — 請先執行 sql/wv-admin-prereq.sql");
    }
    throw error;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(name);
  return data.publicUrl;
}
