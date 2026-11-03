"use client";
import { useCallback, useEffect, useState } from "react";
import { getSettings, saveSetting } from "@/lib/admin-images";
import ImageField from "../ImageField";

const KEYS = ["marquee", "announcements", "banners", "shop_policy", "seo"];
const todayISO = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());

export default function Settings({ flash }) {
  const [s, setS] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try {
      const got = await getSettings(KEYS);
      setS({
        marquee: typeof got.marquee === "string" ? got.marquee : "",
        announcements: Array.isArray(got.announcements) ? got.announcements : [],
        banners: Array.isArray(got.banners) ? got.banners : [],
        shop_policy: got.shop_policy && typeof got.shop_policy === "object" ? got.shop_policy : {},
        seo: got.seo && typeof got.seo === "object" ? got.seo : {},
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

  if (err && !s) return <div className="panel"><h3>讀取失敗</h3><div className="hint">{err}</div></div>;
  if (!s) return <div className="panel"><div className="hint">載入中…</div></div>;

  const set = (k, v) => setS((x) => ({ ...x, [k]: v }));
  const nextId = (arr) => Math.max(0, ...arr.map((x) => Number(x.id) || 0)) + 1;

  return (
    <>
      {err && <div className="panel" style={{ color: "var(--err)", fontSize: 13 }}>{err}</div>}

      {/* 跑馬燈 */}
      <div className="panel">
        <h3>跑馬燈</h3>
        <div className="hint">顯示於前台導覽列下方，多則以「｜」分隔</div>
        <div className="fld">
          <textarea value={s.marquee} onChange={(e) => set("marquee", e.target.value)} />
        </div>
        <button
          className="btn btn-brand btn-sm"
          onClick={() => save("marquee", s.marquee, "跑馬燈")}
          disabled={busy === "marquee"}
        >
          {busy === "marquee" ? "儲存中…" : "儲存跑馬燈"}
        </button>
      </div>

      {/* 公告 */}
      <div className="panel">
        <div className="panel-head">
          <div><h3>公告消息</h3><div className="hint" style={{ margin: 0 }}>前台公告區</div></div>
          <button
            className="btn btn-brand btn-sm"
            onClick={() =>
              set("announcements", [
                { id: nextId(s.announcements), tag: "系統公告", title: "", body: "", date: todayISO() },
                ...s.announcements,
              ])
            }
          >
            ＋ 新增公告
          </button>
        </div>

        {s.announcements.length === 0 ? (
          <div className="empty">目前沒有公告</div>
        ) : (
          s.announcements.map((a, i) => (
            <div className="fgrid" key={a.id ?? i} style={{ borderBottom: "1px dashed var(--line2)", paddingBottom: 12, marginBottom: 12 }}>
              <div className="fld"><label>標籤</label>
                <input value={a.tag || ""} onChange={(e) => {
                  const n = [...s.announcements]; n[i] = { ...a, tag: e.target.value }; set("announcements", n);
                }} placeholder="系統公告 / 入場須知" /></div>
              <div className="fld"><label>日期</label>
                <input type="date" value={a.date || ""} onChange={(e) => {
                  const n = [...s.announcements]; n[i] = { ...a, date: e.target.value }; set("announcements", n);
                }} /></div>
              <div className="fld full"><label>標題</label>
                <input value={a.title || ""} onChange={(e) => {
                  const n = [...s.announcements]; n[i] = { ...a, title: e.target.value }; set("announcements", n);
                }} /></div>
              <div className="fld full"><label>內容</label>
                <textarea value={a.body || ""} onChange={(e) => {
                  const n = [...s.announcements]; n[i] = { ...a, body: e.target.value }; set("announcements", n);
                }} /></div>
              <div className="fld full" style={{ textAlign: "right" }}>
                <button className="btn btn-danger btn-sm" onClick={() => set("announcements", s.announcements.filter((_, j) => j !== i))}>
                  刪除這則
                </button>
              </div>
            </div>
          ))
        )}

        <button
          className="btn btn-brand btn-sm"
          onClick={() => save("announcements", s.announcements, "公告")}
          disabled={busy === "announcements"}
        >
          {busy === "announcements" ? "儲存中…" : "儲存公告"}
        </button>
      </div>

      {/* Banner */}
      <div className="panel">
        <div className="panel-head">
          <div><h3>Banner 版位</h3><div className="hint" style={{ margin: 0 }}>單張不輪播，多張自動輪播</div></div>
          <button
            className="btn btn-brand btn-sm"
            onClick={() => set("banners", [...s.banners, { id: nextId(s.banners), on: true, pos: "頂部", title: "", sub: "", link: "#" }])}
          >
            ＋ 新增 Banner
          </button>
        </div>

        {s.banners.length === 0 ? (
          <div className="empty">目前沒有 Banner</div>
        ) : (
          s.banners.map((b, i) => {
            const upd = (patch) => {
              const n = [...s.banners]; n[i] = { ...b, ...patch }; set("banners", n);
            };
            return (
              <div className="fgrid" key={b.id ?? i} style={{ borderBottom: "1px dashed var(--line2)", paddingBottom: 12, marginBottom: 12 }}>
                <div className="fld"><label>位置</label>
                  <select value={b.pos || "頂部"} onChange={(e) => upd({ pos: e.target.value })}>
                    <option>頂部</option><option>底部</option>
                  </select></div>
                <div className="fld"><label>狀態</label>
                  <select value={b.on === false ? "0" : "1"} onChange={(e) => upd({ on: e.target.value === "1" })}>
                    <option value="1">顯示</option><option value="0">隱藏</option>
                  </select></div>
                <div className="fld full"><label>標題</label>
                  <input value={b.title || ""} onChange={(e) => upd({ title: e.target.value })} /></div>
                <div className="fld full"><label>副標</label>
                  <input value={b.sub || ""} onChange={(e) => upd({ sub: e.target.value })} /></div>
                <div className="fld full"><label>連結</label>
                  <input value={b.link || ""} onChange={(e) => upd({ link: e.target.value })} placeholder="/shop 或 https://…" /></div>
                <div className="fld full" style={{ textAlign: "right" }}>
                  <button className="btn btn-danger btn-sm" onClick={() => set("banners", s.banners.filter((_, j) => j !== i))}>
                    刪除這張
                  </button>
                </div>
              </div>
            );
          })
        )}

        <button className="btn btn-brand btn-sm" onClick={() => save("banners", s.banners, "Banner")} disabled={busy === "banners"}>
          {busy === "banners" ? "儲存中…" : "儲存 Banner"}
        </button>
      </div>

      {/* 購買須知 */}
      <div className="panel">
        <h3>購買須知（商品說明頁）</h3>
        <div className="hint">顯示在每一個商品說明頁下方，一行一點；留空會使用系統預設文字</div>
        <div className="fgrid">
          {[
            ["ship", "🚚 到貨與運送"],
            ["ret", "🔄 退換貨須知"],
            ["pay", "💳 付款與金流"],
            ["note", "ℹ️ 其他說明（可留空）"],
          ].map(([k, label]) => (
            <div className="fld tall full" key={k}>
              <label>{label}</label>
              <textarea
                value={s.shop_policy[k] || ""}
                onChange={(e) => set("shop_policy", { ...s.shop_policy, [k]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <button className="btn btn-brand btn-sm" onClick={() => save("shop_policy", s.shop_policy, "購買須知")} disabled={busy === "shop_policy"}>
          {busy === "shop_policy" ? "儲存中…" : "儲存購買須知"}
        </button>
      </div>

      {/* SEO */}
      <div className="panel">
        <h3>全站 SEO</h3>
        <div className="hint">搜尋引擎與社群分享顯示設定</div>
        <div className="fgrid">
          <div className="fld full"><label>網站標題 (Title)</label>
            <input maxLength={60} value={s.seo.t || ""} onChange={(e) => set("seo", { ...s.seo, t: e.target.value })} /></div>
          <div className="fld tall full"><label>網站描述 (Description)</label>
            <textarea maxLength={160} value={s.seo.d || ""} onChange={(e) => set("seo", { ...s.seo, d: e.target.value })} /></div>
          <div className="fld"><label>關鍵字（逗號分隔）</label>
            <input value={s.seo.k || ""} onChange={(e) => set("seo", { ...s.seo, k: e.target.value })} /></div>
          <div className="fld"><label>網站網址</label>
            <input value={s.seo.u || ""} onChange={(e) => set("seo", { ...s.seo, u: e.target.value })} /></div>
          <div className="fld"><label>Google Analytics ID</label>
            <input value={s.seo.ga || ""} onChange={(e) => set("seo", { ...s.seo, ga: e.target.value })} placeholder="G-XXXXXXXXXX" /></div>
          <div className="fld"><label>Search Console 驗證碼</label>
            <input value={s.seo.sc || ""} onChange={(e) => set("seo", { ...s.seo, sc: e.target.value })} /></div>
          <div className="fld full">
            <label>社群分享圖 (OG Image)</label>
            <ImageField
              value={s.seo.og || ""}
              onChange={(v) => set("seo", { ...s.seo, og: v })}
              prefix="og"
              ratio="1200/630"
              hint={<><b>📐 建議規格</b>尺寸：<code>1200 × 630 px</code>（1.91:1）· <code>JPG / PNG</code> · 建議 &lt; 300 KB<br />用於 Facebook / LINE / X 分享預覽卡片</>}
            />
          </div>
        </div>
        <button className="btn btn-brand btn-sm" onClick={() => save("seo", s.seo, "SEO 設定")} disabled={busy === "seo"}>
          {busy === "seo" ? "儲存中…" : "儲存 SEO 設定"}
        </button>

        <div className="spec" style={{ marginTop: 14 }}>
          <b>顯示預覽</b>
          <div className="seo-prev" style={{ marginTop: 8 }}>
            <div className="u">{s.seo.u || "（尚未設定網址）"}</div>
            <div className="t">{s.seo.t || "—"}</div>
            <div className="d">{s.seo.d || "—"}</div>
          </div>
        </div>
      </div>
    </>
  );
}
