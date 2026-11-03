"use client";
import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const DOW = ["日", "一", "二", "三", "四", "五", "六"];
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());

function StatusTag({ s }) {
  const m = { 售票中: "ok", 即將售罄: "warn", 已售罄: "err", 未開賣: "info" };
  return <span className={`tag ${m[s] || ""}`}>{s}</span>;
}

export default function SessionManager({ group, evlite, flash, onClose, onChanged }) {
  const rows = useMemo(
    () => evlite.filter((e) => e.name === group.name),
    [evlite, group.name]
  );

  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [dows, setDows] = useState([]);
  const [times, setTimes] = useState("19:00");
  const [tpl, setTpl] = useState(rows[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function toggleDow(i) {
    setDows((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]));
  }

  async function batchAdd() {
    setErr("");
    if (!from || !to) return setErr("請選擇日期區間");
    if (from > to) return setErr("結束日期不能早於起始日期");
    if (!tpl) return setErr("請先建立一個場次作為票種範本");

    const timeList = times.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
    if (!timeList.length) return setErr("請填寫時間");

    setBusy(true);
    try {
      const { data: t, error: e0 } = await supabase
        .from("events")
        .select("*")
        .eq("id", tpl)
        .single();
      if (e0) throw e0;

      const exists = new Set(rows.map((r) => `${r.show_date}|${r.show_time}|${r.venue_id}`));
      const make = [];

      // 用字串日期逐日推進，避免時區把日期偏掉一天
      for (let d = new Date(from + "T12:00:00"); ; d.setDate(d.getDate() + 1)) {
        const ds = new Intl.DateTimeFormat("en-CA").format(d);
        if (ds > to) break;
        if (dows.length && !dows.includes(d.getDay())) continue;
        timeList.forEach((tm) => {
          if (exists.has(`${ds}|${tm}|${t.venue_id}`)) return;
          make.push({
            name: group.name,
            venue: t.venue,
            venue_id: t.venue_id,
            show_date: ds,
            show_time: tm,
            cat: t.cat,
            status: "售票中",
            sale: t.sale,
            sold: 0,
            cap: t.cap,
            tickets: t.tickets,
            sold_seats: [],
            intro: t.intro,
            yt: t.yt,
            img: t.img,
          });
        });
      }

      if (!make.length) {
        setErr("沒有可新增的場次（可能都已經存在）");
        return;
      }
      if (!window.confirm(`將新增 ${make.length} 個場次，確定嗎？`)) return;

      for (let i = 0; i < make.length; i += 200) {
        const { error } = await supabase.from("events").insert(make.slice(i, i + 200));
        if (error) {
          if (/null value in column "id"/i.test(error.message)) {
            throw new Error(
              "場次編號還不會自動產生 — 請先到 Supabase 執行 sql/wv-admin-prereq.sql"
            );
          }
          throw error;
        }
      }

      flash?.(`已新增 ${make.length} 個場次`);
      await onChanged?.();
      onClose();
    } catch (e) {
      setErr("新增失敗：" + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function removeSession(r) {
    const msg =
      r.sold > 0
        ? `此場次已售出 ${r.sold} 張票，刪除後這些客人的票券會查不到。確定仍要刪除？`
        : "確定刪除此場次？";
    if (!window.confirm(msg)) return;

    setBusy(true);
    try {
      const { error } = await supabase.from("events").delete().eq("id", r.id);
      if (error) throw error;
      flash?.("已刪除場次");
      await onChanged?.();
    } catch (e) {
      setErr("刪除失敗：" + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mask on" onClick={onClose} />
      <div className="modal on">
        <div className="modal-head">
          <h3>場次管理 · {group.name}</h3>
          <span className="x" onClick={onClose}>✕</span>
        </div>

        <div className="modal-body">
          <div className="panel" style={{ margin: "0 0 18px", padding: 16 }}>
            <h3 style={{ fontSize: 15, marginBottom: 4 }}>批次新增場次</h3>
            <div className="hint">
              選定日期區間與星期，一次開出多個場次；票種與座位圖會複製自下方選定的範本場次
            </div>

            <div className="fgrid">
              <div className="fld">
                <label>起始日期</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="fld">
                <label>結束日期</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>

              <div className="fld full">
                <label>星期（不勾選＝區間內每天）</label>
                <div className="perm">
                  {DOW.map((d, i) => (
                    <label key={d}>
                      <input type="checkbox" checked={dows.includes(i)} onChange={() => toggleDow(i)} />
                      {d}
                    </label>
                  ))}
                </div>
              </div>

              <div className="fld full">
                <label>時間（多場以逗號分隔，例：14:00, 19:00）</label>
                <input value={times} onChange={(e) => setTimes(e.target.value)} />
              </div>

              <div className="fld full">
                <label>票種與座位圖範本</label>
                <select value={tpl} onChange={(e) => setTpl(e.target.value)}>
                  {rows.length ? (
                    rows.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.show_date} {r.show_time} · {String(r.venue || "").split(" ·")[0]}（{r.cap} 席）
                      </option>
                    ))
                  ) : (
                    <option value="">（此節目尚無場次）</option>
                  )}
                </select>
              </div>

              <div className="fld full">
                <button className="btn btn-brand btn-sm" style={{ width: "100%" }} onClick={batchAdd} disabled={busy}>
                  {busy ? "處理中…" : "產生場次"}
                </button>
              </div>
            </div>
          </div>

          {err && <div style={{ color: "var(--err)", fontSize: 13, marginBottom: 12 }}>{err}</div>}

          <h3 style={{ fontSize: 15, marginBottom: 10 }}>現有場次（{rows.length}）</h3>
          <div style={{ maxHeight: "42vh", overflow: "auto" }}>
            {rows.length === 0 ? (
              <div className="empty">尚無場次</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>時間</th>
                    <th>場地</th>
                    <th>售出</th>
                    <th>狀態</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.show_date}</td>
                      <td>{r.show_time}</td>
                      <td style={{ color: "var(--muted)" }}>{String(r.venue || "").split(" ·")[0]}</td>
                      <td>{r.sold}/{r.cap}</td>
                      <td><StatusTag s={r.status} /></td>
                      <td>
                        <div className="row-act">
                          <button className="btn btn-danger btn-sm" onClick={() => removeSession(r)} disabled={busy}>
                            刪除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>關閉</button>
        </div>
      </div>
    </>
  );
}
