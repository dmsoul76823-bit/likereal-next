import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getProgram,
  getAllProgramNames,
  getVenues,
  fromSlug,
  parseDate,
} from "@/lib/wv";
import MediaHero from "@/components/wv/MediaHero";
import SessionList from "@/components/wv/SessionList";

export const revalidate = 300;

export async function generateStaticParams() {
  const names = await getAllProgramNames();
  return names.map((name) => ({ name: encodeURIComponent(name) }));
}

export async function generateMetadata({ params }) {
  const { name: raw } = await params;
  const name = fromSlug(raw);
  const program = await getProgram(name);
  if (!program) return { title: "找不到這個節目" };

  const desc = (
    program.intro ||
    `${program.name} － Wonder V 沉浸式場域演出，共 ${program.sessions.length} 個場次。`
  )
    .replace(/\s+/g, " ")
    .slice(0, 155);

  return {
    title: program.name,
    description: desc,
    // 用 raw（網址裡的原字串）而不是 name，才會跟實際網址一致
    alternates: { canonical: `/programs/${raw}` },
    openGraph: {
      title: `${program.name}｜Wonder V`,
      description: desc,
      type: "website",
      images: program.img && program.img.startsWith("http") ? [program.img] : undefined,
    },
  };
}

export default async function ProgramDetail({ params }) {
  const { name: raw } = await params;
  const name = fromSlug(raw);
  const [program, venues] = await Promise.all([getProgram(name), getVenues()]);
  if (!program) notFound();

  const first = program.sessions[0];
  const last = program.sessions[program.sessions.length - 1];
  const fd = parseDate(first?.date);
  const ld = parseDate(last?.date);
  const period =
    fd && ld
      ? fd.y === ld.y && fd.m === ld.m && fd.d === ld.d
        ? `${fd.y}/${fd.m}/${fd.d}`
        : `${fd.y}/${fd.m}/${fd.d} ~ ${ld.y}/${ld.m}/${ld.d}`
      : "—";

  const jsonLd = program.sessions.slice(0, 50).map((s) => ({
    "@context": "https://schema.org",
    "@type": "Event",
    name: program.name,
    startDate: s.time ? `${s.date}T${s.time}:00+08:00` : s.date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: s.venue || program.venue || "WonderV 展演場",
      address: { "@type": "PostalAddress", addressCountry: "TW" },
    },
    description: program.intro || undefined,
    image: program.img && program.img.startsWith("http") ? [program.img] : undefined,
    offers:
      s.price > 0
        ? {
            "@type": "Offer",
            price: s.price,
            priceCurrency: "TWD",
            availability:
              s.cap > 0 && s.left <= 0
                ? "https://schema.org/SoldOut"
                : "https://schema.org/InStock",
          }
        : undefined,
    organizer: { "@type": "Organization", name: "Wonder V" },
  }));

  const intro =
    program.intro ||
    "Wonder V 沉浸式場域演出，結合 LED 背景屏、巨型 Dome 投影與空間音訊，帶來身歷其境的觀賞體驗。";

  return (
    <div className="wrap">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link href="/programs" className="backlink">
        ← 返回節目總覽
      </Link>

      <MediaHero
        img={program.img}
        ytId={program.ytId}
        videoUrl={program.videoUrl}
        isLive={program.isLive}
        liveUrl={program.liveUrl}
        liveTitle={program.liveTitle}
        title={program.name}
        chips={[program.cat, program.venue]}
      />

      <div className="ev-grid">
        {/* 左欄 */}
        <div>
          <div className="ev-box">
            <h3>節目介紹</h3>
            {intro.split(/\n+/).filter(Boolean).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          <div className="ev-box" id="sessRows">
            <h3>選擇場次</h3>
            <SessionList
              sessions={program.sessions}
              venues={venues}
              programName={program.name}
            />
          </div>

          <div className="ev-box">
            <h3>注意事項</h3>
            <ol>
              <li>請於開演前 30 分鐘抵達，並出示電子票券 QR Code 入場。</li>
              <li>演出開始後恕不得中途入場，請準時到場。</li>
              <li>場內全程禁止錄影、錄音與閃光燈拍攝。</li>
              <li>每張票券僅限一人使用，掃描後即失效。</li>
              <li>沉浸式演出含強光與環繞音效，光敏感體質或孕婦請斟酌入場。</li>
              <li>主辦單位保留節目內容與演出人員異動之權利。</li>
            </ol>
          </div>

          <div className="ev-box">
            <h3>退票規則</h3>
            <ol>
              <li>演出日 10 日前申請退票，退還票面金額 90%。</li>
              <li>演出日 10 日內恕不接受退票或換場次。</li>
              <li>因不可抗力因素取消演出，將全額退款。</li>
              <li>退票申請請來信客服信箱，並附訂單編號。</li>
            </ol>
          </div>
        </div>

        {/* 右欄 */}
        <div>
          <div className="ev-box">
            <h3>演出資訊</h3>
            <dl className="ev-info">
              <dt>節目</dt>
              <dd>{program.name}</dd>
              <dt>類型</dt>
              <dd>{program.cat || "—"}</dd>
              <dt>場地</dt>
              <dd>{program.venues?.length ? program.venues.join("、") : "—"}</dd>
              <dt>場次</dt>
              <dd>{program.sessions.length} 場</dd>
              <dt>期間</dt>
              <dd>{period}</dd>
              <dt>票價</dt>
              <dd>
                {program.lowestPrice > 0
                  ? `NT$${program.lowestPrice.toLocaleString()} 起`
                  : "—"}
              </dd>
            </dl>
          </div>

          <div className="ev-box">
            <h3>購票方式</h3>
            <p>
              於左側場次列表點選「選位購票」，在座位圖上挑選座位後結帳，
              系統會立即產生電子票券 QR Code。
            </p>
            <a
              className="btn btn-brand"
              style={{ width: "100%", textAlign: "center", marginTop: 6, display: "block" }}
              href="#sessRows"
            >
              前往選擇場次
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
