"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMember } from "@/components/MemberContext";
import {
  getPointLogs,
  getMemberOrders,
  getTiers,
} from "@/lib/supabase";
import { C } from "@/lib/theme";

export default function AccountClient() {
  const router = useRouter();
  const { user, member, loading, logout } = useMember();
  const [tab, setTab] = useState("overview");
  const [logs, setLogs] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tiers, setTiers] = useState([]);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user]);

  useEffect(() => {
    if (member) {
      getPointLogs(member.id).then(setLogs);
      getMemberOrders(member.id).then(setOrders);
      getTiers().then(setTiers);
    }
  }, [member]);

  if (loading || !member)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.muted,
        }}
      >
        載入中…
      </div>
    );

  const tier = member.member_tiers;
  const nextTier = tiers.find((t) => t.level === (tier?.level || 1) + 1);
  const toNext = nextTier ? nextTier.min_spent - member.total_spent : 0;

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      {/* 頂部 */}
      <div
        style={{
          background: "#fff",
          borderBottom: `1px solid ${C.border}`,
          padding: "0 16px",
          height: 54,
          display: "flex",
          alignItems: "center",
          maxWidth: 720,
          margin: "0 auto",
        }}
      >
        <Link href="/" style={{ fontSize: 18, fontWeight: 700 }}>
          LIKE <span style={{ fontWeight: 200 }}>REAL</span>
        </Link>
        <div style={{ flex: 1 }} />
        <button
          onClick={logout}
          style={{
            background: "none",
            border: `1px solid ${C.border}`,
            borderRadius: 3,
            padding: "6px 12px",
            fontSize: 12,
            color: C.sub,
            cursor: "pointer",
          }}
        >
          登出
        </button>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 14px 60px" }}>
        {/* 會員卡 */}
        <div
          style={{
            background: `linear-gradient(135deg, #0A0E14, ${tier?.color || "#697485"})`,
            borderRadius: 8,
            padding: 24,
            color: "#fff",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 20,
            }}
          >
            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{member.name}</div>
              <div style={{ fontSize: 11, opacity: 0.5 }}>{member.email}</div>
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.15)",
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {tier?.name || "一般會員"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>可用點數</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>
                {member.points}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>待發放</div>
              <div style={{ fontSize: 28, fontWeight: 300 }}>
                {member.pending_points}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>累計消費</div>
              <div style={{ fontSize: 28, fontWeight: 300 }}>
                ${member.total_spent.toLocaleString()}
              </div>
            </div>
          </div>

          {nextTier && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6 }}>
                距離 {nextTier.name} 還差 ${toNext.toLocaleString()}
              </div>
              <div
                style={{
                  height: 5,
                  background: "rgba(255,255,255,0.2)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(
                      100,
                      (member.total_spent / nextTier.min_spent) * 100
                    )}%`,
                    background: "#fff",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 分頁 */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {[
            ["overview", "會員權益"],
            ["orders", "我的訂單"],
            ["points", "點數明細"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                padding: "8px 16px",
                border: `1px solid ${tab === id ? C.primary : C.border}`,
                background: tab === id ? C.primary : "#fff",
                color: tab === id ? "#fff" : C.sub,
                borderRadius: 3,
                fontSize: 13,
                fontWeight: tab === id ? 700 : 400,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                background: "#fff",
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: 18,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
                目前等級權益
              </div>
              <Row label="每消費累積 1 點" value={`每 ${tier?.earn_per || 50} 元`} />
              <Row
                label="點數折抵上限"
                value={`訂單金額的 ${tier?.redeem_cap || 30}%`}
              />
              <Row
                label="點數價值"
                value="1 點 = 1 元（1:1 折抵）"
                last
              />
            </div>

            <div
              style={{
                background: "#fff",
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: 18,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
                所有等級
              </div>
              {tiers.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom:
                      t.level < tiers.length ? `1px solid ${C.borderL}` : "none",
                    opacity: t.level <= (tier?.level || 1) ? 1 : 0.5,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: t.color,
                      marginRight: 10,
                    }}
                  />
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
                    {t.name}
                    {t.level === (tier?.level || 1) && (
                      <span
                        style={{ fontSize: 10, color: C.accent, marginLeft: 8 }}
                      >
                        目前
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: C.sub }}>
                    累計 ${t.min_spent.toLocaleString()} · 每 {t.earn_per} 元 1 點
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                background: "#F0F7FF",
                border: `1px solid ${C.accent}30`,
                borderRadius: 6,
                padding: "12px 16px",
                fontSize: 12,
                color: C.sub,
                lineHeight: 1.7,
              }}
            >
              點數規則：購票後點數列為「待發放」，於<strong>活動結束 3 天後</strong>、
              且票券已核銷入場，才正式發放至可用點數。
            </div>
          </div>
        )}

        {tab === "orders" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {orders.length === 0 && (
              <Empty text="還沒有訂單，快去逛逛活動吧" />
            )}
            {orders.map((o) => (
              <Link
                key={o.id}
                href={`/ticket/${o.id}`}
                style={{
                  display: "block",
                  background: "#fff",
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  padding: 16,
                  cursor: "pointer",
                }}
                className="lr-card-hover"
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 12,
                      color: C.accent,
                      fontWeight: 700,
                    }}
                  >
                    {o.id}
                  </span>
                  <StatusBadge status={o.status} checkedIn={o.checked_in} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {o.events?.title}
                </div>
                <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>
                  {o.events?.date_text} · {o.events?.venue}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    paddingTop: 8,
                    borderTop: `1px solid ${C.borderL}`,
                  }}
                >
                  <span style={{ color: C.sub }}>
                    {o.points_used > 0 && `折抵 ${o.points_used} 點 · `}
                    {o.points_earned > 0 &&
                      (o.points_released
                        ? `已得 ${o.points_earned} 點`
                        : `待發 ${o.points_earned} 點`)}
                  </span>
                  <span style={{ fontWeight: 700 }}>
                    NT${o.total.toLocaleString()}
                  </span>
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: C.accent, textAlign: "right" }}>
                  查看電子票券 →
                </div>
              </Link>
            ))}
          </div>
        )}

        {tab === "points" && (
          <div
            style={{
              background: "#fff",
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            {logs.length === 0 && <Empty text="還沒有點數紀錄" />}
            {logs.map((l, i) => (
              <div
                key={l.id}
                style={{
                  padding: "12px 16px",
                  borderBottom:
                    i < logs.length - 1 ? `1px solid ${C.borderL}` : "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {l.note || pointTypeLabel(l.type)}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    {new Date(l.created_at).toLocaleDateString("zh-TW")}
                    {l.type === "pending" && !l.released && " · 待發放"}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color:
                      l.type === "pending"
                        ? C.muted
                        : l.amount > 0
                        ? C.green
                        : C.red,
                  }}
                >
                  {l.amount > 0 ? "+" : ""}
                  {l.amount}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, last }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "8px 0",
        borderBottom: last ? "none" : `1px solid #EFF2F5`,
        fontSize: 13,
      }}
    >
      <span style={{ color: "#697485" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function StatusBadge({ status, checkedIn }) {
  const map = {
    paid: ["已付款", "#E8FFF0", "#00C853"],
    pending: ["待付款", "#FFF8E8", "#FF9500"],
    refunded: ["已退款", "#FFF1F0", "#FF3B30"],
  };
  const [label, bg, color] = map[status] || map.pending;
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {checkedIn && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 20,
            background: "#E8FFF0",
            color: "#00C853",
          }}
        >
          已入場
        </span>
      )}
      <span
        style={{
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
    </div>
  );
}

function Empty({ text }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: 40,
        color: "#A4ACB8",
        fontSize: 13,
      }}
    >
      {text}
    </div>
  );
}

function pointTypeLabel(t) {
  return (
    { earn: "點數發放", redeem: "點數折抵", pending: "待發放點數", expire: "點數到期" }[
      t
    ] || t
  );
}
