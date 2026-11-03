import { getSiteSeo } from "@/lib/seo";
import Script from "next/script";
import { MemberProvider } from "@/components/MemberContext";
import Tracking from "@/components/Tracking";
import RefCapture from "@/components/RefCapture";
import { Suspense } from "react";
import "./globals.css";

export async function generateMetadata() {
  const s = await getSiteSeo();
  const title = s.site_title || "Wonder V｜沉浸式場域娛樂平台";
  const desc =
    s.site_desc ||
    "360° 全息舞台、裸視 3D 觀看與場域限定票券，Wonder V 沉浸式場域。";
  const base = s.site_url;
  const img = s.og_image || `${base}/og-default.png`;

  return {
    metadataBase: new URL(base),
    title: { default: title, template: `%s｜${s.site_name || "Wonder V"}` },
    description: desc,
    keywords: s.site_keywords?.split(",").map((k) => k.trim()),
    openGraph: {
      title,
      description: desc,
      url: base,
      siteName: s.site_name || "Wonder V",
      images: [{ url: img, width: 1200, height: 630 }],
      locale: "zh_TW",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [img],
    },
    robots: { index: true, follow: true },
    verification: s.gsc_token ? { google: s.gsc_token } : undefined,
    // 這裡「不」設 canonical。全域設一個值的話，每一頁都會繼承成首頁，
    // 等於告訴 Google「所有頁面都是首頁的重複內容」，
    // 會跟 sitemap 的 73 個網址直接打架。canonical 由各頁自己宣告。
  };
}

export default async function RootLayout({ children }) {
  const s = await getSiteSeo();

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: s.site_name || "Wonder V",
    url: s.site_url,
    description: s.site_desc,
  };

  return (
    <html lang="zh-TW">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body>
        <Tracking metaPixelId={s.meta_pixel_id} lineTagId={s.line_tag_id} />
        <Suspense fallback={null}>
          <RefCapture />
        </Suspense>
        <MemberProvider>{children}</MemberProvider>
        {s.ga_id && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${s.ga_id}`}
              strategy="afterInteractive"
            />
            <Script id="ga" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];
              function gtag(){dataLayer.push(arguments);}
              gtag('js',new Date());
              gtag('config','${s.ga_id}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
