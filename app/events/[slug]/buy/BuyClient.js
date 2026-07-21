"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { C } from "@/lib/theme";
import {
  createOrder,
  supabase,
  getSeats,
  reserveSeats,
  calcCommission,
  validateCoupon,
  redeemCoupon,
} from "@/lib/supabase";
import { track } from "@/components/Tracking";
import { getRef, getRefCoupon } from "@/components/RefCapture";
import { useMember } from "@/components/MemberContext";

function QRCode({ value, size = 160 }) {
  const cells = 21;
  const quiet = 2;
  const grid = cells + quiet * 2;
  const cell = size / grid;

  // 由 value 產生穩定亂數
  let seed = 0;
  for (const ch of value) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rand = (r, c) => {
    let x = (seed ^ (r * 73856093) ^ (c * 19349663)) >>> 0;
    x = (x ^ (x >>> 13)) >>> 0;
    x = (x * 1274126177) >>> 0;
    return (x & 7) < 3; // 約 37% 填黑
  };

  const isFinder = (r, c) => {
    const inBox = (br, bc) =>
      r >= br && r < br + 7 && c >= bc && c < bc + 7;
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
    <svg width={size} height={size} role="img" aria-label="票券 QR Code">
      <rect width={size} height={size} fill="white" />
      {rects}
    </svg>
  );
}

