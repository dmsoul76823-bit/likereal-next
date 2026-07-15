"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { C, CATEGORIES } from "@/lib/theme";
import { useMember } from "@/components/MemberContext";

// ══ Navbar ══
export function Navbar({ search, setSearch }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          height: 56,
          gap: 14,
        }}
      >
        <Link
          href="/"
          style={{
            fontWeight: 700,
            fontSize: 20,
            color: C.text,
            letterSpacing: -0.5,
            flexShrink: 0,
          }}
        >
          LIKE <span style={{ fontWeight: 200 }}>REAL</span>
        </Link>

        {setSearch && (
          <div className="lr-search" style={{ flex: 1, maxWidth: 400, position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 11,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 13,
                color: C.muted,
              }}
            >
              ⌕
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋場域、體驗..."
              style={{
                width: "100%",
                padding: "8px 11px 8px 30px",
                borderRadius: 3,
                border: `1px solid ${C.border}`,
                fontSize: 13,
                outline: "none",
                color: C.text,
                background: C.primaryL,
              }}
            />
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* 桌機版右側 */}
        <div className="lr-nav-desktop">
          <NavbarAuth />
        </div>

        {/* 手機版漢堡 */}
        <button
          className="lr-nav-mobile-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="選單"
          style={{
            display: "none",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 22,
            color: C.text,
            padding: 4,
          }}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* 手機版展開選單 */}
      {menuOpen && (
        <div
          className="lr-nav-mobile-menu"
          style={{
            borderTop: `1px solid ${C.border}`,
            padding: "12px 16px",
            background: "#fff",
          }}
        >
          <MobileMenu />
        </div>
      )}
    </div>
  );
}

