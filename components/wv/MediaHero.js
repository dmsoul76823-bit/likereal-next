"use client";
import { useState } from "react";

/**
 * 節目主視覺：有 YouTube 就點擊播放，有影片檔就直接播，
 * 都沒有就顯示靜態主視覺。
 */
export default function MediaHero({ img, ytId, videoUrl, isLive, liveUrl, liveTitle, title, chips = [] }) {
  const [playing, setPlaying] = useState(false);
  const liveId = extractYtId(liveUrl);
  const playableYt = isLive && liveId ? liveId : ytId;
  const hasMedia = !!(playableYt || videoUrl);

  return (
    <div
      className={`ev-hero${hasMedia && playing ? " has-media" : ""}`}
      style={img && !playing ? { backgroundImage: `url("${img}")` } : undefined}
    >
      {!playing && <div className="ov" />}

      {isLive && <span className="live-tag">● {liveTitle || "LIVE 直播中"}</span>}

      {playing && playableYt && (
        <iframe
          className="ev-embed"
          src={`https://www.youtube.com/embed/${playableYt}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title={title || "節目影片"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}

      {playing && !playableYt && videoUrl && (
        <video className="ev-embed" src={videoUrl} autoPlay controls playsInline />
      )}

      {!playing && hasMedia && (
        <button
          type="button"
          className="play-big"
          onClick={() => setPlaying(true)}
          aria-label="播放節目影片"
        >
          ▶
        </button>
      )}

      {!playing && (
        <div className="cap">
          {title && <h1>{title}</h1>}
          {chips.length > 0 && (
            <div className="chips">
              {chips.filter(Boolean).map((c, i) => (
                <span key={i}>{c}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** 直播連結可能是完整網址，也可能只是 ID */
function extractYtId(url) {
  if (!url) return null;
  const s = String(url).trim();
  if (!s) return null;
  if (!s.includes("/") && !s.includes("?")) return s;
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|live\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}
