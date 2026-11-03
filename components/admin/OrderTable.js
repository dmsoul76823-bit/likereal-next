"use client";
import { useState } from "react";
import { money } from "@/lib/admin";

function OrderStatus({ s }) {
  const m = { 已付款: "ok", 待付款: "warn", 已退款: "err", expired: "err", cancelled: "err" };
  return <span className={`tag ${m[s] || ""}`}>{s}</span>;
}

export default function OrderTable({ list = [], withDetail = false }) {
  const [open, setOpen] = useState(null);

  if (!list.length) return <div className="empty">沒有符合的訂單</div>;

  return (
    <>
      <table>
        <thead>
          <tr>
            <th>訂單編號</th>
            <th>購票人</th>
            <th>聯絡方式</th>
            <th>品項</th>
            <th>金額</th>
            <th>付款</th>
            <th>狀態</th>
            <th>日期</th>
            {withDetail && <th />}
          </tr>
        </thead>
        <tbody>
          {list.map((o) => (
            <tr key={o.id}>
              <td>
                <code style={{ color: "var(--brand3)" }}>{o.id}</code>
                {o.used && <span className="tag info" style={{ marginLeft: 6 }}>已入場</span>}
              </td>
              <td><b>{o.name}</b></td>
              <td style={{ color: "var(--muted)", fontSize: 12 }}>
                {o.phone}
                <br />
                {o.email}
              </td>
              <td>{o.item}</td>
              <td style={{ color: "var(--brand3)", fontWeight: 700 }}>{money(o.amt)}</td>
              <td style={{ color: "var(--muted)" }}>{o.pay}</td>
              <td><OrderStatus s={o.status} /></td>
              <td style={{ color: "var(--muted)" }}>{o.order_date}</td>
              {withDetail && (
                <td>
                  <div className="row-act">
                    <button className="btn btn-ghost btn-sm" onClick={() => setOpen(o)}>
                      明細
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {open && <OrderDetail order={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function OrderDetail({ order: o, onClose }) {
  const inv = o.invoice || {};
  const invText =
    inv.type === "company"
      ? `公司行號 · 統編 ${inv.tax || ""} · ${inv.title || ""}`
      : inv.type === "donate"
      ? `捐贈 · ${inv.to || ""}`
      : inv.carrier
      ? `個人 · 載具 ${inv.carrier}`
      : "個人電子發票";

  const rows = [
    ["訂單編號", o.id],
    ["購票人", o.name],
    ["電話", o.phone],
    ["Email", o.email],
    ["品項", o.item],
    ["金額", money(o.amt)],
    ["付款方式", o.pay],
    ["狀態", o.status],
    ["訂單日期", o.order_date],
    ["發票", invText],
    ["入場", o.used ? "已入場" : "尚未入場"],
  ];

  return (
    <>
      <div className="mask on" onClick={onClose} />
      <div className="modal on">
        <div className="modal-head">
          <h3>訂單明細 {o.id}</h3>
          <span className="x" onClick={onClose}>✕</span>
        </div>
        <div className="modal-body">
          {rows.map(([k, v]) => (
            <div className="kv" key={k}>
              <span>{k}</span>
              <b>{v || "—"}</b>
            </div>
          ))}
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>關閉</button>
        </div>
      </div>
    </>
  );
}