function MobileMenu() {
  const ctx = useMember();
  const member = ctx?.member;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {member ? (
        <>
          <Link
            href="/account"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              fontSize: 15,
              fontWeight: 600,
              color: C.text,
            }}
          >
            {member.name} 的會員中心
            <span
              style={{
                background: C.accentL,
                color: C.accent,
                padding: "3px 10px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {member.points} 點
            </span>
          </Link>
          <Link href="/account" style={{ fontSize: 14, color: C.sub, padding: "6px 0" }}>
            我的訂單 / 電子票券
          </Link>
        </>
      ) : (
        <div style={{ display: "flex", gap: 10 }}>
          <Link
            href="/login"
            style={{
              flex: 1,
              textAlign: "center",
              padding: "10px",
              border: `1px solid ${C.border}`,
              borderRadius: 3,
              fontSize: 14,
              color: C.text,
            }}
          >
            登入
          </Link>
          <Link
            href="/login"
            style={{
              flex: 1,
              textAlign: "center",
              padding: "10px",
              background: C.primary,
              color: "#fff",
              borderRadius: 3,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            註冊
          </Link>
        </div>
      )}
    </div>
  );
}

// ══ Navbar 登入狀態 ══
function NavbarAuth() {
  const ctx = useMember();
  const member = ctx?.member;
  return (
    <div
      style={{
        flexShrink: 0,
        display: "flex",
        gap: 10,
        alignItems: "center",
      }}
    >
      {member ? (
        <Link
          href="/account"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: C.text,
            fontWeight: 600,
          }}
        >
          <span
            style={{
              background: C.accentL,
              color: C.accent,
              padding: "3px 10px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {member.points} 點
          </span>
          {member.name}
        </Link>
      ) : (
        <>
          <Link href="/login" style={{ fontSize: 12, color: C.sub }}>
            登入
          </Link>
          <Link
            href="/login"
            style={{
              background: C.primary,
              color: "#fff",
              borderRadius: 2,
              padding: "7px 14px",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            註冊
          </Link>
        </>
      )}
    </div>
  );
}

// ══ 跑馬燈 ══
export function Marquee({ items }) {
  if (!items?.length) return null;
  const txt = items.join("　　　　");
  return (
    <div
      style={{
        background: C.primary,
        color: "#fff",
        height: 32,
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: C.accent,
          padding: "0 12px",
          height: "100%",
          display: "flex",
          alignItems: "center",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 2,
          flexShrink: 0,
        }}
      >
        NEWS
      </div>
      <div style={{ overflow: "hidden", flex: 1 }}>
        <div
          style={{
            display: "inline-block",
            whiteSpace: "nowrap",
            fontSize: 11,
            letterSpacing: 0.5,
            animation: "lr-marquee 40s linear infinite",
            paddingLeft: 14,
            fontWeight: 300,
          }}
        >
          {txt}　　　　{txt}
        </div>
      </div>
    </div>
  );
}

// ══ Banner 輪播 ══
export function BannerCarousel({ banners, height = 360 }) {
  const [idx, setIdx] = useState(0);
  const big = height >= 300;
  const multi = banners.length > 1;
  useEffect(() => {
    if (!multi) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % banners.length), 4500);
    return () => clearInterval(id);
  }, [multi, banners.length]);

  if (!banners?.length) return null;
  const b = banners[idx];

  return (
    <div
      className={big ? "lr-banner-top" : "lr-banner-btm"}
      style={{
        position: "relative",
        borderRadius: 4,
        overflow: "hidden",
        height,
        background: b.color,
      }}
    >
      {b.image && (
        <img
          src={b.image}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}
      {b.image && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg,rgba(10,14,20,0.88) 0%,rgba(10,14,20,0.5) 55%,rgba(10,14,20,0.2) 100%)",
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: big ? "0 clamp(24px, 6vw, 64px)" : "0 28px",
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.55)",
            letterSpacing: 3,
            marginBottom: 10,
          }}
        >
          LIKE REAL · 沉浸場域
        </div>
        <div
          style={{
            fontSize: big ? 34 : 24,
            fontWeight: 200,
            color: "#fff",
            letterSpacing: -0.8,
            marginBottom: 8,
            lineHeight: 1.15,
          }}
        >
          {b.title}
        </div>
        <div
          style={{
            fontSize: big ? 15 : 13,
            color: "rgba(255,255,255,0.7)",
            marginBottom: big ? 22 : 16,
            lineHeight: 1.6,
          }}
        >
          {b.subtitle}
        </div>
        {b.cta_text && (
          <span
            style={{
              background: "#fff",
              color: "#0A0E14",
              padding: big ? "11px 26px" : "9px 20px",
              borderRadius: 2,
              fontSize: big ? 13 : 12,
              fontWeight: 700,
              width: "fit-content",
            }}
          >
            {b.cta_text}
          </span>
        )}
      </div>
      {multi && (
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 5,
          }}
        >
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`第 ${i + 1} 張`}
              style={{
                width: i === idx ? 18 : 5,
                height: 3,
                background: i === idx ? "#fff" : "rgba(255,255,255,0.4)",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "width 0.3s",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ══ 公告 ══
export function Announcements({ items }) {
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState(null);
  if (!items?.length) return null;

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          background: C.primaryL,
          border: `1px solid ${C.border}`,
          borderRadius: 2,
          padding: "5px 11px",
          fontSize: 11,
          color: C.sub,
          cursor: "pointer",
          marginBottom: 14,
          fontWeight: 600,
        }}
      >
        顯示公告
      </button>
    );

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 4,
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "9px 13px",
          borderBottom: `1px solid ${C.borderL}`,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: C.text,
            letterSpacing: 1.5,
          }}
        >
          公告
        </span>
        <span style={{ flex: 1 }} />
        <button
          onClick={() => setOpen(false)}
          aria-label="關閉公告"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: C.muted,
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
      {items.map((a, i) => (
        <div key={a.id}>
          <div
            onClick={() => setExpanded(expanded === a.id ? null : a.id)}
            style={{
              padding: "10px 13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "flex-start",
              gap: 9,
              background: expanded === a.id ? C.primaryL : "transparent",
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: "3px 9px",
                borderRadius: 3,
                flexShrink: 0,
                whiteSpace: "nowrap",
                background: a.is_hot ? "#FFF1F0" : C.primaryL,
                color: a.is_hot ? C.red : C.text,
              }}
            >
              {a.tag}
            </span>
            <span
              style={{
                fontSize: 13,
                color: C.text,
                flex: 1,
                lineHeight: 1.6,
              }}
            >
              {expanded === a.id
                ? a.content
                : a.content.slice(0, 42) + (a.content.length > 42 ? "…" : "")}
            </span>
            <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>
              {a.published_at}
            </span>
          </div>
          {i < items.length - 1 && (
            <div style={{ height: 1, background: C.borderL }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ══ 活動視覺（有圖用圖，無圖用漸層）══
export function EventVisual({ event, height = 170 }) {
  const [failed, setFailed] = useState(false);
  const img = event.cover_image;
  if (img && !failed)
    return (
      <div
        style={{
          height,
          overflow: "hidden",
          position: "relative",
          background: "#0A0E14",
        }}
      >
        <img
          src={img}
          alt={event.title}
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top,rgba(10,14,20,0.7) 0%,rgba(10,14,20,0.1) 55%,rgba(10,14,20,0.3) 100%)",
          }}
        />
      </div>
    );
  return (
    <div
      style={{
        height,
        background: `linear-gradient(160deg,#0A0E14 0%,#1A2332 50%,${event.accent_color} 140%)`,
      }}
    />
  );
}

// ══ 活動卡 ══
export function EventCard({ event, featured }) {
  const [hov, setHov] = useState(false);
  const cat = CATEGORIES.find((c) => c.id === event.category);

  if (featured)
    return (
      <Link
        href={`/events/${event.slug}`}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: "block",
          borderRadius: 4,
          overflow: "hidden",
          position: "relative",
          height: 200,
          transition: "transform 0.25s, box-shadow 0.25s",
          transform: hov ? "scale(1.01)" : "none",
          boxShadow: hov
            ? "0 20px 50px rgba(0,0,0,0.2)"
            : "0 2px 12px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ position: "absolute", inset: 0 }}>
          <EventVisual event={event} height={200} />
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: "20px 18px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: "3px 9px",
                border: `1px solid ${event.accent_color}66`,
                borderRadius: 20,
                color: event.accent_color,
                letterSpacing: 1.5,
                background: "rgba(0,0,0,0.35)",
              }}
            >
              {event.tag}
            </span>
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.5)",
                marginBottom: 3,
              }}
            >
              {event.date_text}
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 200,
                color: "#fff",
                lineHeight: 1.1,
                marginBottom: 3,
                letterSpacing: -0.5,
              }}
            >
              {event.title}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.6)",
                marginBottom: 12,
              }}
            >
              {event.subtitle}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}
              >
                {event.venue}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#0A0E14",
                  background: "#fff",
                  padding: "5px 14px",
                  borderRadius: 20,
                }}
              >
                {event.price_text}
              </span>
            </div>
          </div>
        </div>
      </Link>
    );

  return (
    <Link
      href={`/events/${event.slug}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "block",
        background: C.surface,
        border: `1px solid ${hov ? C.primary : C.border}`,
        borderRadius: 4,
        overflow: "hidden",
        transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s",
        transform: hov ? "translateY(-3px)" : "none",
        boxShadow: hov ? "0 12px 28px rgba(0,0,0,0.08)" : "none",
      }}
    >
      <div style={{ position: "relative" }}>
        <EventVisual event={event} height={170} />
        <div style={{ position: "absolute", top: 10, left: 10 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 9px",
              border: `1px solid ${event.accent_color}66`,
              borderRadius: 20,
              color: event.accent_color,
              letterSpacing: 1,
              background: "rgba(0,0,0,0.5)",
            }}
          >
            {event.tag}
          </span>
        </div>
      </div>
      <div style={{ padding: "14px 16px" }}>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>
          {event.date_text}
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: C.text,
            lineHeight: 1.35,
            marginBottom: 4,
          }}
        >
          {event.title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: C.sub,
            marginBottom: 10,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {event.venue}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
            {event.price_text}
          </span>
          <span style={{ fontSize: 11, color: C.muted }}>{cat?.icon}</span>
        </div>
      </div>
    </Link>
  );
}

// ══ 頁尾 ══
export function Footer() {
  return (
    <footer
      style={{
        background: C.primary,
        padding: "22px 16px",
        textAlign: "center",
        fontSize: 11,
        color: "rgba(255,255,255,0.5)",
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#fff",
          marginBottom: 6,
          letterSpacing: 1,
        }}
      >
        LIKE REAL
      </div>
      虛擬與現實整合劇場 © 2026
    </footer>
  );
}
