import Link from "next/link";
import { getWvImages, resolveImg } from "@/lib/wv";

export const revalidate = 300;

export const metadata = {
  title: "關於 Wonder V",
  description:
    "Wonder V 為台灣領先的沉浸式場域品牌，擁有 LED 背景屏、巨型 Dome 結合投影與空間音訊，打造 AI 娛樂展演新天地。",
};

const FEATS = [
  ["LED 背景屏", "高解析沉浸視覺"],
  ["巨型 Dome", "穹頂投影包覆"],
  ["空間音訊", "360° 環繞聲場"],
  ["AI 娛樂展演", "虛實整合演出"],
];

export default async function AboutPage() {
  const images = await getWvImages();
  const pic = resolveImg(images?.about) || resolveImg(images?.hero) || null;

  return (
    <section>
      <div className="wrap">
        <div className="about-wrap">
          <div className="about-txt">
            <span className="about-chip">關於 Wonder V</span>
            <h2 className="serif">
              沉浸式場域
              <br />
              <span className="brand-text">虛實整合劇場</span>
            </h2>
            <p>
              Wonder V 為台灣領先的沉浸式場域品牌，擁有 LED 背景屏、巨型 Dome
              結合投影、空間音訊，打造 AI 娛樂展演新天地。
            </p>
            <p>為演唱會、劇場與表演增添更多的創意元素，讓觀眾由觀賞走向身歷其境的體驗。</p>

            <div className="about-feats">
              {FEATS.map(([b, s]) => (
                <div className="af" key={b}>
                  <b>{b}</b>
                  <span>{s}</span>
                </div>
              ))}
            </div>

            <div className="cta" style={{ marginTop: 28 }}>
              <Link className="btn btn-brand" href="/#sessions">
                🎟️ 馬上購票
              </Link>
              <Link className="btn btn-ghost" href="/programs">
                看沉浸節目
              </Link>
            </div>
          </div>

          <div
            className="about-pic"
            style={pic ? { backgroundImage: `url("${pic}")` } : undefined}
          />
        </div>

        <div className="philo">
          <div className="sec-head">
            <div>
              <span className="tag">BRAND PHILOSOPHY</span>
              <h2 className="serif">品牌理念</h2>
            </div>
          </div>

          <div className="philo-wrap">
            <div className="philo-txt">
              <p>在 Wonder V，這裡不只是一場表演。</p>
              <p>
                我們希望你可以放慢腳步，好好待在這裡。看一場演出、喝一杯酒、吃一頓飯，
                也和身邊的人分享此刻的感受。
              </p>
              <p>
                真正讓人記住的，往往不只是眼前看到了什麼，而是這天，你和誰一起來、吃了什麼、聊了什麼。
              </p>
              <p>
                因此，我們將餐飲結合於沉浸式體驗裡，讓每一次來到 Wonder V 的你／妳，
                不只是「看完就離開」，而是經歷了一段值得回味的時光。
              </p>
              <div className="slogan">
                <b>Like Real Vision, Life Real Taste.</b>
                <span>感官如真，美味入心。</span>
              </div>
            </div>

            <div className="philo-cards">
              <div className="pc">
                <div className="pi">🎭</div>
                <h3>沉浸式表演</h3>
                <p>讓觀眾走進場景氛圍，感受表演帶來的震撼與臨場感。</p>
              </div>
              <div className="pc">
                <div className="pi">🍽️</div>
                <h3>味覺體驗</h3>
                <p>餐飲成為表演情緒的延伸，讓演出活動成為值得細細品味的旅程。</p>
              </div>
              <Link className="pc pc-link" href="/dining">
                <div className="pi">🥂</div>
                <h3>沉浸餐飲</h3>
                <p>依演出主題設計的限定餐點與調飲 — 看看我們準備了什麼 →</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
