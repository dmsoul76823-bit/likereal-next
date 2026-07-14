import { getEvent, getEvents, getSettings, SITE_URL } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { catLabel } from "@/lib/theme";
import EventClient from "./EventClient";

export const revalidate = 60;

// 預先產生所有活動頁（讓爬蟲直接拿到靜態 HTML）
export async function generateStaticParams() {
  const events = await getEvents();
  return events.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const ev = await getEvent(slug);
  if (!ev) return { title: "找不到活動" };

  const s = await getSettings();
  const title = ev.seo_title || `${ev.title}｜${ev.subtitle || ""}`;
  const desc =
    ev.seo_desc ||
    ev.description?.slice(0, 120).replace(/\n/g, " ") ||
    s.site_desc;
  const img = ev.seo_image || ev.cover_image || s.og_image;
  const url = `${SITE_URL}/events/${ev.slug}`;

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      url,
      siteName: s.site_name || "Like Real",
      images: img ? [{ url: img, width: 1200, height: 630 }] : [],
      locale: "zh_TW",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: img ? [img] : [],
    },
    alternates: { canonical: url },
  };
}

export default async function EventPage({ params }) {
  const { slug } = await params;
  const ev = await getEvent(slug);
  if (!ev || ev.status !== "published") notFound();

  const lowest = ev.tickets?.length
    ? Math.min(...ev.tickets.map((t) => t.price))
    : 0;

  // Google 活動結構化資料 — 搜尋結果會顯示日期、地點、票價
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: ev.title,
    description: ev.description?.replace(/\n/g, " "),
    image: ev.cover_image ? [ev.cover_image] : [],
    startDate: ev.sale_start,
    endDate: ev.sale_end,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: ev.venue,
      address: {
        "@type": "PostalAddress",
        streetAddress: ev.address,
        addressCountry: "TW",
      },
    },
    organizer: {
      "@type": "Organization",
      name: "Like Real",
      url: SITE_URL,
    },
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/events/${ev.slug}`,
      price: lowest,
      priceCurrency: "TWD",
      availability: "https://schema.org/InStock",
      validFrom: ev.sale_start,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <EventClient event={ev} catLabel={catLabel(ev.category)} />
    </>
  );
}
