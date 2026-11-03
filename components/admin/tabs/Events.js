"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ProgramEditor from "../ProgramEditor";
import SessionManager from "../SessionManager";

/** 把場次依節目名稱收合 */
function groupPrograms(evlite, art) {
  const m = new Map();
  evlite.forEach((e) => {
    const k = e.name;
    if (!m.has(k)) {
      m.set(k, { name: k, cat: e.cat, count: 0, sold: 0, cap: 0, dates: [], venues: new Set() });
    }
    const g = m.get(k);
    g.count++;
    g.sold += Number(e.sold) || 0;
    g.cap += Number(e.cap) || 0;
    g.dates.push(e.show_date);
    g.venues.add(String(e.venue || "").split(" ·")[0]);
  });

  return [...m.values()]
    .map((g) => {
      g.dates.sort();
      g.first = g.dates[0];
      g.last = g.dates[g.dates.length - 1];
      g.art = (art.find((p) => p.name === g.name) || {}).img || "";
      return g;
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** events 超過 1000 筆，要分頁撈 */
async function fetchEvLite() {
  const PAGE = 1000;
  const out = [];
  for (let from = 0; from < 20000; from += PAGE) {
    const { data, error } = await supabase
      .from("events")
      .select("id,name,cat,venue,venue_id,show_date,show_time,sold,cap,status")
      .order("show_date", { ascending: true })
      .order("show_time", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

export default function Events({ flash }) {
  const [evlite, setEvlite] = useState(null);
  const [art, setArt] = useState([]);
  const [venues, setVenues] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(null);
  const [sessions, setSessions] = useState(null);

  const load = useCallback(async () => {
    try {
      const [ev, pa, vn] = await Promise.all([
        fetchEvLite(),
        supabase.from("program_art").select("*").order("name"),
        supabase.from("venues").select("*").order("id"),
      ]);
      setEvlite(ev);
      setArt(pa.data || []);
      setVenues(
        (vn.data || []).map((v) => ({
          id: v.id,
          name: v.name || "",
          rows: Number(v.n_rows) || 0,
          cols: Number(v.n_cols) || 0,
          stage: v.stage || null,
          off: Array.isArray(v.off_seats) ? v.off_seats : [],
          boxes: Array.isArray(v.boxes) ? v.boxes : [],
        }))
      );
    } catch (e) {
      setErr(e?.message || String(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const list = useMemo(() => {
    if (!evlite) return [];
    const all = groupPrograms(evlite, art);
    const k = q.trim().toLowerCase();
    return k ? all.filter((g) => g.name.toLowerCase().includes(k)) : all;
  }, [evlite, art, q]);

  if (err) return <div className="panel"><h3>讀取失敗</h3><div className="hint">{err}</div></div>;
  if (!evlite) return <div className="panel"><div className="hint">載入中…（場次有上千筆，請稍候）</div></div>;

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>節目管理</h3>
            <div className="hint" style={{ margin: 0 }}>
              一檔節目可開多個場次 — 點「場次」批次新增日期時間，點「編輯節目」修改會套用到全部場次
            </div>
          </div>
          <div className="tools">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋節目名稱…" />
          </div>
        </div>

        <div className="hint" style={{ marginBottom: 10 }}>
          共 {list.length} 檔節目、{evlite.length.toLocaleString()} 個場次
        </div>

        {list.length === 0 ? (
          <div className="empty">沒有符合的節目</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>主視覺</th>
                <th>節目名稱</th>
                <th>類型</th>
                <th>場地</th>
                <th>場次數</th>
                <th>期間</th>
                <th>售出</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((g) => (
                <tr key={g.name}>
                  <td>
                    <div
                      className="thumb-sm"
                      style={{
                        width: 64, height: 40, borderRadius: 7,
                        backgroundImage: g.art ? `url("${g.art}")` : undefined,
                        backgroundSize: "cover", backgroundPosition: "center",
                      }}
                    >
                      {!g.art && (
                        <span style={{ fontSize: 10, color: "var(--muted)", display: "grid", placeItems: "center", height: "100%" }}>
                          無圖
                        </span>
                      )}
                    </div>
                  </td>
                  <td><b>{g.name}</b></td>
                  <td><span className="tag b">{g.cat || ""}</span></td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{[...g.venues].join("、")}</td>
                  <td><b style={{ color: "var(--brand3)" }}>{g.count}</b> 場</td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>
                    {g.first}
                    <br />~ {g.last}
                  </td>
                  <td>{g.sold}/{g.cap}</td>
                  <td>
                    <div className="row-act">
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(g)}>
                        編輯節目
                      </button>
                      <button className="btn btn-brand btn-sm" onClick={() => setSessions(g)}>
                        場次 ({g.count})
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <ProgramEditor
          group={editing}
          art={art.find((p) => p.name === editing.name) || {}}
          venues={venues}
          evlite={evlite}
          flash={flash}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}

      {sessions && (
        <SessionManager
          group={sessions}
          evlite={evlite}
          flash={flash}
          onClose={() => setSessions(null)}
          onChanged={load}
        />
      )}
    </>
  );
}
