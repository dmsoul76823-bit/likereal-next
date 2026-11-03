"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { money, tpeTime } from "@/lib/admin";
import OrderTable from "../OrderTable";

/**
 * events 有 1154 筆，Supabase 單次查詢上限 1000 筆，
 * 直接 select 會少算約 150 場的席次。分頁撈完整。
 */
async function fetchAllSoldCap() {
  const PAGE = 1000;
  const out = [];
  for (let from = 0; from < 20000; from += PAGE) {
    const { data, error } = await supabase
      .from("events")
      .select("sold,cap")
      .range(from, from + PAGE - 1);
    if (error || !data?.length) break;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());

        const [orders, members, recent, upcoming, evAgg] = await Promise.all([
          // 只要統計，用 count 不把整張表拉下來
          supabase.from("orders").select("amt,status", { count: "exact" }),
          supabase.from("members").select("id", { count: "exact", head: true }),
          supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(5),
          supabase
            .from("events")
            .select("id,name,venue,show_date,show_time,sold,cap,status")
            .gte("show_date", today)
            .order("show_date", { ascending: true })
            .order("show_time", { ascending: true })
            .limit(12),
          fetchAllSoldCap(),
        ]);

        if (!alive) return;

        const os = orders.data || [];
        const rev = os.filter((o) => o.status === "已付款").reduce((s, o) => s + (Number(o.amt) || 0), 0);
        const evs = evAgg;
        const sold = evs.reduce((s, e) => s + (Number(e.sold) || 0), 0);
        const cap = evs.reduce((s, e) => s + (Number(e.cap) || 0), 0);

        setD({
          rev,
          orderCount: orders.count ?? os.length,
          memberCount: members.count ?? 0,
          sold,
          cap,
          recent: recent.data || [],
          upcoming: upcoming.data || [],
        });
      } catch (e) {
        if (alive) setErr(e?.message || String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (err) return <div className="panel"><h3>讀取失敗</h3><div className="hint">{err}</div></div>;
  if (!d) return <div className="panel"><div className="hint">載入中…</div></div>;

  const stats = [
    ["總營收", money(d.rev), "已付款訂單"],
    ["訂單數", d.orderCount.toLocaleString(), "含待付款"],
    ["售出票券", d.sold.toLocaleString(), `共 ${d.cap.toLocaleString()} 席`],
    ["會員數", d.memberCount.toLocaleString(), "註冊會員"],
  ];

  return (
    <>
      <div className="stat-grid">
        {stats.map(([l, v, c]) => (
          <div className="stat" key={l}>
            <div className="l">{l}</div>
            <div className="v">{v}</div>
            <div className="c">{c}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <h3>近期場次售票概況</h3>
        <div className="hint">今天之後最接近的 12 場</div>
        {d.upcoming.length === 0 ? (
          <div className="empty">沒有即將到來的場次</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>節目</th>
                <th>場地</th>
                <th>日期</th>
                <th>售出 / 總席</th>
                <th style={{ width: 180 }}>進度</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              {d.upcoming.map((e) => {
                const cap = Number(e.cap) || 0;
                const pc = cap ? Math.round(((Number(e.sold) || 0) / cap) * 100) : 0;
                return (
                  <tr key={e.id}>
                    <td><b>{e.name}</b></td>
                    <td style={{ color: "var(--muted)" }}>{e.venue}</td>
                    <td>
                      {e.show_date}
                      <span style={{ color: "var(--muted)" }}> {String(e.show_time || "").slice(0, 5)}</span>
                    </td>
                    <td>{e.sold} / {cap}</td>
                    <td>
                      <div className="bar"><i style={{ width: `${pc}%` }} /></div>
                      <small style={{ color: "var(--muted)" }}>{pc}%</small>
                    </td>
                    <td><StatusTag s={e.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h3>最近訂單</h3>
        <div className="hint">最新 5 筆</div>
        <OrderTable list={d.recent} />
      </div>
    </>
  );
}

function StatusTag({ s }) {
  const m = { 售票中: "ok", 即將售罄: "warn", 已售罄: "err", 未開賣: "info" };
  return <span className={`tag ${m[s] || ""}`}>{s}</span>;
}
