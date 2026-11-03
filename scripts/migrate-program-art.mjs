/**
 * 把 program_art.img 裡的 base64 圖片搬到 Supabase Storage。
 *
 * 上一支 migrate-images.mjs 只搬了 settings.images，漏掉這張表。
 * 這些圖會被每個場次的卡片重複載入，不搬會讓頁面大到 Vercel 部署不了。
 *
 * 用法（跟上一支一樣，需要 .env.local 裡的 SUPABASE_SERVICE_ROLE_KEY）：
 *   node scripts/migrate-program-art.mjs          ← 試跑
 *   node scripts/migrate-program-art.mjs --apply  ← 真的執行
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "site-images";
const APPLY = process.argv.includes("--apply");

if (!URL || !KEY) {
  console.error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(URL, KEY, { auth: { persistSession: false } });
const EXT = { "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
const kb = (n) => (n / 1024).toFixed(0) + " KB";

/** 檔名用安全字元，中文節目名轉成短雜湊 */
function safeName(name, ext) {
  let h = 2166136261;
  for (const ch of name) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const ascii = name.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24).toLowerCase();
  return `program-${ascii || "x"}-${(h >>> 0).toString(36)}.${ext}`;
}

async function main() {
  const { data: rows, error } = await db.from("program_art").select("name,img");
  if (error) throw error;

  const todo = (rows || []).filter((r) => String(r.img || "").startsWith("data:"));
  if (!todo.length) {
    console.log("沒有 base64 圖片要搬，program_art 已經乾淨。");
    return;
  }

  fs.mkdirSync("backups", { recursive: true });
  const backup = path.join("backups", `program-art-${Date.now()}.json`);
  fs.writeFileSync(backup, JSON.stringify(todo, null, 1));
  console.log(`原始資料已備份到 ${backup}（${todo.length} 筆）\n`);

  let total = 0;
  for (const r of todo) {
    const m = String(r.img).match(/^data:([^;]+);base64,(.*)$/s);
    if (!m) { console.log(`略過 ${r.name}：認不得的格式`); continue; }

    const mime = m[1];
    const buf = Buffer.from(m[2], "base64");
    const file = safeName(r.name, EXT[mime] || "jpg");
    total += r.img.length;

    console.log(`搬移 ${r.name.padEnd(22)} base64 ${kb(r.img.length).padStart(8)} → 檔案 ${kb(buf.length)}  ${file}`);
    if (!APPLY) continue;

    const { error: ue } = await db.storage
      .from(BUCKET)
      .upload(file, buf, { contentType: mime, upsert: true, cacheControl: "31536000" });
    if (ue) throw ue;

    const { data: pub } = db.storage.from(BUCKET).getPublicUrl(file);
    const { error: we } = await db.from("program_art").update({ img: pub.publicUrl }).eq("name", r.name);
    if (we) throw we;
  }

  console.log(`\n共 ${todo.length} 張，資料庫可以少掉約 ${kb(total)}。`);

  if (!APPLY) {
    console.log("\n這是試跑，什麼都沒改。確認後加 --apply：");
    console.log("  node scripts/migrate-program-art.mjs --apply");
    return;
  }
  console.log("\nprogram_art.img 已改成公開網址。");
  console.log(`要還原的話，把 ${backup} 的內容寫回去即可。`);
}

main().catch((e) => { console.error("\n失敗：", e.message || e); process.exit(1); });
