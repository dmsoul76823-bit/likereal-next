"use client";
import { useState } from "react";
import { uploadImage } from "@/lib/upload";

/** 圖片欄位：預覽 + 網址輸入 + 上傳按鈕。value / onChange 都是網址字串。 */
export default function ImageField({ value, onChange, prefix = "img", ratio = "16/10", hint }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function pick(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true);
    setErr("");
    try {
      onChange(await uploadImage(f, prefix));
    } catch (ex) {
      setErr(ex?.message || String(ex));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="evimg">
        <div
          className="evimg-pre"
          style={{
            aspectRatio: ratio,
            backgroundImage: value ? `url("${value}")` : undefined,
          }}
        >
          {!value && "尚未設定"}
        </div>
        <div className="evimg-act">
          <input
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="貼上圖片網址，或直接上傳"
          />
          <div style={{ display: "flex", gap: 8 }}>
            <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer", flex: 1, textAlign: "center" }}>
              {busy ? "上傳中…" : "上傳圖片"}
              <input type="file" accept="image/*" hidden onChange={pick} />
            </label>
            <button className="btn btn-danger btn-sm" onClick={() => onChange("")}>
              清除
            </button>
          </div>
        </div>
      </div>
      {err && <div style={{ color: "var(--err)", fontSize: 12, marginTop: 6 }}>{err}</div>}
      {hint && <div className="spec">{hint}</div>}
    </>
  );
}
