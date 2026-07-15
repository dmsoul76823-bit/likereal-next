import { getSettings, SITE_URL } from "@/lib/supabase";
import Script from "next/script";
import { MemberProvider } from "@/components/MemberContext";
import "./globals.css";

export async function generateMetadata() {
  const s = await getSettings();
  const title = s.site_title || "Like Real｜虛擬與現實整合劇場";
  const desc =
    s.site_desc ||
    "沉浸式裝置展與虛實共演劇場，探索光、聲音與空間的邊界。";
  const img = s.og_image || `${SITE_URL}/og-default.png`;

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s｜${s.site_name || "Like Real"}` },
    description: desc,
    keywords: s.site_keywords?.split(",").map((k) => k.trim()),
    openGraph: {
      title,
      description: desc,
      url: SITE_URL,
      siteName: s.site_name || "Like Real",
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
    alternates: { canonical: SITE_URL },
  };
}

export default async function RootLayout({ children }) {
  const s = await getSettings();

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: s.site_name || "Like Real",
    url: SITE_URL,
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
