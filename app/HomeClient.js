"use client";
import { useState, useEffect } from "react";
import { C, CATEGORIES } from "@/lib/theme";
import {
  Navbar,
  Marquee,
  BannerCarousel,
  Announcements,
  EventCard,
  Footer,
} from "@/components/ui";

export default function HomeClient({
  events,
  announcements,
  bannersTop,
  bannersBottom,
  marquee,
}) {
  const [cat, setCat] = useState("all");
  const [search, setSearch] = useState("");
  const [heroIdx, setHeroIdx] = useState(0);

  const featured = events.filter((e) => e.is_featured);

  useEffect(() => {
    if (featured.length < 2) return;
    const id = setInterval(
      () => setHeroIdx((i) => (i + 1) % featured.length),
      4500
    );
    return () => clearInterval(id);
  }, [featured.length]);

  const filtered = events.filter((e) => {
    const mc = cat === "all" || e.category === cat;
    const ms =
      !search ||
      e.title?.includes(search) ||
      e.subtitle?.includes(search) ||
      e.venue?.includes(search);
    return mc && ms;
  });

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <Navbar search={search} setSearch={setSearch} />
      <Marquee items={marquee} />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 14px 60px" }}>
        {bannersTop.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <BannerCarousel banners={bannersTop} height={360} />
          </div>
        )}

        <Announcements items={announcements} />

        {featured.length > 0 && (
          <section style={{ marginBottom: 22 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 11,
              }}
            >
              <h2
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: 1.5,
                  color: C.text,
                }}
              >
                推薦活動
              </h2>
              {featured.length > 1 && (
                <div style={{ display: "flex", gap: 5 }}>
                  {featured.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setHeroIdx(i)}
                      aria-label={`推薦活動 ${i + 1}`}
                      style={{
                        width: i === heroIdx ? 18 : 5,
                        height: 3,
                        background: i === heroIdx ? C.primary : C.border,
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        transition: "width 0.3s",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            <EventCard event={featured[heroIdx]} featured />
          </section>
        )}

        <div
          style={{
            display: "flex",
            gap: 5,
            overflowX: "auto",
            marginBottom: 14,
            paddingBottom: 2,
          }}
        >
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              style={{
                whiteSpace: "nowrap",
                padding: "7px 14px",
                borderRadius: 2,
                border: `1px solid ${cat === c.id ? C.primary : C.border}`,
                background: cat === c.id ? C.primary : "#fff",
                color: cat === c.id ? "#fff" : C.sub,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: cat === c.id ? 700 : 400,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span style={{ fontSize: 11 }}>{c.icon}</span>
              {c.label}
            </button>
          ))}
        </div>

        <div className="lr-grid">
          {filtered.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
        {filtered.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: C.muted,
              fontSize: 13,
            }}
          >
            找不到符合的場域
          </div>
        )}

        {bannersBottom.length > 0 && (
          <BannerCarousel banners={bannersBottom} height={240} />
        )}
      </main>

      <Footer />
    </div>
  );
}
