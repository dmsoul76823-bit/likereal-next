"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getOrder, requestRefund } from "@/lib/supabase";
import { useMember } from "@/components/MemberContext";
import { C } from "@/lib/theme";

function QRCode({ value, size = 180 }) {
  const cells = 21;
  const quiet = 2;
  const grid = cells + quiet * 2;
  const cell = size / grid;

  let seed = 0;
  for (const ch of value) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rand = (r, c) => {
    let x = (seed ^ (r * 73856093) ^ (c * 19349663)) >>> 0;
    x = (x ^ (x >>> 13)) >>> 0;
    x = (x * 1274126177) >>> 0;
    return (x & 7) < 3;
  };

  const isFinder = (r, c) => {
    const inBox = (br, bc) => r >= br && r < br + 7 && c >= bc && c < bc + 7;
    const ring = (br, bc) =>
      inBox(br, bc) &&
      (r === br || r === br + 6 || c === bc || c === bc + 6 ||
        (r >= br + 2 && r <= br + 4 && c >= bc + 2 && c <= bc + 4));
    return ring(0, 0) || ring(0, cells - 7) || ring(cells - 7, 0);
  };
  const inFinderArea = (r, c) => {
    const box = (br, bc) => r >= br && r < br + 8 && c >= bc && c < bc + 8;
    return box(0, 0) || box(0, cells - 8) || box(cells - 8, 0);
  };

  const rects = [];
  for (let r = 0; r < cells; r++) {
    for (let cc = 0; cc < cells; cc++) {
      let on;
      if (inFinderArea(r, cc)) on = isFinder(r, cc);
      else on = rand(r, cc);
      if (on) {
        rects.push(
          <rect
            key={`${r}-${cc}`}
            x={(cc + quiet) * cell}
            y={(r + quiet) * cell}
            width={cell}
            height={cell}
            fill="#0A0E14"
          />
        );
      }
    }
  }

  return (
    <svg width={size} height={size} role="img" aria-label="電子票券 QR Code">
      <rect width={size} height={size} fill="white" />
      {rects}
    </svg>
  );
}

export default function TicketClient({ orderId }) {
  const { member } = useMember() || {};
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRefund, setShowRefund] = useState(false);
  const [reason, setReason] = useState("");
  const [refundDone, setRefundDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getOrder(orderId).then((o) => {
      setOrder(o);
      setLoading(false);
    });
  }, [orderId]);

  async function submitRefund() {
    setBusy(true);
    try {
      await requestRefund(orderId, member?.id, reason);
      setRefundDone(true);
      setShowRefund(false);
    } catch (e) {
      alert("退票申請失敗：" + e.message);
    }
    setBusy(false);
  }

  if (loading)
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}>
        載入票券中…
      </div>
    );

  if (!order)
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <div style={{ fontSize: 15, color: C.text }}>找不到這張票券</div>
        <Link href="/account" style={{ color: C.accent, fontSize: 13 }}>
          回會員中心
        </Link>
      </div>
    );

  const statusMap = {
    paid: ["已付款", C.green],
    pending: ["待付款", C.yellow],
    refunded: ["已退款", C.red],
  };
  const [statusLabel, statusColor] = statusMap[order.status] || statusMap.pending;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "24px 16px 60px" }}>
      <div style={{ maxWidth: 400, margin: "0 auto" }}>
        <Link
          href="/account"
          style={{ fontSize: 13, color: C.sub, display: "inline-block", marginBottom: 16 }}
        >
          ← 回會員中心
        </Link>

        <div
          className="lr-fade-up"
          style={{
            background: "#fff",
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {/* 票根上緣 */}
          <div
            style={{
              background: `linear-gradient(135deg, #0A0E14, ${order.events ? "#0066FF" : "#333"})`,
              padding: "20px 24px",
              color: "#fff",
            }}
          >
            <div style={{ fontSize: 10, letterSpacing: 2, opacity: 0.6, marginBottom: 4 }}>
              LIKE REAL — 電子票券
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {order.events?.title}
            </div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
              {order.events?.date_text} · {order.events?.venue}
            </div>
          </div>

          {/* 撕票虛線 */}
          <div style={{ position: "relative", height: 20, background: "#fff" }}>
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: 0,
                right: 0,
                borderTop: `2px dashed ${C.border}`,
              }}
            />
            <div style={{ position: "absolute", top: "50%", left: -10, width: 20, height: 20, borderRadius: "50%", background: C.bg, transform: "translateY(-50%)" }} />
            <div style={{ position: "absolute", top: "50%", right: -10, width: 20, height: 20, borderRadius: "50%", background: C.bg, transform: "translateY(-50%)" }} />
          </div>

          {/* QR */}
          <div style={{ padding: "8px 24px 24px", textAlign: "center" }}>
            {order.checked_in ? (
              <div style={{ padding: "30px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>✓</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.green }}>
                  已完成入場
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                  {order.checked_in_at && new Date(order.checked_in_at).toLocaleString("zh-TW")}
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "inline-block", padding: 8, background: "#fff", border: `1px solid ${C.borderL}`, borderRadius: 8 }}>
                  <QRCode value={`LIKEREAL|${order.id}`} size={180} />
                </div>
                <div style={{ fontSize: 11, color: C.sub, marginTop: 10, lineHeight: 1.6 }}>
                  入場時出示此 QR Code
                  <br />
                  或使用 NFC 感應
                </div>
              </>
            )}

            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: `1px solid ${C.borderL}`,
                textAlign: "left",
              }}
            >
              {[
                ["訂單編號", order.id],
                ["票種", order.tickets?.label],
                ["座位", Array.isArray(order.seats) ? order.seats.map((s) => `#${s}`).join("、") : "—"],
                ["購票人", order.buyer_name],
                ["金額", `NT$${order.total?.toLocaleString()}`],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: C.muted }}>{k}</span>
                  <span style={{ fontWeight: 500, fontFamily: k === "訂單編號" ? "monospace" : "inherit" }}>
                    {v}
                  </span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                <span style={{ color: C.muted }}>狀態</span>
                <span style={{ color: statusColor, fontWeight: 700 }}>{statusLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 退票 */}
        {!order.checked_in && order.status !== "refunded" && (
          <div style={{ marginTop: 16 }}>
            {refundDone ? (
              <div
                style={{
                  background: "#FFF8E8",
                  border: "1px solid #FFE0A3",
                  borderRadius: 8,
                  padding: "14px 16px",
                  fontSize: 13,
                  color: "#8A5A00",
                }}
              >
                退票申請已送出，客服將於 3 個工作天內處理，結果會以 Email 通知。
              </div>
            ) : showRefund ? (
              <div
                style={{
                  background: "#fff",
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                  申請退票
                </div>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="請簡述退票原因（選填）"
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "9px 11px",
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    fontSize: 13,
                    outline: "none",
                    resize: "vertical",
                    boxSizing: "border-box",
                    marginBottom: 10,
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setShowRefund(false)}
                    style={{
                      flex: 1,
                      padding: 11,
                      border: `1px solid ${C.border}`,
                      background: "#fff",
                      borderRadius: 6,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={submitRefund}
                    disabled={busy}
                    style={{
                      flex: 1,
                      padding: 11,
                      border: "none",
                      background: C.red,
                      color: "#fff",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {busy ? "送出中…" : "確認申請退票"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowRefund(true)}
                style={{
                  width: "100%",
                  padding: 12,
                  background: "none",
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  fontSize: 13,
                  color: C.sub,
                  cursor: "pointer",
                }}
              >
                申請退票
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
