"use client";
import Link from "next/link";
import Qr from "./Qr";

export default function TicketResult({ result, onClose }) {
  const passes = result?.passes || [];
  const amount = Number(result?.amount) || 0;

  return (
    <>
      <div className="smask on" onClick={onClose} />
      <div className="smodal on" style={{ width: 640 }}>
        <div className="sm-head">
          <div>
            <h3 className="serif">購票完成</h3>
            <p>
              訂單 {result?.order_id} · 合計 NT${amount.toLocaleString()}
            </p>
          </div>
          <span className="x" onClick={onClose}>
            ✕
          </span>
        </div>

        <div className="sm-body">
          <div className="ord-head">
            <div className="n">訂單編號</div>
            <div className="v">{result?.order_id}</div>
            <div className="n" style={{ marginTop: 6 }}>
              {result?.event || ""} · {passes.length} 張票 · NT${amount.toLocaleString()}
            </div>
          </div>

          {passes.map((p) => (
            <div className="tk" key={p.code}>
              <div className="qr">
                <Qr value={p.code} />
              </div>
              <div className="info">
                <div className="ev">{result?.event || ""}</div>
                <div className="zone">{p.ticket || ""}</div>
                <div className="seatno">{p.seat_label || ""}</div>
                <div className="code">{p.code}</div>
                <div className="meta">
                  NT${(Number(p.price) || 0).toLocaleString()} · 請於入場時出示此 QR Code
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="sm-foot">
          <div className="picked">
            請於入場時出示 QR Code，或日後到{" "}
            <Link href="/mypass" style={{ color: "var(--brand3)" }}>
              我的票券
            </Link>{" "}
            用 Email 與手機查詢
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost" onClick={() => window.print()}>
              列印 / 存成 PDF
            </button>
            <button className="btn btn-brand" onClick={onClose}>
              完成
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
