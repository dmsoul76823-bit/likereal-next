"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getImageMap, setImageKey } from "@/lib/admin-images";
import ImageField from "../ImageField";

const TYPES = ["治癒系", "御姐系", "時尚系", "清純系", "偶像系", "女友系"];
const TIERS = ["精選", "NEW"];

const blank = () => ({
  name: "", slug: "", ctype: TYPES[0], tier: "NEW",
  online: true, fans: "0", hot: "0", descr: "",
});

export default function Creators({ flash }) {
  const [rows, setRows] = useState(null);
  const [images, setImages] = useState({});
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const [{ data, error }, map] = await Promise.all([
        supabase.from("creators").select("*").order("id"),
        getImageMap(),
      ]);
      if (error) throw error;
      setRows(data || []);
      setImages(map);
    } catch (e) {
      setErr(e?.message || String(e));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return (rows || []).filter(
      (c) => !k || String(c.name || "").toLowerCase().includes(k) || String(c.slug || "").includes(k)
    );
  }, [rows, q]);

  async function remove(c) {
    if (!window.confirm(`確定刪除創作者「${c.name}」？`)) return;
    const { error } = await supabase.from("creators").delete().eq("id", c.id);
    if (error) return setErr("刪除失敗：" + error.message);
    flash?.("已刪除創作者");
    load();
  }

  if (err && !rows) return <div className="panel"><h3>讀取失敗</h3><div className="hint">{err}</div></div>;
  if (!rows) return <div className="panel"><div className="hint">載入中…</div></div>;

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>創作者管理</h3>
            <div className="hint" style={{ margin: 0 }}>OnlyMate 角色資料、上線狀態與人氣</div>
          </div>
          <div className="tools">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋創作者…" />
            <button className="btn btn-brand btn-sm" onClick={() => setEdit(blank())}>＋ 新增創作者</button>
          </div>
        </div>

        {err && <div style={{ color: "var(--err)", fontSize: 13, marginBottom: 10 }}>{err}</div>}

        {list.length === 0 ? (
          <div className="empty">沒有符合的創作者</div>
        ) : (
          <table>
            <thead>
              <tr><th>角色</th><th>代稱</th><th>類型</th><th>標籤</th><th>粉絲</th><th>人氣</th><th>狀態</th><th /></tr>
            </thead>
            <tbody>
              {list.map((c) => {
                const im = images[c.slug];
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          className="thumb-sm"
                          style={{
                            height: 48, width: 36, borderRadius: 7,
                            backgroundSize: "cover", backgroundPosition: "center top",
                            backgroundImage: im ? `url("${im}")` : undefined,
                          }}
                        />
                        <b>{c.name}</b>
                      </div>
                    </td>
                    <td><code style={{ color: "var(--muted)" }}>{c.slug}</code></td>
                    <td><span className="tag b">{c.ctype}</span></td>
                    <td>{c.tier === "精選" ? <span className="tag warn">精選</span> : <span className="tag">NEW</span>}</td>
                    <td style={{ color: "var(--muted)" }}>{c.fans}</td>
                    <td style={{ color: "var(--muted)" }}>{c.hot}</td>
                    <td><span className={`tag ${c.online ? "ok" : "err"}`}>{c.online ? "在線" : "離線"}</span></td>
                    <td>
                      <div className="row-act">
                        <button className="btn btn-ghost btn-sm" onClick={() => setEdit(c)}>編輯</button>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(c)}>刪除</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {edit && (
        <CreatorEditor
          creator={edit}
          images={images}
          flash={flash}
          onClose={() => setEdit(null)}
          onSaved={async () => { setEdit(null); await load(); }}
        />
      )}
    </>
  );
}

function CreatorEditor({ creator, images, flash, onClose, onSaved }) {
  const isNew = !creator.id;
  const [f, setF] = useState({ ...creator });
  const [img, setImg] = useState(images[creator.slug] || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    if (!String(f.name || "").trim() || !String(f.slug || "").trim()) {
      return setErr("名稱與代稱 slug 都要填");
    }
    setBusy(true);
    setErr("");
    try {
      const row = {
        name: f.name.trim(),
        slug: f.slug.trim(),
        ctype: f.ctype,
        tier: f.tier,
        online: !!f.online,
        fans: f.fans || "0",
        hot: f.hot || "0",
        descr: f.descr || "",
      };

      if (isNew) {
        const { error } = await supabase.from("creators").insert(row);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("creators").update(row).eq("id", creator.id);
        if (error) throw error;
      }

      await setImageKey(row.slug, img, creator.slug);
      flash?.(isNew ? "創作者已新增" : "創作者已更新");
      onSaved?.();
    } catch (e) {
      setErr("儲存失敗：" + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mask on" onClick={onClose} />
      <div className="modal on">
        <div className="modal-head">
          <h3>{isNew ? "新增創作者" : "編輯創作者"}</h3>
          <span className="x" onClick={onClose}>✕</span>
        </div>
        <div className="modal-body">
          <div className="fgrid">
            <div className="fld"><label>名稱</label>
              <input value={f.name || ""} onChange={(e) => set("name", e.target.value)} /></div>
            <div className="fld"><label>路徑代稱 slug</label>
              <input value={f.slug || ""} onChange={(e) => set("slug", e.target.value)} placeholder="sora" /></div>
            <div className="fld"><label>類型</label>
              <select value={f.ctype} onChange={(e) => set("ctype", e.target.value)}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select></div>
            <div className="fld"><label>標籤</label>
              <select value={f.tier} onChange={(e) => set("tier", e.target.value)}>
                {TIERS.map((t) => <option key={t}>{t}</option>)}
              </select></div>
            <div className="fld"><label>粉絲數</label>
              <input value={f.fans || ""} onChange={(e) => set("fans", e.target.value)} placeholder="128K" /></div>
            <div className="fld"><label>人氣指數</label>
              <input value={f.hot || ""} onChange={(e) => set("hot", e.target.value)} placeholder="9.8萬" /></div>
            <div className="fld"><label>上線狀態</label>
              <select value={f.online ? "1" : "0"} onChange={(e) => set("online", e.target.value === "1")}>
                <option value="1">在線</option><option value="0">離線</option>
              </select></div>
            <div className="fld tall full"><label>簡介</label>
              <textarea value={f.descr || ""} onChange={(e) => set("descr", e.target.value)} /></div>

            <div className="fld full">
              <label>角色照</label>
              <ImageField
                value={img}
                onChange={setImg}
                prefix={`creator-${f.slug || "c"}`}
                ratio="3/4"
                hint={<><b>📐 建議規格</b>尺寸：<code>900 × 1200 px</code>（3:4）· <code>JPG / WebP</code> · 建議 &lt; 350 KB<br />人物置中、預留頭部空間，避免臉部被卡片裁切</>}
              />
              <div className="spec" style={{ marginTop: 8 }}>
                角色照是依 <b>slug</b> 對應的。改了 slug，圖片會自動搬到新的 slug 下。
              </div>
            </div>
          </div>
          {err && <div style={{ color: "var(--err)", fontSize: 13, marginTop: 12 }}>{err}</div>}
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
          <button className="btn btn-brand" onClick={save} disabled={busy}>{busy ? "儲存中…" : "儲存"}</button>
        </div>
      </div>
    </>
  );
}
