import Link from "next/link";
import { parseDate } from "@/lib/wv";
import FavHeart from "./FavHeart";

export default function ProgramCard({ program }) {
  const d = parseDate(program.firstDate);
  const hasSession = program.sessionCount > 0;

  return (
    <Link href={`/programs/${program.slug}`} className="pgcard">
      <div
        className="pic"
        style={program.img ? { backgroundImage: `url("${program.img}")` } : undefined}
      >
        <FavHeart
          k={`prog:${program.slug}`}
          name={program.name}
          sub={program.venue || program.intro || ""}
          img={program.img}
          go={`/programs/${program.slug}`}
        />
        {program.isLive && <span className="live-tag sm">● LIVE</span>}
        {hasSession && (
          <span className="badge-n">{program.sessionCount} 場</span>
        )}
      </div>

      <div className="body">
        <h4>{program.name}</h4>
        {program.intro && (
          <div
            className="meta"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {program.intro}
          </div>
        )}
        <div className="foot">
          <div className="meta">
            {d ? (
              <>
                {d.y}/{d.m}/{d.d}（{d.weekday}）起
                {program.venue && <div style={{ marginTop: 3 }}>{program.venue}</div>}
              </>
            ) : (
              "場次準備中"
            )}
          </div>
          {/* 字級交給 .pgcard .pr（--fs-base），不要用 inline style 蓋掉設計系統 */}
          <div className="pr">查看場次</div>
        </div>
      </div>
    </Link>
  );
}
