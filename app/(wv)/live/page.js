import Link from "next/link";
import { getLivePrograms } from "@/lib/wv";

export const revalidate = 60;

export const metadata = {
  title: "直播大廳",
  description: "Wonder V 直播大廳：沉浸節目的現場直播與互動連麥。",
};

export default async function LivePage() {
  const lives = await getLivePrograms();

  return (
    <section>
      <div className="wrap">
        <div className="sec-head">
          <div>
            <span className="tag">LIVE HALL · 直播大廳</span>
            <h2 className="serif">正在直播</h2>
          </div>
        </div>

        {lives.length === 0 ? (
          <div className="panel" style={{ textAlign: "center", padding: "48px 24px" }}>
            <p style={{ color: "var(--muted)", marginBottom: 18 }}>
              目前沒有直播中的節目。
            </p>
            <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 22 }}>
              節目開播時會出現在這裡；後台把節目標記為「直播中」即可上架。
            </p>
            <Link href="/programs" className="btn btn-brand">
              看看有哪些沉浸節目 →
            </Link>
          </div>
        ) : (
          <div className="grid g4">
            {lives.map((l) => {
              const inner = (
                <>
                  <div
                    className="prog-thumb fitimg"
                    style={{
                      aspectRatio: "3/4",
                      backgroundImage: l.img ? `url("${l.img}")` : undefined,
                    }}
                  >
                    <div className="lb">
                      <span className="pulse" />
                      LIVE
                    </div>
                  </div>
                  <div className="prog-body">
                    <h4>{l.title}</h4>
                    {l.intro && <div className="tags">{l.intro}</div>}
                    <div className="row">
                      <span className="chip">{l.name}</span>
                      <span className="add">進入 →</span>
                    </div>
                  </div>
                </>
              );
              return l.url ? (
                <a
                  key={l.name}
                  className="card"
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {inner}
                </a>
              ) : (
                <Link key={l.name} className="card" href={`/programs/${l.slug}`}>
                  {inner}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
