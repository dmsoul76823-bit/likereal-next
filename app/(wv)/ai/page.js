import Link from "next/link";
import { getCreators } from "@/lib/wv";
import FavHeart from "@/components/wv/FavHeart";

export const revalidate = 300;

const OM_URL = process.env.NEXT_PUBLIC_ONLYMATE_URL || "";

export const metadata = {
  alternates: { canonical: "/ai" },
  title: "AI 夥伴",
  description: "OnlyMate AI 夥伴：專屬 AI 分身，語音對話與即時互動。",
};

export default async function AiPage() {
  const creators = (await getCreators()).filter((c) => c.online);

  return (
    <section>
      <div className="wrap">
        <div className="sec-head">
          <div>
            <span className="tag">ONLYMATE · AI 夥伴</span>
            <h2 className="serif">精選創作者</h2>
          </div>
          {OM_URL && (
            <a className="more" href={OM_URL} target="_blank" rel="noopener noreferrer">
              進入 OnlyMate →
            </a>
          )}
        </div>

        <p style={{ color: "var(--muted)", margin: "-14px 0 24px", fontSize: "var(--fs-base)" }}>
          平台重點推薦的人氣創作者，每位都有獨特風格與完整 AI 分身體驗。
          {OM_URL ? "點卡片即進入 OnlyMate 角色頁。" : "OnlyMate 角色頁開通後即可直接點入。"}
        </p>

        <div className="om-grid">
          {creators.map((c) => {
            const feat = c.tier === "精選";
            const inner = (
              <>
                <div
                  className="om-photo fitimg"
                  style={c.img ? { backgroundImage: `url("${c.img}")` } : undefined}
                >
                  <div className="tl">
                    <span className={`om-tag ${feat ? "feat" : "new"}`}>
                      {feat ? "精選" : "NEW"}
                    </span>
                    <span className="om-tag type">{c.type}</span>
                  </div>
                  <FavHeart
                    k={`cr:${c.slug}`}
                    name={c.name}
                    sub={c.type || ""}
                    img={c.img}
                    go="/ai"
                  />
                  <div className={`om-status ${c.online ? "on" : "off"}`}>
                    <span className="d" />
                    {c.online ? "在線" : "離線"}
                  </div>
                </div>
                <div className="om-body">
                  <h4>{c.name}</h4>
                  <div className="desc">{c.desc}</div>
                  <div className="om-chips">
                    <span>{c.type}</span>
                  </div>
                  <div className="om-meta">
                    <span>{c.fans} 粉絲</span>
                    <span>
                      人氣 <b>{c.hot}</b>
                    </span>
                  </div>
                  {OM_URL && <div className="om-enter">查看角色 →</div>}
                </div>
              </>
            );
            return OM_URL ? (
              <a
                key={c.id}
                className="om-card"
                href={`${OM_URL.replace(/\/$/, "")}/character/${c.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`進入 ${c.name} 的 OnlyMate 角色頁`}
              >
                {inner}
              </a>
            ) : (
              <div key={c.id} className="om-card" style={{ cursor: "default" }}>
                {inner}
              </div>
            );
          })}
        </div>

        {!OM_URL && (
          <div className="mp-note" style={{ marginTop: 24 }}>
            OnlyMate 正式網址尚未設定，所以卡片暫時不可點。設定方式：在
            <code style={{ margin: "0 6px" }}>.env.local</code> 加一行
            <code style={{ margin: "0 6px" }}>NEXT_PUBLIC_ONLYMATE_URL=https://你的網址</code>
            ，Vercel 那邊也要加同一個環境變數。
          </div>
        )}

        <div className="cta" style={{ justifyContent: "center", marginTop: 34 }}>
          <Link className="btn btn-ghost" href="/programs">
            看沉浸節目
          </Link>
        </div>
      </div>
    </section>
  );
}
