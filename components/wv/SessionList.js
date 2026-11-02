"use client";
import { useState } from "react";
import { parseDate } from "@/lib/wv";

const MAXSHOW = 8;
// 購票流程尚未搬到新站，先導回現行售票站
const BUY_URL = "https://lireal.vercel.app/ticket";

export default function SessionList({ sessions }) {
  const [showAll, setShowAll] = useState(false);

  if (!sessions?.length) {
    return (
      <div style={{ color: "var(--muted)", fontSize: 14, padding: "18px 0" }}>
        目前沒有開放中的場次，請稍後再回來看看。
      </div>
    );
  }

  const items = showAll ? sessions : sessions.slice(0, MAXSHOW);

  return (
    <div>
      {items.map((s) => {
        const d = parseDate(s.date);
        const full = s.cap > 0 && s.left <= 0;
        return (
          <div key={s.id} className={`sess-row${full ? " full" : ""}`}>
            <div className="sess-d">
              <b>{d ? d.d : "—"}</b>
              <span>{d ? `${d.m}月` : ""}</span>
            </div>

            <div className="sess-m">
              <div className="t">
                {d ? `週${d.weekday} ` : ""}
                {s.time || "時間未定"}
              </div>
              <div className="v">📍 {s.venue || "Wonder V 沉浸式場域"}</div>
              <div
                className="left"
                style={{ color: full ? "var(--rose)" : "var(--muted)" }}
              >
                {full ? "售罄" : s.cap > 0 ? `剩餘 ${s.left} 席` : s.status || "開放中"}
              </div>
            </div>

            <div className="sess-a">
              <div className="p">
                {s.price > 0 ? (
                  <>
                    NT${s.price.toLocaleString()}
                    <small> 起</small>
                  </>
                ) : (
                  <small style={{ fontSize: 13 }}>{s.status || "未開賣"}</small>
                )}
              </div>
              {full ? (
                <button className="add" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>
                  已售罄
                </button>
              ) : (
                <a className="add" href={BUY_URL} target="_blank" rel="noopener noreferrer">
                  選位購票
                </a>
              )}
            </div>
          </div>
        );
      })}

      {!showAll && sessions.length > MAXSHOW && (
        <button
          type="button"
          className="btn btn-ghost sess-more"
          onClick={() => setShowAll(true)}
        >
          顯示全部 {sessions.length} 個場次
        </button>
      )}
    </div>
  );
}