function SeatGrid({ ticket, selected, onToggle, maxQty, soldSet }) {
  const sold = soldSet || new Set();
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
          const seatNo = i + 1;
          const isSold = sold.has(seatNo);
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
  const { member, refreshMember } = useMember() || {};
  const [step, setStep] = useState(1);
  const [usePoints, setUsePoints] = useState(0);
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
  const [soldSet, setSoldSet] = useState(new Set());
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState(null);      // 驗證通過的券
  const [couponMsg, setCouponMsg] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);

  // 登入狀態自動帶入會員資料
  useEffect(() => {
    if (member) {
      setForm((p) => ({
        ...p,
        name: p.name || member.name || "",
        phone: p.phone || member.phone || "",
        email: p.email || member.email || "",
      }));
    }
  }, [member]);

  // 只顯示未隱藏且在銷售期間內的票種
  const now = Date.now();
  const tickets = (ev.tickets || []).filter((t) => {
    if (t.is_hidden) return false;
    if (t.sale_start && new Date(t.sale_start).getTime() > now) return false;
    if (t.sale_end && new Date(t.sale_end).getTime() < now) return false;
    return true;
  });
  const ticket = tickets.find((t) => t.id === ticketId);

  // 進入購票流程：發送 InitiateCheckout
  useEffect(() => {
    track("InitiateCheckout", {
      content_name: ev.title,
      content_ids: [ev.slug],
      content_type: "product",
      currency: "TWD",
    });
  }, []);

  // 選定票種後載入真實座位庫存
  useEffect(() => {
    if (!ticketId) return;
    getSeats(ticketId).then((rows) => {
      setSoldSet(new Set(rows.filter((s) => s.status !== "available").map((s) => s.seat_no)));
    });
  }, [ticketId]);
  const subtotal = ticket ? ticket.price * seats.length : 0;
  const fee = 30;
  // 折扣券先扣
  const discount = coupon?.ok ? Math.min(coupon.discount, subtotal) : 0;
  const afterCoupon = subtotal - discount;
  // 點數折抵上限：依會員等級 %（以折扣後票價為基準）
  const redeemCap = member?.member_tiers?.redeem_cap ?? 30;
  const maxRedeem = Math.min(
    member?.points ?? 0,
    Math.floor(afterCoupon * (redeemCap / 100))
  );
  const pointsUsed = member ? Math.min(usePoints, maxRedeem) : 0;
  const total = afterCoupon - pointsUsed + fee;

  useEffect(() => {
    if (step < 2 || order) return;
    const id = setInterval(() => setSec((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [step, order]);

  const timerStr = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(
    sec % 60
  ).padStart(2, "0")}`;
  const urgent = sec < 120;

  // 套用折扣碼
  async function applyCoupon(codeArg) {
    const code = (codeArg ?? couponCode).trim();
    if (!code) return;
    setCouponBusy(true);
    setCouponMsg("");
    const res = await validateCoupon({
      code,
      eventId: ev.id,
      subtotal,
      memberId: member?.id,
      email: form.email,
    });
    setCouponBusy(false);

    if (res?.ok) {
      setCoupon(res);
      setCouponCode(res.code);
      setUsePoints(0); // 折扣改變後重算點數上限
      setCouponMsg("");
    } else {
      setCoupon(null);
      const MSG = {
        not_found: "找不到這組折扣碼",
        wrong_event: "此折扣碼不適用於這個活動",
        not_started: "此折扣碼尚未開始適用",
        expired: "此折扣碼已過期",
        used_up: "此折扣碼已達使用上限",
        per_user_limit: "您已使用過這組折扣碼",
        min_amount: `此折扣碼需消費滿 NT$${res?.min_amount || 0}`,
      };
      setCouponMsg(MSG[res?.reason] || "折扣碼無效");
    }
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponCode("");
    setCouponMsg("");
    setUsePoints(0);
  }

  // 從推廣連結進來：自動帶入夥伴的折扣碼
  useEffect(() => {
    const rc = getRefCoupon();
    if (rc && !coupon && subtotal > 0) {
      setCouponCode(rc);
      applyCoupon(rc);
    }
  }, [subtotal]);

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
    const seatNos = seats.map((s) => s + 1);

    // 分潤：優先採用折扣碼綁定的夥伴，其次採用推薦連結
    const refCode = getRef();
    let commission = { ok: false };
    let attributedCode = null;
    if (coupon?.ok && coupon.affiliate_id) {
      // 折扣碼綁了夥伴 → 用該券的代碼歸屬
      commission = { ok: true, affiliate_id: coupon.affiliate_id, amount: 0 };
      attributedCode = coupon.code;
      // 用一般規則算金額（以折扣後總額為基準）
      if (refCode) {
        const byRef = await calcCommission(refCode, ev.id, total, seatNos.length);
        if (byRef?.ok && byRef.affiliate_id === coupon.affiliate_id) {
          commission.amount = byRef.amount;
          attributedCode = refCode;
        }
      }
    } else if (refCode) {
      commission = await calcCommission(refCode, ev.id, total, seatNos.length);
      attributedCode = refCode;
    }

    try {
      await createOrder({
        id: orderId,
        event_id: ev.id,
        ticket_id: ticket.id,
        seats: seatNos,
        buyer_name: form.name,
        buyer_phone: form.phone,
        buyer_email: form.email,
        invoice_type: form.invoiceType,
        tax_id: form.taxId || null,
        invoice_title: form.invoiceTitle || null,
        payment_method: method,
        total,
        status: "pending",
        member_id: member?.id || null,
        points_used: pointsUsed,
        affiliate_id: commission.ok ? commission.affiliate_id : null,
        affiliate_code: commission.ok ? attributedCode : null,
        commission_amount: commission.ok ? commission.amount : 0,
        coupon_id: coupon?.ok ? coupon.coupon_id : null,
        coupon_code: coupon?.ok ? coupon.code : null,
        discount_amount: discount,
      });

      // 防超賣：原子性訂位。若座位已被別人搶走 → 回滾訂單
      const res = await reserveSeats(ticket.id, seatNos, orderId);
      if (!res?.ok) {
        await supabase.from("orders").delete().eq("id", orderId);
        // 重新載入座位狀態讓使用者重選
        const fresh = await getSeats(ticket.id);
        setSoldSet(new Set(fresh.filter((s) => s.status !== "available").map((s) => s.seat_no)));
        setSeats([]);
        setStep(2);
        setErr("很抱歉，您選的座位剛被其他人訂走了，請重新選位。");
        setBusy(false);
        return;
      }

      // 會員：扣折抵點數、記錄待發點數
      if (member) {
        await supabase.rpc("apply_order_points", {
          p_order_id: orderId,
          p_member_id: member.id,
          p_points_used: pointsUsed,
          p_total: total,
        });
        refreshMember && refreshMember();
      }

      // 登記折扣碼使用
      if (coupon?.ok) {
        try {
          await redeemCoupon({
            couponId: coupon.coupon_id,
            orderId,
            memberId: member?.id,
            email: form.email,
            amount: discount,
          });
        } catch (e) {}
      }

      // 廣告追蹤：完成購買
      track("Purchase", {
        content_name: ev.title,
        content_ids: [ev.slug],
        content_type: "product",
        value: total,
        currency: "TWD",
        num_items: seatNos.length,
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
              const totalSeats = t.seat_rows * t.seat_cols;
              const soldCount = ticketId === t.id ? soldSet.size : null;
              const rem = soldCount !== null ? totalSeats - soldCount : totalSeats;
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
              ticket={ticket}
              selected={seats}
              onToggle={toggleSeat}
              maxQty={qty}
              soldSet={soldSet}
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

            {/* 折扣碼 */}
            <div
              style={{
                marginTop: 16,
                padding: 14,
                background: coupon?.ok ? "#F0FFF4" : C.primaryL,
                border: `1px solid ${coupon?.ok ? "#9AE6B4" : C.border}`,
                borderRadius: 4,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                折扣碼 / 優惠券
              </div>

              {coupon?.ok ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: C.green,
                        fontFamily: "monospace",
                      }}
                    >
                      {coupon.code}
                    </div>
                    <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>
                      {coupon.name} · 折抵 NT${discount.toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={removeCoupon}
                    style={{
                      padding: "6px 12px",
                      border: `1px solid ${C.border}`,
                      background: "#fff",
                      borderRadius: 3,
                      fontSize: 12,
                      color: C.sub,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    移除
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                      placeholder="輸入折扣碼"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: "10px 12px",
                        border: `1px solid ${C.border}`,
                        borderRadius: 3,
                        fontSize: 13,
                        outline: "none",
                        fontFamily: "monospace",
                        textTransform: "uppercase",
                      }}
                    />
                    <button
                      onClick={() => applyCoupon()}
                      disabled={couponBusy || !couponCode.trim()}
                      style={{
                        padding: "0 18px",
                        border: "none",
                        borderRadius: 3,
                        background: couponCode.trim() ? C.primary : C.border,
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: couponCode.trim() ? "pointer" : "not-allowed",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {couponBusy ? "驗證中" : "套用"}
                    </button>
                  </div>
                  {couponMsg && (
                    <div style={{ fontSize: 12, color: C.red, marginTop: 6 }}>
                      {couponMsg}
                    </div>
                  )}
                </>
              )}
            </div>

            {member ? (
              maxRedeem > 0 ? (
                <div
                  style={{
                    marginTop: 16,
                    padding: 14,
                    background: C.accentL,
                    border: `1px solid ${C.accent}30`,
                    borderRadius: 4,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      使用點數折抵
                    </div>
                    <div style={{ fontSize: 11, color: C.sub }}>
                      可用 {member.points} 點 · 本單最多折 {maxRedeem} 點
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="range"
                      min={0}
                      max={maxRedeem}
                      value={Math.min(usePoints, maxRedeem)}
                      onChange={(e) => setUsePoints(Number(e.target.value))}
                      style={{ flex: 1, accentColor: C.accent }}
                    />
                    <input
                      type="number"
                      min={0}
                      max={maxRedeem}
                      value={pointsUsed}
                      onChange={(e) =>
                        setUsePoints(
                          Math.max(0, Math.min(maxRedeem, Number(e.target.value) || 0))
                        )
                      }
                      style={{
                        width: 70,
                        padding: "6px 8px",
                        border: `1px solid ${C.border}`,
                        borderRadius: 3,
                        fontSize: 13,
                        textAlign: "center",
                        outline: "none",
                      }}
                    />
                    <span style={{ fontSize: 12, color: C.sub }}>點</span>
                  </div>
                  <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                    <button
                      onClick={() => setUsePoints(0)}
                      style={{
                        fontSize: 11,
                        padding: "4px 10px",
                        border: `1px solid ${C.border}`,
                        borderRadius: 3,
                        background: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      不使用
                    </button>
                    <button
                      onClick={() => setUsePoints(maxRedeem)}
                      style={{
                        fontSize: 11,
                        padding: "4px 10px",
                        border: `1px solid ${C.accent}`,
                        borderRadius: 3,
                        background: C.accentL,
                        color: C.accent,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      折到最高（省 ${pointsUsed > 0 ? pointsUsed : maxRedeem}）
                    </button>
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 8 }}>
                    {member.member_tiers?.name || "會員"}折抵上限為訂單票價的{" "}
                    {redeemCap}%，1 點折抵 1 元
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    background: C.primaryL,
                    borderRadius: 4,
                    fontSize: 12,
                    color: C.sub,
                  }}
                >
                  目前可用點數為 0，購票並完成核銷後，活動結束 3 天將發放點數。
                </div>
              )
            ) : (
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  background: C.primaryL,
                  borderRadius: 4,
                  fontSize: 12,
                  color: C.sub,
                  textAlign: "center",
                }}
              >
                <a href="/login" style={{ color: C.accent, fontWeight: 600 }}>
                  登入會員
                </a>{" "}
                即可累積並折抵點數
              </div>
            )}
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
              <span>NT${fee}</span>
            </div>
            {discount > 0 && (
              <div
                style={{
                  padding: "10px 14px",
                  borderBottom: `1px solid ${C.borderL}`,
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                }}
              >
                <span style={{ color: C.green }}>
                  折扣碼 {coupon?.code}
                </span>
                <span style={{ color: C.green }}>
                  -NT${discount.toLocaleString()}
                </span>
              </div>
            )}
            {pointsUsed > 0 && (
              <div
                style={{
                  padding: "10px 14px",
                  borderBottom: `1px solid ${C.borderL}`,
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                }}
              >
                <span style={{ color: C.accent }}>點數折抵 {pointsUsed} 點</span>
                <span style={{ color: C.accent }}>
                  -NT${pointsUsed.toLocaleString()}
                </span>
              </div>
            )}
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
            {member && (
              <div
                style={{
                  padding: "0 14px 12px",
                  fontSize: 11,
                  color: C.sub,
                  textAlign: "right",
                }}
              >
                完成核銷後，活動結束 3 天可得約{" "}
                {Math.floor(total / (member.member_tiers?.earn_per || 50))} 點
              </div>
            )}
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
