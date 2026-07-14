"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { C, getSold } from "@/lib/theme";
import { createOrder } from "@/lib/supabase";

function QRCode({ value, size = 150 }) {
  const cells = 9;
  const cell = size / cells;
  let hash = 0;
  for (const ch of value) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  const grid = Array.from({ length: cells }, (_, r) =>
    Array.from({ length: cells }, (_, c) => {
      if ((r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3)) return true;
      return ((hash ^ (r * 7 + c * 13) ^ (r ^ c)) & 1) === 0;
    })
  );
  return (
    <svg width={size} height={size} role="img" aria-label="票券 QR Code">
      <rect width={size} height={size} fill="white" />
      {grid.map((row, r) =>
        row.map(
          (on, c) =>
            on && (
              <rect
                key={`${r}-${c}`}
                x={c * cell}
                y={r * cell}
                width={cell}
                height={cell}
                fill="#0A0E14"
              />
            )
        )
      )}
    </svg>
  );
}

function SeatGrid({ eventId, ticket, selected, onToggle, maxQty }) {
  const sold = getSold(eventId, ticket.id, ticket.seat_rows, ticket.seat_cols);
  const total = ticket.seat_rows * ticket.seat_cols;
  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div
          style={{
            display: "inline-block",
            background: C.primaryL,
            border: `1px solid ${C.border}`,
            padding: "6px 36px",
            fontSize: 10,
            color: C.sub,
            fontWeight: 600,
            letterSpacing: 3,
          }}
        >
          場域入口
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${ticket.seat_cols},1fr)`,
          gap: 4,
          maxWidth: 400,
          margin: "0 auto 12px",
        }}
      >
        {Array.from({ length: total }, (_, i) => {
          const isSold = sold.has(i);
          const isSel = selected.includes(i);
          const canAdd = selected.length < maxQty;
          return (
            <button
              key={i}
              disabled={isSold || (!isSel && !canAdd)}
              onClick={() => !isSold && onToggle(i)}
              aria-label={`座位 ${i + 1}`}
              style={{
                width: "100%",
                aspectRatio: "1",
                border: "none",
                cursor: isSold || (!isSel && !canAdd) ? "not-allowed" : "pointer",
                background: isSold
                  ? "#E4E8ED"
                  : isSel
                  ? ticket.color
                  : "#0A0E1418",
                opacity: !isSel && !canAdd && !isSold ? 0.4 : 1,
                transform: isSel ? "scale(1.1)" : "none",
                transition: "all 0.1s",
              }}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
        {[
          { bg: "#0A0E1418", label: "可選" },
          { bg: ticket.color, label: "已選" },
          { bg: "#E4E8ED", label: "售出" },
        ].map((l) => (
          <div
            key={l.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              color: C.sub,
            }}
          >
            <div
              style={{
                width: 11,
                height: 11,
                background: l.bg,
                border: `1px solid ${C.border}`,
              }}
            />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BuyClient({ event: ev }) {
  const [step, setStep] = useState(1);
  const [ticketId, setTicketId] = useState(null);
  const [qty, setQty] = useState(1);
  const [seats, setSeats] = useState([]);
  const [agreed, setAgreed] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    invoiceType: "personal",
    taxId: "",
    invoiceTitle: "",
  });
  const [method, setMethod] = useState("credit");
  const [sec, setSec] = useState(600);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [order, setOrder] = useState(null);

  const tickets = ev.tickets || [];
  const ticket = tickets.find((t) => t.id === ticketId);
  const subtotal = ticket ? ticket.price * seats.length : 0;
  const total = subtotal + 30;

  useEffect(() => {
    if (step < 2 || order) return;
    const id = setInterval(() => setSec((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [step, order]);

  const timerStr = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(
    sec % 60
  ).padStart(2, "0")}`;
  const urgent = sec < 120;

  const toggleSeat = (i) =>
    setSeats((p) =>
      p.includes(i)
        ? p.filter((x) => x !== i)
        : p.length < qty
        ? [...p, i]
        : [...p.slice(1), i]
    );

  const submit = async () => {
    setBusy(true);
    setErr("");
    const orderId = `LR-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;
    try {
      await createOrder({
        id: orderId,
        event_id: ev.id,
        ticket_id: ticket.id,
        seats: seats.map((s) => s + 1),
        buyer_name: form.name,
        buyer_phone: form.phone,
        buyer_email: form.email,
        invoice_type: form.invoiceType,
        tax_id: form.taxId || null,
        invoice_title: form.invoiceTitle || null,
        payment_method: method,
        total,
        status: "pending",
      });
      setOrder({ id: orderId });
    } catch (e) {
      setErr("訂單建立失敗，請稍後再試。" + (e.message ? `（${e.message}）` : ""));
    }
    setBusy(false);
  };

  const validForm =
    form.name.trim() && form.phone.trim() && /\S+@\S+\.\S+/.test(form.email);

  if (order)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          padding: "40px 16px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={{ maxWidth: 400, width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: C.primary,
                color: "#fff",
                fontSize: 22,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
              }}
            >
              ✓
            </div>
            <div style={{ fontSize: 20, fontWeight: 300 }}>
              預約成功，{form.name} 您好
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              padding: 24,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: 2,
                color: C.accent,
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              LIKE REAL — 電子票券
            </div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{ev.title}</div>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 16 }}>
              {ticket.label} · 位置 {seats.map((s) => `#${s + 1}`).join("、")}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <QRCode value={`LIKEREAL|${order.id}`} size={150} />
            </div>
            <div
              style={{
                fontSize: 11,
                fontFamily: "monospace",
                color: C.muted,
                letterSpacing: 1,
                marginBottom: 12,
              }}
            >
              {order.id}
            </div>
            <div
              style={{
                background: "#F0F7FF",
                padding: "10px 12px",
                fontSize: 11,
                color: C.sub,
                lineHeight: 1.7,
              }}
            >
              入場時出示此 QR Code 或 NFC 感應
              <br />
              票券已寄送至 {form.email}
            </div>
          </div>

          <Link
            href="/"
            style={{
              display: "block",
              textAlign: "center",
              marginTop: 16,
              background: C.primary,
              color: "#fff",
              padding: "13px",
              borderRadius: 2,
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            返回首頁
          </Link>
        </div>
      </div>
    );

  const STEPS = ["選擇場次", "選擇位置", "填寫資料", "確認預約"];
  const canNext =
    step === 1
      ? ticketId && agreed
      : step === 2
      ? seats.length === qty
      : step === 3
      ? validForm
      : true;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, paddingBottom: 120 }}>
      <div
        style={{
          background: C.surface,
          borderBottom: `1px solid ${C.border}`,
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          height: 52,
        }}
      >
        {step > 1 ? (
          <button
            onClick={() => setStep(step - 1)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              marginRight: 12,
            }}
          >
            ← 上一步
          </button>
        ) : (
          <Link
            href={`/events/${ev.slug}`}
            style={{ fontSize: 12, fontWeight: 600, marginRight: 12 }}
          >
            ← 返回
          </Link>
        )}
        <div style={{ fontSize: 14, fontWeight: 300 }}>{ev.title} — 購票</div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "14px 12px" }}>
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 4,
            padding: "12px 14px",
            marginBottom: 12,
            display: "flex",
          }}
        >
          {STEPS.map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <div
                key={label}
                style={{ display: "flex", alignItems: "center", flex: 1 }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: done || active ? C.primary : "#fff",
                      border: `1.5px solid ${done || active ? C.primary : C.border}`,
                      color: done || active ? "#fff" : C.muted,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {done ? "✓" : n}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: active || done ? C.text : C.muted,
                      fontWeight: active ? 700 : 400,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </div>
                </div>
                {i < 3 && (
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      background: done ? C.primary : C.border,
                      margin: "0 4px",
                      marginBottom: 14,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {step >= 2 && (
          <div
            style={{
              background: urgent ? "#FFF1F0" : "#FFFBEB",
              border: `1px solid ${urgent ? "#FFB3AD" : "#FFE0A3"}`,
              padding: "8px 12px",
              marginBottom: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: urgent ? C.red : C.yellow,
                fontWeight: 600,
              }}
            >
              {urgent ? "請盡快完成！" : "請於時間內完成，逾時位置將釋出"}
            </span>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 16,
                fontWeight: 800,
                color: urgent ? C.red : C.yellow,
              }}
            >
              {timerStr}
            </span>
          </div>
        )}

        {step === 1 && (
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "11px 14px",
                borderBottom: `1px solid ${C.border}`,
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              選擇場次與數量
            </div>
            {tickets.map((t, i) => {
              const sold = getSold(ev.id, t.id, t.seat_rows, t.seat_cols);
              const rem = t.seat_rows * t.seat_cols - sold.size;
              const sel = ticketId === t.id;
              return (
                <div key={t.id}>
                  <div
                    onClick={() => {
                      setTicketId(t.id);
                      setSeats([]);
                    }}
                    style={{
                      padding: "14px",
                      cursor: "pointer",
                      background: sel ? C.accentL : "transparent",
                      borderLeft: `2px solid ${sel ? C.accent : "transparent"}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          {t.label}
                        </div>
                        <div style={{ fontSize: 12, color: C.sub }}>
                          {t.description}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>
                          NT${t.price.toLocaleString()}
                        </div>
                        <div style={{ fontSize: 11, color: C.muted }}>
                          剩 {rem}
                        </div>
                      </div>
                    </div>
                    {sel && (
                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span style={{ fontSize: 12, color: C.sub }}>數量：</span>
                        {Array.from({ length: t.max_per_order }, (_, k) => k + 1).map(
                          (n) => (
                            <button
                              key={n}
                              onClick={(e) => {
                                e.stopPropagation();
                                setQty(n);
                                setSeats([]);
                              }}
                              style={{
                                width: 30,
                                height: 30,
                                border: `1.5px solid ${
                                  qty === n ? C.primary : C.border
                                }`,
                                background: qty === n ? C.primary : "#fff",
                                color: qty === n ? "#fff" : C.sub,
                                fontWeight: 700,
                                fontSize: 12,
                                cursor: "pointer",
                              }}
                            >
                              {n}
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                  {i < tickets.length - 1 && (
                    <div style={{ height: 1, background: C.borderL }} />
                  )}
                </div>
              );
            })}
            <label
              style={{
                display: "flex",
                gap: 8,
                padding: "12px 14px",
                borderTop: `1px solid ${C.border}`,
                background: C.primaryL,
                cursor: "pointer",
                fontSize: 12,
                color: C.sub,
              }}
            >
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                style={{ accentColor: C.primary }}
              />
              <span>我已閱讀並同意場域規範、隱私權政策與退票規則。</span>
            </label>
          </div>
        )}

        {step === 2 && ticket && (
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              padding: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13 }}>選擇位置</div>
              <div style={{ fontSize: 12, color: C.sub }}>
                {ticket.label} · {seats.length}/{qty}
              </div>
            </div>
            <SeatGrid
              eventId={ev.id}
              ticket={ticket}
              selected={seats}
              onToggle={toggleSeat}
              maxQty={qty}
            />
          </div>
        )}

        {step === 3 && (
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              padding: 16,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>
              購票人資料
            </div>
            {[
              { k: "name", label: "姓名", ph: "王小明" },
              { k: "phone", label: "手機號碼", ph: "09XXXXXXXX" },
              { k: "email", label: "Email", ph: "example@email.com" },
            ].map((f) => (
              <div key={f.k} style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.sub,
                    marginBottom: 4,
                  }}
                >
                  {f.label} <span style={{ color: C.red }}>*</span>
                </div>
                <input
                  value={form[f.k]}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, [f.k]: e.target.value }))
                  }
                  placeholder={f.ph}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: `1px solid ${C.border}`,
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>
            ))}

            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: C.sub,
                  marginBottom: 6,
                }}
              >
                發票資訊
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[
                  { id: "personal", label: "個人電子發票" },
                  { id: "company", label: "公司行號" },
                  { id: "donate", label: "捐贈發票" },
                ].map((v) => (
                  <label
                    key={v.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    <input
                      type="radio"
                      name="invoice"
                      checked={form.invoiceType === v.id}
                      onChange={() =>
                        setForm((p) => ({ ...p, invoiceType: v.id }))
                      }
                      style={{ accentColor: C.primary }}
                    />
                    {v.label}
                  </label>
                ))}
              </div>
              {form.invoiceType === "company" && (
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <input
                    value={form.taxId}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, taxId: e.target.value }))
                    }
                    placeholder="統一編號"
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      border: `1px solid ${C.border}`,
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                  <input
                    value={form.invoiceTitle}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, invoiceTitle: e.target.value }))
                    }
                    placeholder="發票抬頭"
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      border: `1px solid ${C.border}`,
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                </div>
              )}
            </div>

            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: C.sub,
                  marginBottom: 6,
                }}
              >
                付款方式
              </div>
              {[
                { id: "credit", label: "信用卡" },
                { id: "atm", label: "ATM 轉帳" },
                { id: "cvs", label: "超商繳費" },
              ].map((m) => (
                <label
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 12px",
                    border: `1.5px solid ${
                      method === m.id ? C.primary : C.border
                    }`,
                    background: method === m.id ? C.primaryL : "#fff",
                    marginBottom: 6,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  <input
                    type="radio"
                    name="method"
                    checked={method === m.id}
                    onChange={() => setMethod(m.id)}
                    style={{ accentColor: C.primary }}
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 4 && ticket && (
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "11px 14px",
                borderBottom: `1px solid ${C.border}`,
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              確認訂單
            </div>
            {[
              ["場域", ev.title],
              ["時間", `${ev.date_text} ${ev.time_text || ""}`],
              ["地點", ev.venue],
              ["場次", ticket.label],
              ["位置", seats.map((s) => `#${s + 1}`).join("、")],
              ["姓名", form.name],
              ["Email", form.email],
              ["手機", form.phone],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{
                  padding: "10px 14px",
                  borderBottom: `1px solid ${C.borderL}`,
                  display: "flex",
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 11, color: C.muted, width: 50 }}>{k}</div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{v}</div>
              </div>
            ))}
            <div
              style={{
                padding: "10px 14px",
                borderBottom: `1px solid ${C.borderL}`,
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
              }}
            >
              <span style={{ color: C.muted }}>票價 × {seats.length}</span>
              <span>NT${subtotal.toLocaleString()}</span>
            </div>
            <div
              style={{
                padding: "10px 14px",
                borderBottom: `1px solid ${C.borderL}`,
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
              }}
            >
              <span style={{ color: C.muted }}>手續費</span>
              <span>NT$30</span>
            </div>
            <div
              style={{
                padding: "12px 14px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 13 }}>總計</span>
              <span style={{ fontWeight: 800, fontSize: 18 }}>
                NT${total.toLocaleString()}
              </span>
            </div>
            {err && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "#FFF1F0",
                  color: C.red,
                  fontSize: 12,
                }}
              >
                {err}
              </div>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "rgba(255,255,255,0.97)",
          borderTop: `1px solid ${C.border}`,
          padding: "12px 16px 16px",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {ticket && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
                fontSize: 12,
              }}
            >
              <span style={{ color: C.sub }}>
                {ticket.label}
                {step >= 2 && seats.length > 0 ? ` × ${seats.length}` : ""}
              </span>
              <span style={{ fontWeight: 800, fontSize: 14 }}>
                NT$
                {(step >= 2
                  ? total
                  : ticket.price * qty + 30
                ).toLocaleString()}
              </span>
            </div>
          )}
          <button
            disabled={!canNext || busy}
            onClick={() => (step < 4 ? setStep(step + 1) : submit())}
            style={{
              width: "100%",
              padding: "14px",
              border: "none",
              background: canNext && !busy ? C.primary : C.border,
              color: canNext && !busy ? "#fff" : C.muted,
              cursor: canNext && !busy ? "pointer" : "not-allowed",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {busy
              ? "處理中..."
              : step === 1
              ? "下一步：選擇位置"
              : step === 2
              ? `下一步（${seats.length}/${qty}）`
              : step === 3
              ? "下一步：確認訂單"
              : "確認預約"}
          </button>
        </div>
      </div>
    </div>
  );
}
