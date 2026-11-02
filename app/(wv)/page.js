import Link from "next/link";
import { getFeaturedPrograms, getPrograms, parseDate } from "@/lib/wv";
import ProgramCard from "@/components/wv/ProgramCard";
import Stage from "@/components/wv/Stage";
import HomeBanner from "@/components/wv/HomeBanner";
import Announcements from "@/components/wv/Announcements";

export const revalidate = 300;

export const metadata = {
  title: { absolute: "Wonder V｜沉浸式場域娛樂平台" },
  description:
    "360° 全息舞台、裸視 3D 觀看與場域限定票券。Wonder V 沉浸式場域，在同一個空間裡完整體驗虛實整合的演出。",
  openGraph: {
    title: "Wonder V｜沉浸式場域娛樂平台",
    description: "360° 全息舞台、裸視 3D 觀看與場域限定票券。",
    type: "website",
  },
};

export default async function WonderVHome() {
  const [featured, all] = await Promise.all([getFeaturedPrograms(7), getPrograms()]);

  const hero = featured[0] || null;
  const progRow = featured.slice(1, 7);

  const ticketRow = all
    .filter((p) => p.firstDate)
    .sort((a, b) => String(a.firstDate).localeCompare(String(b.firstDate)))
    .slice(0, 6);

  const totalSessions = all.reduce((s, p) => s + (p.sessionCount || 0), 0);

  return (
    <>
      <div className="wrap">
        <HomeBanner pos="頂部" />
      </div>

      <div className="wrap">
        <Announcements />
      </div>

      <Stage program={hero} programCount={all.length} sessionCount={totalSessions} />

      {/* 正在沉浸放送 */}
      {progRow.length > 0 && (
        <section className="hsec">
          <div className="wrap">
            <div className="sec-head">
              <div>
                <span className="tag">IMMERSIVE PROGRAMS · 沉浸節目</span>
                <h2 className="serif">正在沉浸放送</h2>
              </div>
              <Link href="/programs" className="more">
                全部節目 →
              </Link>
            </div>
            <div className="hg hg-3">
              {progRow.map((p) => (
                <ProgramCard key={p.name} program={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 現場沉浸門票 */}
      {ticketRow.length > 0 && (
        <section className="hsec" id="sessions" style={{ scrollMarginTop: 90 }}>
          <div className="wrap">
            <div className="sec-head">
              <div>
                <span className="tag">VENUE · 場域售票</span>
                <h2 className="serif">現場沉浸門票</h2>
              </div>
              <Link href="/programs" className="more">
                觀看更多 →
              </Link>
            </div>
            <div className="hg hg-3">
              {ticketRow.map((p) => {
                const d = parseDate(p.firstDate);
                return (
                  <Link key={p.name} href={`/programs/${p.slug}`} className="pgcard">
                    <div
                      className="pic"
                      style={p.img ? { backgroundImage: `url("${p.img}")` } : undefined}
                    >
                      {d && (
                        <span className="badge-n">
                          {d.m}/{d.d}（{d.weekday}）
                        </span>
                      )}
                      {p.isLive && <span className="live-tag sm">● LIVE</span>}
                    </div>
                    <div className="body">
                      <h4>{p.name}</h4>
                      <div className="meta">
                        📍 {p.venue || "Wonder V 沉浸式場域"}
                        {p.firstTime ? ` · ${p.firstTime}` : ""}
                      </div>
                      <div className="foot">
                        <div className="meta">{p.sessionCount} 個場次開放中</div>
                        <div className="pr" style={{ fontSize: 14 }}>
                          查看場次 →
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <div className="wrap" style={{ paddingTop: 8 }}>
        <HomeBanner pos="底部" />
      </div>

      {/* 直播與 AI 夥伴、裸視 3D 精選、儲值方案 —— 階段 3 搬入 */}
    </>
  );
}
