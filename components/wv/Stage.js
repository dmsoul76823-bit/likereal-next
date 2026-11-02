"use client";
import { useState } from "react";
import Link from "next/link";

/**
 * 首頁主視覺播放器
 * 原站這裡的「18.7k 人正在沉浸觀看」是示範數字，
 * 改用資料庫的真實節目數與場次數，不放假數據。
 */
export default function Stage({ program, programCount, sessionCount }) {
  const [playing, setPlaying] = useState(false);
  const ytId = program?.ytId || null;
  const canPlay = !!(ytId || program?.videoUrl);

  return (
    <div className="wrap stage">
      <div className="stage-eyebrow">WONDER V · 沉浸式場域節目 IMMERSIVE VENUE</div>

      <div className="player">
        {program?.img && !playing && (
          <div
            className="hero-bg"
            style={{ backgroundImage: `url("${program.img}")` }}
          />
        )}
        {!playing && <div className="hero-ov" />}
        {!playing && <div className="depth" />}

        {program?.isLive && (
          <div className="live-badge">
            <span className="pulse" />
            {program.liveTitle || "LIVE 沉浸直播中"}
          </div>
        )}
        {!playing && <div className="mode3d">🕶️ 裸視 3D 觀看模式</div>}

        {playing && ytId && (
          <iframe
            className="ev-embed"
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
            title={program?.name || "節目影片"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
        {playing && !ytId && program?.videoUrl && (
          <video className="ev-embed" src={program.videoUrl} autoPlay controls playsInline />
        )}

        {!playing &&
          (canPlay ? (
            <button
              className="play-btn"
              onClick={() => setPlaying(true)}
              aria-label="播放節目影片"
            >
              ▶
            </button>
          ) : program ? (
            <Link
              href={`/programs/${program.slug}`}
              className="play-btn"
              aria-label={`查看 ${program.name}`}
            >
              ▶
            </Link>
          ) : null)}

        {!playing && program && (
          <div className="caption">
            <h1 className="serif">{program.name}</h1>
            <p>
              {program.venue ? `${program.venue} · ` : ""}
              360° 沉浸舞台 · 支援裸視 3D 手機／3D 眼鏡同步觀看
            </p>
          </div>
        )}
      </div>

      <div className="stage-cta">
        <Link className="btn btn-brand" href="/programs">
          🎟️ 馬上購票
        </Link>
        <Link className="btn btn-ghost" href="/programs">
          觀看沉浸節目
        </Link>
        <a className="btn btn-ghost" href="#sessions">
          近期場次
        </a>
      </div>

      <div className="stage-stat">
        <div>
          <b>{programCount}</b>檔沉浸場域節目
        </div>
        <div>
          <b>360°</b>全息舞台
        </div>
        <div>
          <b>裸視 3D</b>免眼鏡也能看
        </div>
        <div>
          <b>{sessionCount.toLocaleString()}</b>個演出場次
        </div>
      </div>
    </div>
  );
}
