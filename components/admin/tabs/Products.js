"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { money } from "@/lib/admin";
import { ytId } from "@/lib/admin-seats";
import { getImageMap, setImageKey } from "@/lib/admin-images";
import ImageField from "../ImageField";

const blank = (n) => ({
  img_key: `p${n}`,
  name: "",
  price: 0,
  old_price: 0,
  stock: 0,
  badge: "",
  on_sale: true,
  sub: "",
  intro: "",
  spec: "",
  yt_id: "",
});

export default function Products({ flash }) {
  const [rows, setRows] = useState(null);
  const [images, setImages] = useState({});
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const [{ data, error }, map] = await Promise.all([
        supabase.from("products").select("*").order("id"),
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
    return (rows || []).filter((p) => !k || String(p.name || "").toLowerCase().includes(k));
  }, [rows, q]);

  async function remove(p) {
    if (!window.confirm(`確定刪除商品「${p.name}」？`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) return setErr("刪除失敗：" + error.message);
    flash?.("已刪除商品");
    load();
  }

  if (err && !rows) return <div className="panel"><h3>讀取失敗</h3><div className="hint">{err}</div></div>;
  if (!rows) return <div className="panel"><div className="hint">載入中…</div></div>;

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>商品管理</h3>
            <div className="hint" style={{ margin: 0 }}>裸視 3D 系列電商商品</div>
          </div>
          <div className="tools">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋商品…" />
            <button className="btn btn-brand btn-sm" onClick={() => setEdit(blank(rows.length))}>
              ＋ 新增商品
            </button>
          </div>
        </div>

        {err && <div style={{ color: "var(--err)", fontSize: 13, marginBottom: 10 }}>{err}</div>}

        {list.length === 0 ? (
          <div className="empty">沒有符合的商品</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>商品</th><th>售價</th><th>原價</th><th>庫存</th><th>標籤</th><th>上架</th><th />
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const im = images[p.img_key];
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          className="thumb-sm"
                          style={{
                            height: 44, width: 44, borderRadius: 7,
                            backgroundSize: "cover", backgroundPosition: "center",
                            backgroundImage: im ? `url("${im}")` : undefined,
                          }}
                        />
                        <b>{p.name}</b>
                      </div>
                    </td>
                    <td style={{ color: "var(--brand3)", fontWeight: 700 }}>{money(p.price)}</td>
                    <td style={{ color: "var(--muted)" }}>{p.old_price ? money(p.old_price) : "—"}</td>
                    <td>
                      {p.stock}
                      {p.stock != null && p.stock < 50 && <span className="tag warn" style={{ marginLeft: 6 }}>低庫存</span>}
                    </td>
                    <td>{p.badge ? <span className="tag b">{p.badge}</span> : "—"}</td>
                    <td><span className={`tag ${p.on_sale ? "ok" : "err"}`}>{p.on_sale ? "上架" : "下架"}</span></td>
                    <td>
                      <div className="row-act">
                        <button className="btn btn-ghost btn-sm" onClick={() => setEdit(p)}>編輯</button>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(p)}>刪除</button>
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
        <ProductEditor
          product={edit}
          images={images}
          flash={flash}
          onClose={() => setEdit(null)}
          onSaved={async () => { setEdit(null); await load(); }}
        />
      )}
    </>
  );
}

function ProductEditor({ product, images, flash, onClose, onSaved }) {
  const isNew = !product.id;
  const [f, setF] = useState({ ...product });
  const [img, setImg] = useState(images[product.img_key] || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    if (!String(f.name || "").trim()) return setErr("請填寫商品名稱");
    if (!String(f.img_key || "").trim()) return setErr("請填寫圖片代碼");

    setBusy(true);
    setErr("");
    try {
      const row = {
        img_key: f.img_key.trim(),
        name: f.name.trim(),
        price: Number(f.price) || 0,
        old_price: Number(f.old_price) || 0,
        stock: Number(f.stock) || 0,
        badge: f.badge || "",
        on_sale: !!f.on_sale,
        sub: f.sub || "",
        intro: f.intro || "",
        spec: f.spec || "",
        yt_id: ytId(f.yt_id) || "",
      };

      if (isNew) {
        const { error } = await supabase.from("products").insert(row);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").update(row).eq("id", product.id);
        if (error) throw error;
      }

      await setImageKey(row.img_key, img, product.img_key);
      flash?.(isNew ? "商品已新增" : "商品已更新");
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
          <h3>{isNew ? "新增商品" : "編輯商品"}</h3>
          <span className="x" onClick={onClose}>✕</span>
        </div>
        <div className="modal-body">
          <div className="fgrid">
            <div className="fld full"><label>商品名稱</label>
              <input value={f.name || ""} onChange={(e) => set("name", e.target.value)} /></div>
            <div className="fld"><label>圖片代碼 key</label>
              <input value={f.img_key || ""} onChange={(e) => set("img_key", e.target.value)} placeholder="p0" /></div>
            <div className="fld"><label>標籤</label>
              <input value={f.badge || ""} onChange={(e) => set("badge", e.target.value)} placeholder="熱賣 / 新品" /></div>
            <div className="fld"><label>售價 NT$</label>
              <input type="number" value={f.price ?? 0} onChange={(e) => set("price", e.target.value)} /></div>
            <div className="fld"><label>原價 NT$（0 表不顯示）</label>
              <input type="number" value={f.old_price ?? 0} onChange={(e) => set("old_price", e.target.value)} /></div>
            <div className="fld"><label>庫存</label>
              <input type="number" value={f.stock ?? 0} onChange={(e) => set("stock", e.target.value)} /></div>
            <div className="fld"><label>上架狀態</label>
              <select value={f.on_sale ? "1" : "0"} onChange={(e) => set("on_sale", e.target.value === "1")}>
                <option value="1">上架</option><option value="0">下架</option>
              </select></div>

            <div className="fld full"><label>副標（一句話，顯示在名稱下方）</label>
              <input value={f.sub || ""} onChange={(e) => set("sub", e.target.value)} placeholder="例：0.3mm 超薄裸視 3D 光柵膜" /></div>
            <div className="fld tall full"><label>商品說明</label>
              <textarea value={f.intro || ""} onChange={(e) => set("intro", e.target.value)} /></div>
            <div className="fld tall full"><label>規格（可留空）</label>
              <textarea value={f.spec || ""} onChange={(e) => set("spec", e.target.value)} placeholder="尺寸：…&#10;材質：…" /></div>
            <div className="fld full"><label>YouTube 影片 ID（可留空）</label>
              <input value={f.yt_id || ""} onChange={(e) => set("yt_id", e.target.value)} placeholder="LXb3EKWsInQ 或整串網址" /></div>

            <div className="fld full">
              <label>商品圖</label>
              <ImageField
                value={img}
                onChange={setImg}
                prefix={`product-${f.img_key || "p"}`}
                ratio="1/1"
                hint={<><b>📐 建議規格</b>尺寸：<code>1000 × 1000 px</code>（1:1）· <code>JPG / PNG</code> · 建議 &lt; 300 KB<br />商品置中、深色或純色背景最能融入前台暗色版面</>}
              />
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
