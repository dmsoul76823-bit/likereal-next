"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { parseDate } from "@/lib/wv";
import FavHeart from "./FavHeart";

const PAGE = 24;

export default function TicketGrid({ sessions = [] }) {
  const [shown, setShown] = useState(PAGE);
  const [month, setMonth] = useState("");

  const months = useMemo(() => {
    const s = new Set(sessions.map((x) => String(x.date || "").slice(0, 7)).filter(Boolean));
    return [...s].sort();
  }, [sessions]);

  const list = useMemo(
    () => (month ? sessions.filter((s) => String(s.date).startsWith(month)) : sessions),
    [sessions, month]
  );

  const visible = list.slice(0, shown);

  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "0 0 22px" }}>
        <button
          className={`btn btn-sm ${month === "" ? "btn-brand" : "btn-ghost"}`}
          onClick={() => { setMonth(""); setShown(PAGE); }}
        >
          全部（{sessions.length}）
        </button>
        {months.map((m) => {
          const [y, mm] = m.split("-");
          const n = sessions.filter((s) => String(s.date).startsWith(m)).length;
          return (
            <button
              key={m}
              className={`btn btn-sm ${month === m ? "btn-brand" : "btn-ghost"}`}
              onClick={() => { setMonth(m); setShown(PAGE); }}
            >
              {y}/{Number(mm)}月（{n}）
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div style={{ color: "var(--muted)", padding: "40px 0", textAlign: "center" }}>
          這個月份沒有開放中的場次。
        </div>
      ) : (
        <div className="grid g3">
          {visible.map((s) => {
            const d = parseDate(s.date);
            const full = s.cap > 0 && s.left <= 0;
            return (
              <Link key={s.id} href={`/programs/${s.slug}`} className="ticket" style={{ cursor: "pointer" }}>
                <div className="tpic" style={{ backgroundImage: `url("${s.img}")` }}>
                  {d && (
                    <div className="tdate-badge">
                      <b>{d.d}</b>
                      <span>{d.m}月</span>
                    </div>
                  )}
                  <FavHeart
                    k={`tk:${s.id}`}
                    name={s.name}
                    sub={`${d ? `${d.m}/${d.d} ` : ""}${s.time || ""}${
                      s.price > 0 ? ` · NT$${s.price.toLocaleString()}` : ""
                    }`}
                    img={s.img}
                    go={`/programs/${s.slug}`}
                  />
                  {s.isLive && <span className="live-tag sm">● LIVE</span>}
                </div>
                <div className="tbody">
                  <div className="tinfo">
                    <h4>{s.name}</h4>
                    <div className="meta">
                      {d ? `週${d.weekday} ` : ""}
                      {s.time} 開演{s.cat ? ` · ${s.cat}` : ""}
                    </div>
                    <div className="venue">📍 {s.venue || "Wonder V 沉浸式場域"}</div>
                  </div>
                  <div className="tbuy">
                    <div className="tp">
                      <div className="p">
                        {s.price > 0 ? `NT$${s.price.toLocaleString()}` : "—"}
                        <small>起</small>
                      </div>
                      <div className="left" style={full ? { color: "var(--rose)" } : undefined}>
                        {full ? "售罄候補" : `剩 ${s.left} 席`}
                      </div>
                    </div>
                    <span className="add buy-now">查看節目 →</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {shown < list.length && (
        <div style={{ textAlign: "center", marginTop: 28 }}>
          <button className="btn btn-ghost" onClick={() => setShown((n) => n + PAGE)}>
            顯示更多（還有 {list.length - shown} 場）
          </button>
        </div>
      )}
    </>
  );
}
