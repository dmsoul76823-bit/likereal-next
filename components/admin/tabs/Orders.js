"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import OrderTable from "../OrderTable";

const STATUSES = ["", "已付款", "待付款", "已退款"];

export default function Orders() {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (!alive) return;
      if (error) setErr(error.message);
      else setRows(data || []);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return (rows || []).filter((o) => {
      if (status && o.status !== status) return false;
      if (!k) return true;
      return (
        String(o.id || "").toLowerCase().includes(k) ||
        String(o.name || "").includes(q.trim()) ||
        String(o.phone || "").includes(q.trim()) ||
        String(o.email || "").toLowerCase().includes(k)
      );
    });
  }, [rows, q, status]);

  if (err) return <div className="panel"><h3>讀取失敗</h3><div className="hint">{err}</div></div>;
  if (!rows) return <div className="panel"><div className="hint">載入中…</div></div>;

  return (
    <div className="panel">
      <h3>訂單查詢</h3>
      <div className="hint">最近 500 筆。可用訂單編號、姓名、電話或 Email 搜尋。</div>

      <div className="filters" style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "14px 0 18px" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜尋訂單編號 / 姓名 / 電話 / Email"
          style={{
            flex: 1, minWidth: 220, background: "var(--bg2)",
            border: "1px solid var(--line2)", borderRadius: 11,
            padding: "10px 14px", color: "var(--text)", fontSize: 14, outline: "none",
          }}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{
            background: "var(--bg2)", border: "1px solid var(--line2)",
            borderRadius: 11, padding: "10px 14px", color: "var(--text)", fontSize: 14,
          }}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s || "全部狀態"}</option>
          ))}
        </select>
      </div>

      <div className="hint" style={{ marginBottom: 10 }}>
        共 {list.length.toLocaleString()} 筆
      </div>

      <OrderTable list={list} withDetail />
    </div>
  );
}
