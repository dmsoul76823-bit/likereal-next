"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { C } from "@/lib/theme";
import { Navbar, EventVisual, Footer, BannerCarousel } from "@/components/ui";
import { getSeats } from "@/lib/supabase";
import { track } from "@/components/Tracking";

function useCountdown(target) {
  const calc = () => {
    if (!target) return { over: true, d: 0, h: 0, m: 0, s: 0 };
    const diff = new Date(target) - Date.now();
    if (diff <= 0) return { over: true, d: 0, h: 0, m: 0, s: 0 };
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff % 86400000) / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
      over: false,
    };
  };
  const [t, setT] = useState({ over: false, d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    setT(calc());
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, [target]);
  return t;
}

function YouTubeBlock({ videoId }) {
  const [playing, setPlaying] = useState(false);
  return (
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
          padding: "11px 16px",
          borderBottom: `1px solid ${C.border}`,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 1.5,
          color: C.sub,
        }}
      >
        影音介紹
      </div>
      {playing ? (
        <div
          style={{
            position: "relative",
            paddingBottom: "56.25%",
            height: 0,
            background: "#000",
          }}
        >
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            title="活動影音"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              border: 0,
            }}
          />
        </div>
      ) : (
        <div
          onClick={() => setPlaying(true)}
          style={{
            position: "relative",
            cursor: "pointer",
            background: "#000",
            aspectRatio: "16/9",
          }}
        >
          <img
            src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
            alt="影片縮圖"
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.7)",
                border: "2px solid rgba(255,255,255,0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderTop: "11px solid transparent",
                  borderBottom: "11px solid transparent",
                  borderLeft: "18px solid #fff",
                  marginLeft: 4,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EventClient({ event: ev, catLabel }) {
  const [tab, setTab] = useState("info");
  const cdEnd = useCountdown(ev.sale_end);
  const cdStart = useCountdown(ev.sale_start);
  const saleStarted = ev.sale_start
    ? new Date(ev.sale_start) <= new Date()
    : true;
  const canBuy = saleStarted && !cdEnd.over;

  // 只顯示未隱藏且在銷售期間內的票種
  const nowMs = Date.now();
  const tickets = (ev.tickets || []).filter((t) => {
    if (t.is_hidden) return false;
    if (t.sale_start && new Date(t.sale_start).getTime() > nowMs) return false;
    if (t.sale_end && new Date(t.sale_end).getTime() < nowMs) return false;
    return true;
  });
  const totalSeats = tickets.reduce(
    (a, t) => a + t.seat_rows * t.seat_cols,
    0
  );
  const [soldByTicket, setSoldByTicket] = useState({});

  // 廣告追蹤：瀏覽活動
  useEffect(() => {
    const lowest = tickets.length ? Math.min(...tickets.map((t) => t.price)) : 0;
    track("ViewContent", {
      content_name: ev.title,
      content_ids: [ev.slug],
      content_type: "product",
      value: lowest,
      currency: "TWD",
    });
  }, []);

  useEffect(() => {
    (async () => {
      const map = {};
      for (const t of tickets) {
        const rows = await getSeats(t.id);
        map[t.id] = rows.filter((s) => s.status !== "available").length;
      }
      setSoldByTicket(map);
    })();
  }, []);
  const totalSold = tickets.reduce(
    (a, t) => a + (soldByTicket[t.id] || 0),
    0
  );
  const soldPct = totalSeats ? Math.round((totalSold / totalSeats) * 100) : 0;

  const TABS = [
    { id: "info", label: "活動資訊" },
    { id: "tickets", label: "活動票券" },
    { id: "notices", label: "注意事項" },
    { id: "refund", label: "退票規則" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <Navbar />

      <div
        style={{
          background: "rgba(255,255,255,0.95)",
          borderBottom: `1px solid ${C.border}`,
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          height: 48,
        }}
      >
        <Link
          href="/"
          style={{ fontSize: 12, fontWeight: 600, color: C.text, marginRight: 12 }}
        >
          ← 返回
        </Link>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{ev.title}</div>
        <div style={{ flex: 1 }} />
        <Link
          href={canBuy ? `/events/${ev.slug}/buy` : "#"}
          style={{
            background: canBuy ? C.primary : "#ccc",
            color: "#fff",
            borderRadius: 2,
            padding: "8px 16px",
            fontSize: 12,
            fontWeight: 700,
            pointerEvents: canBuy ? "auto" : "none",
          }}
        >
          {cdEnd.over ? "已截止" : saleStarted ? "立即購票" : "尚未開售"}
        </Link>
      </div>

      <div style={{ height: 220, position: "relative" }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <EventVisual event={ev} height={220} />
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <div style={{ width: 20, height: 1, background: ev.accent_color }} />
            <div
              style={{
                fontSize: 9,
                color: ev.accent_color,
                letterSpacing: 3,
              }}
            >
              {catLabel}
            </div>
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 200,
              color: "#fff",
              letterSpacing: -0.5,
              lineHeight: 1.1,
              marginBottom: 6,
            }}
          >
            {ev.title}
          </h1>
          <div
            style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginBottom: 10 }}
          >
            {ev.subtitle}
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 10 }}>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>📅 {ev.date_text}</span>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>📍 {ev.venue}</span>
          </div>
        </div>
      </div>

      <div
        style={{
          background: C.surface,
          borderBottom: `1px solid ${C.border}`,
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: C.muted }}>
            {!saleStarted ? "距離開售" : cdEnd.over ? "售票已截止" : "距截止"}
          </span>
          {!cdEnd.over && (
            <div style={{ display: "flex", gap: 5 }}>
              {(saleStarted
                ? [
                    { v: cdEnd.d, u: "天" },
                    { v: cdEnd.h, u: "時" },
                    { v: cdEnd.m, u: "分" },
                    { v: cdEnd.s, u: "秒" },
                  ]
                : [
                    { v: cdStart.d, u: "天" },
                    { v: cdStart.h, u: "時" },
                    { v: cdStart.m, u: "分" },
                    { v: cdStart.s, u: "秒" },
                  ]
              ).map(({ v, u }) => (
                <div key={u} style={{ textAlign: "center" }}>
                  <div
                    style={{
                      background: C.primary,
                      color: "#fff",
                      borderRadius: 2,
                      padding: "2px 7px",
                      fontFamily: "monospace",
                      fontSize: 13,
                      fontWeight: 700,
                      minWidth: 24,
                    }}
                  >
                    {String(v).padStart(2, "0")}
                  </div>
                  <div style={{ fontSize: 8, color: C.muted, marginTop: 1 }}>{u}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>整體票況</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                height: 4,
                width: 80,
                background: C.borderL,
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${soldPct}%`,
                  background:
                    soldPct > 80 ? C.red : soldPct > 50 ? C.yellow : C.green,
                }}
              />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600 }}>{soldPct}% 售出</span>
          </div>
        </div>
      </div>

      <div
        style={{
          background: C.surface,
          borderBottom: `1px solid ${C.border}`,
          padding: "0 16px",
          display: "flex",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "12px 14px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: tab === t.id ? 700 : 400,
              color: tab === t.id ? C.primary : C.sub,
              borderBottom: `2px solid ${tab === t.id ? C.primary : "transparent"}`,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "16px 14px 40px" }}>
        {tab === "info" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {ev.detail_banners?.length > 0 && (
              <BannerCarousel banners={ev.detail_banners} height={140} />
            )}

            {ev.youtube_id && <YouTubeBlock videoId={ev.youtube_id} />}

            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 4,
                padding: "14px 16px",
              }}
            >
              <h2
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  color: C.sub,
                  marginBottom: 10,
                }}
              >
                活動簡介
              </h2>
              {ev.description?.split("\n\n").map((p, i) => (
                <p
                  key={i}
                  style={{
                    fontSize: 14,
                    color: C.text,
                    lineHeight: 1.9,
                    marginBottom: 12,
                  }}
                >
                  {p}
                </p>
              ))}
            </div>

            {ev.info_items?.length > 0 && (
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <h2
                  style={{
                    padding: "11px 16px",
                    borderBottom: `1px solid ${C.border}`,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    color: C.sub,
                  }}
                >
                  演出資訊
                </h2>
                {ev.info_items.map((it, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "10px 16px",
                      borderBottom:
                        i < ev.info_items.length - 1
                          ? `1px solid ${C.borderL}`
                          : "none",
                      display: "flex",
                      gap: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: C.muted,
                        width: 76,
                        flexShrink: 0,
                      }}
                    >
                      {it.label}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{it.value}</div>
                  </div>
                ))}
              </div>
            )}

            {ev.sale_info && (
              <div
                style={{
                  background: C.accentL,
                  border: `1px solid ${C.accent}30`,
                  borderRadius: 4,
                  padding: "14px 16px",
                }}
              >
                <h2
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    color: C.accent,
                    marginBottom: 8,
                  }}
                >
                  售票資訊
                </h2>
                {ev.sale_info.split("\n").map((l, i) => (
                  <div key={i} style={{ fontSize: 13, lineHeight: 1.9 }}>
                    {l}
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <h2
                style={{
                  padding: "11px 16px",
                  borderBottom: `1px solid ${C.border}`,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  color: C.sub,
                }}
              >
                場地位置
              </h2>
              <div
                style={{
                  padding: "20px 16px",
                  textAlign: "center",
                  background: C.primaryL,
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 6 }}>📍</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{ev.venue}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                  {ev.address}
                </div>
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(
                    ev.address || ev.venue
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-block",
                    marginTop: 12,
                    padding: "8px 20px",
                    background: "#fff",
                    border: `1px solid ${C.border}`,
                    borderRadius: 2,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  在地圖中查看 ↗
                </a>
              </div>
            </div>
          </div>
        )}

        {tab === "tickets" && (
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <h2
              style={{
                padding: "11px 16px",
                borderBottom: `1px solid ${C.border}`,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1.5,
                color: C.sub,
              }}
            >
              活動票券
            </h2>
            {tickets.map((t, i) => {
              const rem = t.seat_rows * t.seat_cols - (soldByTicket[t.id] || 0);
              return (
                <div
                  key={t.id}
                  style={{
                    padding: "14px 16px",
                    borderBottom:
                      i < tickets.length - 1 ? `1px solid ${C.borderL}` : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                      {t.label}
                    </div>
                    <div style={{ fontSize: 12, color: C.sub }}>{t.description}</div>
                    <div
                      style={{
                        fontSize: 11,
                        color: rem < 50 ? C.red : C.muted,
                        marginTop: 3,
                      }}
                    >
                      剩餘 {rem} 張 · 每人限購 {t.max_per_order} 張
                    </div>
                  </div>
                  <div
                    style={{ fontWeight: 700, fontSize: 16, whiteSpace: "nowrap" }}
                  >
                    NT${t.price.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "notices" && (
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              padding: "14px 16px",
            }}
          >
            {ev.notices?.map((n, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: 12,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: C.primaryL,
                    border: `1px solid ${C.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.8 }}>{n}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "refund" && (
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              padding: "14px 16px",
            }}
          >
            <div style={{ fontSize: 13, lineHeight: 1.9 }}>{ev.refund_policy}</div>
            <div
              style={{
                marginTop: 14,
                background: "#FFF8E8",
                border: "1px solid #FFE0A3",
                borderRadius: 3,
                padding: "10px 12px",
                fontSize: 12,
                color: "#8A5A00",
              }}
            >
              如需申請退票，請 Email 至 ticket@likereal.com，並附上訂單編號與購票人姓名。
            </div>
          </div>
        )}
      </main>

      <div
        style={{
          position: "sticky",
          bottom: 0,
          background: "rgba(255,255,255,0.97)",
          borderTop: `1px solid ${C.border}`,
          padding: "12px 16px",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{ev.title}</div>
              <div style={{ fontSize: 11, color: C.sub }}>
                {ev.date_text} · {ev.venue}
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{ev.price_text}</div>
          </div>
          <Link
            href={canBuy ? `/events/${ev.slug}/buy` : "#"}
            style={{
              display: "block",
              textAlign: "center",
              padding: "13px",
              borderRadius: 2,
              background: canBuy ? C.primary : "#ccc",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              pointerEvents: canBuy ? "auto" : "none",
            }}
          >
            {cdEnd.over ? "售票已截止" : saleStarted ? "立即購票 →" : "尚未開售"}
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
