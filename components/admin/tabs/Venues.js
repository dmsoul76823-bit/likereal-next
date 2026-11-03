"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { normStage } from "@/lib/wv-seats";
import { venueSeatCount } from "@/lib/admin-seats";
import VenueEditor from "../VenueEditor";

const SHAPE_LABEL = { rect: "矩形", round: "圓角", ellipse: "橢圓", arc: "弧形", trap: "梯形" };

function toVenue(v) {
  return {
    id: v.id,
    name: v.name || "",
    rows: Number(v.n_rows) || 0,
    cols: Number(v.n_cols) || 0,
    stage: v.stage || null,
    off: Array.isArray(v.off_seats) ? v.off_seats : [],
    boxes: Array.isArray(v.boxes) ? v.boxes : [],
  };
}

export default function Venues({ flash }) {
  const [rows, setRows] = useState(null);
  const [usage, setUsage] = useState({});
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const [{ data, error }, ev] = await Promise.all([
        supabase.from("venues").select("*").order("id"),
        supabase.from("events").select("venue_id,name"),
      ]);
      if (error) throw error;
      setRows((data || []).map(toVenue));

      // 每個場地被幾「檔節目」使用（依名稱去重，不是場次數）
      const m = {};
      (ev.data || []).forEach((e) => {
        if (e.venue_id == null) return;
        (m[e.venue_id] = m[e.venue_id] || new Set()).add(e.name);
      });
      setUsage(Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.size])));
    } catch (e) {
      setErr(e?.message || String(e));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function duplicate(v) {
    const { id, ...rest } = v;
    const { error } = await supabase.from("venues").insert({
      name: v.name + "（複製）",
      n_rows: v.rows,
      n_cols: v.cols,
      off_seats: v.off,
      boxes: v.boxes,
      stage: v.stage,
    });
    if (error) return setErr("複製失敗：" + error.message);
    flash?.("已複製場地");
    load();
  }

  async function remove(v) {
    const used = usage[v.id] || 0;
    if (used) {
      return setErr(`「${v.name}」還有 ${used} 檔節目在使用，不能刪除。請先把那些節目換到別的場地。`);
    }
    if (!window.confirm(`確定刪除場地「${v.name}」？`)) return;
    const { error } = await supabase.from("venues").delete().eq("id", v.id);
    if (error) return setErr("刪除失敗：" + error.message);
    flash?.("已刪除場地");
    load();
  }

  if (err && !rows) return <div className="panel"><h3>讀取失敗</h3><div className="hint">{err}</div></div>;
  if (!rows) return <div className="panel"><div className="hint">載入中…</div></div>;

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>場地管理</h3>
            <div className="hint" style={{ margin: 0 }}>
              先建好座位圖範本，賣票時直接套用；可框選設定走道、包廂與舞台位置
            </div>
          </div>
          <div className="tools">
            <button
              className="btn btn-brand btn-sm"
              onClick={() => setEdit({ name: "", rows: 12, cols: 20, stage: null, off: [], boxes: [] })}
            >
              ＋ 新增場地
            </button>
          </div>
        </div>

        {err && <div style={{ color: "var(--err)", fontSize: 13, marginBottom: 10 }}>{err}</div>}

        {rows.length === 0 ? (
          <div className="empty">尚無場地，請先新增</div>
        ) : (
          <table>
            <thead>
              <tr><th>場地名稱</th><th>格局</th><th>座位數</th><th>包廂</th><th>舞台形狀</th><th>使用中節目</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id}>
                  <td><b>{v.name}</b></td>
                  <td>{v.rows} 排 × {v.cols} 席</td>
                  <td style={{ color: "var(--brand3)", fontWeight: 700 }}>{venueSeatCount(v)}</td>
                  <td>
                    {v.boxes.length
                      ? v.boxes.map((b, i) => (
                          <span className="tag warn" key={i} style={{ marginRight: 4 }}>
                            {b.name} · {b.seats.length}席
                          </span>
                        ))
                      : "—"}
                  </td>
                  <td>{SHAPE_LABEL[normStage(v).shape] || "圓角"}</td>
                  <td style={{ color: "var(--muted)" }}>{usage[v.id] || 0} 檔</td>
                  <td>
                    <div className="row-act">
                      <button className="btn btn-ghost btn-sm" onClick={() => setEdit(v)}>編輯</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => duplicate(v)}>複製</button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(v)}>刪除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="spec" style={{ marginTop: 14 }}>
          <b>⚠ 改座位圖要小心</b>如果這個場地已經有節目在賣票，改動排數、席數或走道，
          可能讓已售出的座位編號對不上。有在用的場地建議先「複製」一份再改。
        </div>
      </div>

      {edit && (
        <VenueEditor
          venue={edit}
          flash={flash}
          onClose={() => setEdit(null)}
          onSaved={async () => { setEdit(null); await load(); }}
        />
      )}
    </>
  );
}
