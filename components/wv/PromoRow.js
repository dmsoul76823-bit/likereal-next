import Link from "next/link";

/** 首頁「直播與 AI 夥伴」兩片 16:9 導引版位 */
export default function PromoRow({ promos = [] }) {
  const list = promos.filter((p) => p && p.on !== false).slice(0, 2);
  if (!list.length) return null;

  return (
    <div className={`promo-grid${list.length === 1 ? " one" : ""}`}>
      {list.map((p, i) => {
        const inner = (
          <>
            {p.yt && (
              <iframe
                className="pm-media"
                src={`https://www.youtube.com/embed/${p.yt}?autoplay=1&mute=1&loop=1&playlist=${p.yt}&controls=0&playsinline=1&rel=0&modestbranding=1`}
                allow="autoplay; encrypted-media"
                allowFullScreen
                title={p.title || "promo"}
              />
            )}
            {!p.yt && p.video && (
              <video
                className="pm-media"
                src={p.video}
                autoPlay
                muted
                loop
                playsInline
                poster={p.img || undefined}
              />
            )}
            <div className="pm-ov" />
            <div className="pm-cap">
              <h3 className="serif">{p.title || ""}</h3>
              {p.sub && <p>{p.sub}</p>}
              {p.url && <span className="pm-btn">{p.cta || "前往"}</span>}
            </div>
          </>
        );

        const style = p.img ? { backgroundImage: `url("${p.img}")` } : undefined;
        const ext = /^https?:/i.test(p.url || "");

        if (!p.url) {
          return (
            <div className="promo" key={i} style={style}>
              {inner}
            </div>
          );
        }
        return ext ? (
          <a
            className="promo link"
            key={i}
            style={style}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {inner}
          </a>
        ) : (
          <Link className="promo link" key={i} style={style} href={p.url}>
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
