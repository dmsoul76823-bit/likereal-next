/**
 * 把 settings.images 裡的 base64 圖片搬到 Supabase Storage。
 *
 * 用法：
 *   1. 到 Supabase → Project Settings → API Keys，複製 service_role 金鑰
 *   2. 加一行到 ~/likereal-next/.env.local：
 *        SUPABASE_SERVICE_ROLE_KEY=貼在這裡
 *   3. node scripts/migrate-images.mjs          ← 先試跑，不會動到任何東西
 *      node scripts/migrate-images.mjs --apply  ← 確認沒問題後才真的執行
 *
 * 做了什麼：
 *   - 把每張 base64 圖解碼成檔案，上傳到 site-images 這個 bucket
 *   - 把 settings.images 的值換成公開網址
 *   - 動手前會先把原始資料存成 backups/settings-images-<時間>.json
 *
 * service_role 金鑰權限很大，不要提交到 git，也不要貼給任何人（包含我）。
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

// 讀 .env.local（不另外裝套件）
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "site-images";
const APPLY = process.argv.includes("--apply");

if (!URL || !KEY) {
  console.error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY，請先寫進 .env.local");
  process.exit(1);
}

const db = createClient(URL, KEY, { auth: { persistSession: false } });

const EXT = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

const kb = (n) => (n / 1024).toFixed(0) + " KB";

async function main() {
  const { data: row, error } = await db
    .from("settings")
    .select("value")
    .eq("key", "images")
    .maybeSingle();
  if (error) throw error;

  const images = row?.value?.v ?? row?.value ?? {};
  const keys = Object.keys(images);
  if (!keys.length) {
    console.log("settings.images 是空的，沒有東西要搬。");
    return;
  }

  // 先備份
  fs.mkdirSync("backups", { recursive: true });
  const backup = path.join("backups", `settings-images-${Date.now()}.json`);
  fs.writeFileSync(backup, JSON.stringify(row.value, null, 1));
  console.log(`原始資料已備份到 ${backup}\n`);

  if (APPLY) {
    // bucket 不存在就建一個公開的
    const { data: buckets } = await db.storage.listBuckets();
    if (!(buckets || []).some((b) => b.name === BUCKET)) {
      const { error: be } = await db.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: "10MB",
      });
      if (be) throw be;
      console.log(`已建立 bucket：${BUCKET}（公開讀取）\n`);
    }
  }

  const next = {};
  let moved = 0;
  let savedBytes = 0;

  for (const k of keys) {
    const v = String(images[k] ?? "");

    if (!v.startsWith("data:")) {
      next[k] = v; // 已經是網址，跳過
      console.log(`略過 ${k.padEnd(10)} 已經是網址`);
      continue;
    }

    const m = v.match(/^data:([^;]+);base64,(.*)$/s);
    if (!m) {
      next[k] = v;
      console.log(`略過 ${k.padEnd(10)} 認不得的格式`);
      continue;
    }

    const mime = m[1];
    const buf = Buffer.from(m[2], "base64");
    const name = `${k}.${EXT[mime] || "bin"}`;

    console.log(`搬移 ${k.padEnd(10)} ${mime.padEnd(12)} base64 ${kb(v.length)} → 檔案 ${kb(buf.length)}`);
    savedBytes += v.length - buf.length;
    moved++;

    if (!APPLY) {
      next[k] = `(試跑) ${BUCKET}/${name}`;
      continue;
    }

    const { error: ue } = await db.storage
      .from(BUCKET)
      .upload(name, buf, { contentType: mime, upsert: true, cacheControl: "31536000" });
    if (ue) throw ue;

    const { data: pub } = db.storage.from(BUCKET).getPublicUrl(name);
    next[k] = pub.publicUrl;
  }

  console.log(`\n共 ${moved} 張圖，資料庫那一列可以少掉約 ${kb(savedBytes)}。`);

  if (!APPLY) {
    console.log("\n這是試跑，什麼都沒有改。確認上面沒問題就加 --apply 再跑一次：");
    console.log("  node scripts/migrate-images.mjs --apply");
    return;
  }

  const { error: we } = await db
    .from("settings")
    .update({ value: { v: next } })
    .eq("key", "images");
  if (we) throw we;

  console.log("\nsettings.images 已改成公開網址。");
  console.log("舊站和新站都吃得下網址，不用改程式。");
  console.log(`如果要還原，把 ${backup} 的內容寫回 settings.images 即可。`);
}

main().catch((e) => {
  console.error("\n失敗：", e.message || e);
  process.exit(1);
});
