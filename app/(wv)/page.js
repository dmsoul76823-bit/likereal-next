import Link from "next/link";
import {
  getFeaturedPrograms,
  getPrograms,
  getProducts,
  getWvSettings,
  parseDate,
} from "@/lib/wv";
import {
  ANNOUNCEMENTS_DEFAULT,
  BANNERS_DEFAULT,
  HOME_LAYOUT_DEFAULT,
  PROMOS_DEFAULT,
  PLANS,
  orderPick,
  takeN,
} from "@/lib/wv-cms";
import ProgramCard from "@/components/wv/ProgramCard";
import Stage from "@/components/wv/Stage";
import HomeBanner from "@/components/wv/HomeBanner";
import Announcements from "@/components/wv/Announcements";
import PromoRow from "@/components/wv/PromoRow";
import ProductCard from "@/components/wv/ProductCard";
import PlanCard from "@/components/wv/PlanCard";

export const revalidate = 300;

export const metadata = {
  alternates: { canonical: "/" },
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
  const [featured, all, products, settings] = await Promise.all([
    getFeaturedPrograms(8),
    getPrograms(),
    getProducts(),
    getWvSettings(),
  ]);

  // 後台「首頁版面」設定每區顯示幾筆，以及要把哪幾個排前面
  const L = { ...HOME_LAYOUT_DEFAULT, ...(settings.home_layout || {}) };
  const pick = settings.home_pick || {};

  const announcements = Array.isArray(settings.announcements)
    ? settings.announcements
    : ANNOUNCEMENTS_DEFAULT;
  const banners = Array.isArray(settings.banners) ? settings.banners : BANNERS_DEFAULT;
  const promos = Array.isArray(settings.promos) ? settings.promos : PROMOS_DEFAULT;

  const hero = featured[0] || null;
  const progRow = takeN(featured.slice(1), L.programs);

  const byDate = all
    .filter((p) => p.firstDate)
    .sort((a, b) => String(a.firstDate).localeCompare(String(b.firstDate)));
  const ticketRow = takeN(orderPick(byDate, pick.tickets, (p) => p.name), L.tickets);

  const shopRow = takeN(orderPick(products, pick.products, (p) => p.name), L.products);
  const planRow = takeN(PLANS, L.plans);

  const totalSessions = all.reduce((s, p) => s + (p.sessionCount || 0), 0);

  return (
    <>
      <div className="wrap">
        <HomeBanner pos="頂部" banners={banners} />
      </div>

      <div className="wrap">
        <Announcements items={announcements} />
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
              <Link href="/tickets" className="more">
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

      {/* 直播與 AI 夥伴 */}
      {promos.filter((p) => p && p.on !== false).length > 0 && (
        <section className="hsec">
          <div className="wrap">
            <div className="sec-head">
              <div>
                <span className="tag">
                  {settings.promos_head?.tag || "EXPERIENCE · 延伸體驗"}
                </span>
                <h2 className="serif">
                  {settings.promos_head?.title || "直播與 AI 夥伴"}
                </h2>
              </div>
            </div>
            <PromoRow promos={promos} />
          </div>
        </section>
      )}

      {/* 裸視 3D 精選 */}
      {shopRow.length > 0 && (
        <section className="hsec">
          <div className="wrap">
            <div className="sec-head">
              <div>
                <span className="tag">3D GEAR · 沉浸觀看裝備</span>
                <h2 className="serif">裸視 3D 精選</h2>
              </div>
              <Link href="/shop" className="more">
                觀看更多 →
              </Link>
            </div>
            <div className="hg hg-4">
              {shopRow.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 儲值方案 */}
      {planRow.length > 0 && (
        <section className="hsec">
          <div className="wrap">
            <div className="sec-head">
              <div>
                <span className="tag">MEMBERSHIP · 會員儲值</span>
                <h2 className="serif">儲值方案</h2>
              </div>
              <Link href="/vip" className="more">
                全部方案 →
              </Link>
            </div>
            <div className="hg hg-2">
              {planRow.map((p) => (
                <PlanCard key={p.n} plan={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="wrap" style={{ paddingTop: 8 }}>
        <HomeBanner pos="底部" banners={banners} />
      </div>
    </>
  );
}
