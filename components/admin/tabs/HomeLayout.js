"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSettings, saveSetting } from "@/lib/admin-images";
import ImageField from "../ImageField";
import { ytId } from "@/lib/admin-seats";

const BLOCKS = [
  ["programs", "沉浸節目"],
  ["tickets", "場域售票（場次）"],
  ["products", "裸視 3D 商品"],
  ["plans", "會員儲值方案"],
];

const emptyPromo = () => ({ title: "", sub: "", cta: "前往 →", url: "", img: "", yt: "", on: true });

export default function HomeLayout({ flash }) {
  const [layout, setLayout] = useState(null);
  const [promos, setPromos] = useState([]);
  const [head, setHead] = useState({});
  const [pick, setPick] = useState({});
  const [names, setNames] = useState({ programs: [], products: [] });
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const got = await getSettings(["home_layout", "promos", "promos_head", "home_pick"]);
      setLayout({ programs: 3, tickets: 6, products: 8, plans: 2, ...(got.home_layout || {}) });
      setPromos(Array.isArray(got.promos) && got.promos.length ? got.promos : [emptyPromo(), emptyPromo()]);
      setHead(got.promos_head || {});
      setPick(got.home_pick || {});

      const [pa, pr] = await Promise.all([
        supabase.from("program_art").select("name").order("name"),
        supabase.from("products").select("name").order("id"),
      ]);
      setNames({
        programs: (pa.data || []).map((r) => r.name).filter(Boolean),
        products: (pr.data || []).map((r) => r.name).filter(Boolean),
      });
    } catch (e) {
      setErr(e?.message || String(e));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save(key, value, label) {
    setBusy(key);
    setErr("");
    try {
      await saveSetting(key, value);
      flash?.(label + "已儲存");
    } catch (e) {
      setErr(`${label}儲存失敗：` + (e?.message || e));
    } finally {
      setBusy("");
    }
  }

  if (err && !layout) return <div className="panel"><h3>讀取失敗</h3><div className="hint">{err}</div></div>;
  if (!layout) return <div className="panel"><div className="hint">載入中…</div></div>;

  /** 某一區的精選清單：勾選 + 上下排序 */
  function PickList({ sec, label, all }) {
    const chosen = Array.isArray(pick[sec]) ? pick[sec] : [];
    const setChosen = (next) => setPick({ ...pick, [sec]: next });
    const move = (i, d) => {
      const n = [...chosen];
      const j = i + d;
      if (j < 0 || j >= n.length) return;
      [n[i], n[j]] = [n[j], n[i]];
      setChosen(n);
    };

    return (
      <div style={{ marginBottom: 22 }}>
        <label style={{ fontSize: 13, color: "var(--brand3)", fontWeight: 700 }}>{label}</label>

        {chosen.length > 0 && (
          <div style={{ margin: "8px 0 10px" }}>
            {chosen.map((name, i) => (
              <div
                key={name}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "6px 10px", background: "var(--card2)",
                  border: "1px solid var(--line2)", borderRadius: 9, marginBottom: 6,
                }}
              >
                <span style={{ color: "var(--muted)", fontSize: 12, width: 20 }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 13 }}>{name}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                <button className="btn btn-ghost btn-sm" onClick={() => move(i, 1)} disabled={i === chosen.length - 1}>↓</button>
                <button className="btn btn-danger btn-sm" onClick={() => setChosen(chosen.filter((x) => x !== name))}>移除</button>
              </div>
            ))}
          </div>
        )}

        <select
          value=""
          onChange={(e) => {
            const v = e.target.value;
            if (v && !chosen.includes(v)) setChosen([...chosen, v]);
          }}
        >
          <option value="">＋ 加入項目…</option>
          {all.filter((n) => !chosen.includes(n)).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>

        {chosen.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            沒有指定任何項目，首頁這一區會自動顯示最新／最近的項目。
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {err && <div className="panel" style={{ color: "var(--err)", fontSize: 13 }}>{err}</div>}

      <div className="panel">
        <h3>各區塊顯示數量</h3>
        <div className="hint">設定前台首頁每個區塊要顯示幾個項目</div>
        <div className="fgrid">
          {BLOCKS.map(([k, label]) => (
            <div className="fld" key={k}>
              <label>{label}</label>
              <input
                type="number" min={0} max={24}
                value={layout[k] ?? 0}
                onChange={(e) => setLayout({ ...layout, [k]: Math.max(0, Math.min(24, Number(e.target.value) || 0)) })}
              />
            </div>
          ))}
        </div>
        <button className="btn btn-brand btn-sm" onClick={() => save("home_layout", layout, "區塊數量")} disabled={busy === "home_layout"}>
          {busy === "home_layout" ? "儲存中…" : "儲存區塊數量"}
        </button>
        <div className="spec" style={{ marginTop: 12 }}>
          <b>💡 設為 0</b> 該區塊就不會出現在首頁。
        </div>
      </div>

      <div className="panel">
        <h3>首頁導引版位（2 片 16:9）</h3>
        <div className="hint">首頁「直播與 AI 夥伴」那一區；可放圖片或 YouTube 影片，點擊導到其他站台</div>

        <div className="fgrid">
          <div className="fld"><label>區塊小標（英文）</label>
            <input value={head.tag || ""} onChange={(e) => setHead({ ...head, tag: e.target.value })} placeholder="EXPERIENCE · 延伸體驗" /></div>
          <div className="fld"><label>區塊標題</label>
            <input value={head.title || ""} onChange={(e) => setHead({ ...head, title: e.target.value })} placeholder="直播與 AI 夥伴" /></div>
        </div>

        {promos.slice(0, 2).map((p, i) => {
          const upd = (patch) => {
            const n = [...promos]; n[i] = { ...p, ...patch }; setPromos(n);
          };
          return (
            <div className="fgrid" key={i} style={{ borderTop: "1px dashed var(--line2)", paddingTop: 14, marginTop: 14 }}>
              <div className="fld full">
                <label style={{ color: "var(--brand3)", fontWeight: 700 }}>第 {i + 1} 片</label>
              </div>
              <div className="fld"><label>標題</label>
                <input value={p.title || ""} onChange={(e) => upd({ title: e.target.value })} /></div>
              <div className="fld"><label>狀態</label>
                <select value={p.on === false ? "0" : "1"} onChange={(e) => upd({ on: e.target.value === "1" })}>
                  <option value="1">顯示</option><option value="0">隱藏</option>
                </select></div>
              <div className="fld full"><label>副標</label>
                <input value={p.sub || ""} onChange={(e) => upd({ sub: e.target.value })} /></div>
              <div className="fld"><label>按鈕文字</label>
                <input value={p.cta || ""} onChange={(e) => upd({ cta: e.target.value })} placeholder="前往 →" /></div>
              <div className="fld"><label>連結（留空就不可點）</label>
                <input value={p.url || ""} onChange={(e) => upd({ url: e.target.value })} placeholder="/live 或 https://…" /></div>
              <div className="fld full"><label>YouTube 影片 ID（可留空，會自動靜音循環）</label>
                <input value={p.yt || ""} onChange={(e) => upd({ yt: ytId(e.target.value) })} /></div>
              <div className="fld full">
                <label>背景圖</label>
                <ImageField
                  value={p.img || ""}
                  onChange={(v) => upd({ img: v })}
                  prefix={`promo-${i + 1}`}
                  ratio="16/9"
                  hint={<><b>📐 建議規格</b>尺寸：<code>1600 × 900 px</code>（16:9）· 建議 &lt; 500 KB</>}
                />
              </div>
            </div>
          );
        })}

        <button
          className="btn btn-brand btn-sm"
          style={{ marginTop: 12 }}
          onClick={async () => {
            await save("promos", promos, "導引版位");
            await saveSetting("promos_head", head);
          }}
          disabled={busy === "promos"}
        >
          {busy === "promos" ? "儲存中…" : "儲存導引版位"}
        </button>

        <div className="spec" style={{ marginTop: 12 }}>
          兩片都設為隱藏時，整個區塊不會出現在首頁。
        </div>
      </div>

      <div className="panel">
        <h3>首頁精選項目</h3>
        <div className="hint">指定哪些項目要排在首頁最前面，用 ↑↓ 調整順序；沒指定的話會自動顯示最新／最近的項目</div>

        <PickList sec="tickets" label="場域售票（依節目名稱）" all={names.programs} />
        <PickList sec="products" label="裸視 3D 商品" all={names.products} />

        <button className="btn btn-brand btn-sm" onClick={() => save("home_pick", pick, "首頁精選")} disabled={busy === "home_pick"}>
          {busy === "home_pick" ? "儲存中…" : "儲存首頁精選"}
        </button>
      </div>
    </>
  );
}
