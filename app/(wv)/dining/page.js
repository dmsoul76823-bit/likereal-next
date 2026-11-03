import Link from "next/link";
import { getWvImages, resolveImg } from "@/lib/wv";

export const revalidate = 300;

export const metadata = {
  title: "沉浸餐飲",
  description:
    "餐飲是表演情緒的延伸。Wonder V 每一檔演出都有專屬的餐點與調飲，讓味覺成為記憶的一部分。",
};

const PAIRS = [
  ["✦", "太空主題展演", "星空雞尾酒 / 銀河甜點"],
  ["♪", "音樂祭", "音樂主題調酒，例：藍色愛琴海"],
  ["◲", "音樂劇", "搭配劇情設計限定套餐，例：《貓》"],
  ["✧", "動漫主題", "IP 主題餐點，例：間諜家家酒"],
  ["★", "明星藝人", "明星藝人最愛的食物，例：韓國藝人 & 辣炒年糕"],
];

const FOOD_FEATS = [
  ["中央廚房", "集中製作、品質穩定"],
  ["快速出餐", "現場覆熱不誤場"],
  ["點心櫃", "陳列自由取用"],
  ["主題限定", "依演出設計菜單"],
];

const SIGNATURE = [
  ["dine_s1", "茶 + 咖啡", "以茶為基底，融合咖啡豆香氣，創造層次豐富的日常飲品"],
  ["dine_s2", "茶 + Cocktail", "茶調飲結合調酒手法，打造具戲劇感的限定特調"],
  ["dine_s3", "異國飲品", "例：曼谷風格飲品，帶來跨文化的味覺驚喜"],
];

export default async function DiningPage() {
  const images = await getWvImages();
  const bg = (k) => {
    const src = resolveImg(images?.[k]);
    return src ? { backgroundImage: `url("${src}")` } : undefined;
  };

  return (
    <section>
      <div className="wrap">
        <div className="dine-hero">
          <span className="about-chip">沉浸餐飲</span>
          <h2 className="serif">
            不是「去吃飯順便看展」
            <br />
            <span className="brand-text">而是進入一個完整的世界</span>
          </h2>
          <p>餐飲是表演情緒的延伸。每一檔演出都有專屬的餐點與調飲，讓味覺成為記憶的一部分。</p>
        </div>

        <div className="dine-block">
          <div className="sec-head">
            <div>
              <span className="tag">PAIRING · 主題搭配</span>
              <h2 className="serif">演出 × 餐飲</h2>
            </div>
          </div>
          <div className="pair-list">
            {PAIRS.map(([icon, left, right]) => (
              <div className="pair" key={left}>
                <div className="pl">
                  <span className="pic">{icon}</span>
                  <b>{left}</b>
                </div>
                <div className="pr">{right}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="dine-block">
          <div className="dine-split">
            <div className="dine-pic" style={bg("dine_food")} />
            <div className="dine-txt">
              <div className="sec-head">
                <div>
                  <span className="tag">CUISINE · 料理風格</span>
                  <h2 className="serif">好吃、簡單、快速</h2>
                </div>
              </div>
              <p>餐點以中央廚房集中製作，現場覆熱，出餐快速且穩定。</p>
              <p>餐點口味延伸表演氛圍下的味覺記憶點。</p>
              <div className="about-feats">
                {FOOD_FEATS.map(([b, s]) => (
                  <div className="af" key={b}>
                    <b>{b}</b>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="dine-block">
          <div className="dine-split rev">
            <div className="dine-pic" style={bg("dine_drink")} />
            <div className="dine-txt">
              <div className="sec-head">
                <div>
                  <span className="tag">BAR · 飲品種類</span>
                  <h2 className="serif">咖啡、調酒、有機茶飲</h2>
                </div>
              </div>
              <p>吧台除提供咖啡、酒精飲品之外，另備有機茶、氣泡飲等無酒精選項。</p>
              <p>融入 Tea Bar 概念，兼顧多元客群的飲品需求。</p>
              <div className="drink-tags">
                <span>☕ 咖啡</span>
                <span>🍸 酒精飲品</span>
                <span>🍵 有機茶</span>
                <span>🫧 氣泡飲</span>
              </div>
            </div>
          </div>
        </div>

        <div className="dine-block">
          <div className="sec-head">
            <div>
              <span className="tag">SIGNATURE · 飲品特色</span>
              <h2 className="serif">延伸表演情緒的味覺體驗</h2>
            </div>
          </div>
          <div className="hg hg-3">
            {SIGNATURE.map(([key, title, body]) => (
              <div className="dcard" key={title}>
                <div className="dc-pic" style={bg(key)} />
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="cta" style={{ justifyContent: "center", marginTop: 34 }}>
          <Link className="btn btn-brand" href="/#sessions">
            🎟️ 看看有什麼演出
          </Link>
          <Link className="btn btn-ghost" href="/about">
            關於 Wonder V
          </Link>
        </div>
      </div>
    </section>
  );
}
