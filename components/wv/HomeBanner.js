"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function HomeBanner({ pos = "頂部", banners = [] }) {
  const slides = banners.filter((b) => b.on !== false && b.pos === pos);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!slides.length) return null;

  return (
    <div className="bn on">
      {slides.map((b, i) => (
        <Link
          key={b.id}
          href={b.link || "#"}
          className={`bn-slide${i === idx ? " on" : ""}`}
        >
          <h3 className="serif">{b.title}</h3>
          <p>{b.sub}</p>
        </Link>
      ))}
      {slides.length > 1 && (
        <div className="bn-dots">
          {slides.map((b, i) => (
            <i
              key={b.id}
              className={i === idx ? "on" : ""}
              onClick={() => setIdx(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
