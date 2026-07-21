"use client";
import { useState, useEffect } from "react";
import { getAffiliateDashboard, SITE_URL } from "@/lib/supabase";
import { C } from "@/lib/theme";

export default function PartnerClient({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    getAffiliateDashboard(token).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [token]);

  function copy(text, key) {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1800);
  }

  if (loading)
    return (
      <div style={centerBox}>
        <span style={{ color: C.muted, fontSize: 14 }}>載入中…</span>
      </div>
    );

  if (!data?.ok)
    return (
      <div style={centerBox}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
            連結無效
          </div>
          <div style={{ fontSize: 13, color: C.sub }}>
            這個推廣連結不存在或已停用，請與主辦單位聯繫。
          </div>
        </div>
      </div>
    );

  const s = data.stats || {};
  const base = typeof window !== "undefined" ? window.location.origin : SITE_URL;

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      {/* 頂部 */}
      <div
        style={{
          background: C.primary,
          color: "#fff",
          padding: "28px 20px",
        }}
      >
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ fontSize: 11, opacity: 0.5, letterSpacing: 2, marginBottom: 6 }}>
            LIKE REAL — 推廣夥伴
          </div>
          <div style={{ fontSize: 24, fontWeight: 300 }}>{data.name}</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
            推廣代碼 {data.code} · 追蹤有效期 {data.cookie_days} 天
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "20px 14px 60px" }}>
        {/* 數字卡 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 10,
            marginBottom: 20,
          }}
        >
          {[
            { label: "連結點擊", value: s.clicks ?? 0, color: C.sub },
            { label: "成交訂單", value: s.orders ?? 0, color: C.accent },
            {
              label: "帶來銷售額",
              value: `NT$${(s.total_sales ?? 0).toLocaleString()}`,
              color: C.text,
            },
            {
              label: "待結算分潤",
              value: `NT$${(s.commission_pending ?? 0).toLocaleString()}`,
              color: C.yellow,
            },
            {
              label: "已結算分潤",
              value: `NT$${(s.commission_paid ?? 0).toLocaleString()}`,
              color: C.green,
            },
          ].map((x) => (
            <div
              key={x.label}
              style={{
                background: "#fff",
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: 16,
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 800, color: x.color }}>
                {x.value}
              </div>
              <div style={{ fontSize: 11, color: C.sub, marginTop: 3 }}>
                {x.label}
              </div>
            </div>
          ))}
        </div>

        {/* 推廣連結 */}
        <Section title="你的推廣連結">
          <div style={{ fontSize: 12, color: C.sub, marginBottom: 12, lineHeight: 1.7 }}>
            把下面的連結分享出去，只要有人透過它購票，就會計入你的分潤。
            訪客點擊後 {data.cookie_days} 天內完成的購票都算。
          </div>

          <LinkRow
            label="網站首頁"
            url={`${base}/?ref=${data.code}`}
            copied={copied === "home"}
            onCopy={() => copy(`${base}/?ref=${data.code}`, "home")}
          />

          {(data.rules || [])
            .filter((r) => r.event_slug)
            .map((r) => (
              <LinkRow
                key={r.event_slug}
                label={r.event_title}
                url={`${base}/events/${r.event_slug}?ref=${data.code}`}
                copied={copied === r.event_slug}
                onCopy={() =>
                  copy(`${base}/events/${r.event_slug}?ref=${data.code}`, r.event_slug)
                }
              />
            ))}
        </Section>

        {/* 分潤方案 */}
        <Section title="分潤方案">
          {(data.rules || []).length === 0 && (
            <Empty text="尚未設定分潤方案，請與主辦單位聯繫" />
          )}
          {(data.rules || []).map((r, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "11px 0",
                borderBottom:
                  i < data.rules.length - 1 ? `1px solid ${C.borderL}` : "none",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500 }}>{r.event_title}</span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.accent,
                  whiteSpace: "nowrap",
                }}
              >
                {r.commission_type === "percent"
                  ? `訂單金額 ${Number(r.commission_value)}%`
                  : `每張票 NT$${Number(r.commission_value)}`}
              </span>
            </div>
          ))}
        </Section>

        {/* 訂單明細 */}
        <Section title="成交明細">
          {(data.orders || []).length === 0 && <Empty text="還沒有成交紀錄" />}
          {(data.orders || []).map((o) => (
            <div
              key={o.order_id}
              style={{
                padding: "12px 0",
                borderBottom: `1px solid ${C.borderL}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {o.event_title}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                    {new Date(o.created_at).toLocaleDateString("zh-TW")} · 訂單金額 NT$
                    {o.total?.toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.accent }}>
                    +NT${o.commission?.toLocaleString()}
                  </div>
                  <CommissionBadge status={o.commission_status || o.status} />
                </div>
              </div>
            </div>
          ))}
        </Section>

        <div
          style={{
            marginTop: 20,
            fontSize: 11,
            color: C.muted,
            textAlign: "center",
            lineHeight: 1.8,
          }}
        >
          此頁面為你的專屬連結，請勿外流。
          <br />
          分潤結算方式與時間請與主辦單位確認。
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: 18,
        marginBottom: 14,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function LinkRow({ label, url, copied, onCopy }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: C.sub, marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
          style={{
            flex: 1,
            minWidth: 0,
            padding: "9px 11px",
            border: `1px solid ${C.border}`,
            borderRadius: 4,
            fontSize: 12,
            background: C.primaryL,
            outline: "none",
            fontFamily: "monospace",
          }}
        />
        <button
          onClick={onCopy}
          style={{
            padding: "0 16px",
            border: "none",
            borderRadius: 4,
            background: copied ? C.green : C.primary,
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {copied ? "已複製" : "複製"}
        </button>
      </div>
    </div>
  );
}

function CommissionBadge({ status }) {
  const map = {
    pending: ["待結算", "#FFF8E8", "#FF9500"],
    approved: ["已確認", "#EBF2FF", "#0066FF"],
    paid: ["已付款", "#E8FFF0", "#00C853"],
    void: ["已作廢", "#FFF1F0", "#FF3B30"],
  };
  const [label, bg, color] = map[status] || map.pending;
  return (
    <span
      style={{
        display: "inline-block",
        marginTop: 3,
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 20,
        background: bg,
        color,
      }}
    >
      {label}
    </span>
  );
}

function Empty({ text }) {
  return (
    <div style={{ textAlign: "center", padding: 24, color: C.muted, fontSize: 13 }}>
      {text}
    </div>
  );
}

const centerBox = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#FAFBFC",
  padding: 20,
};
