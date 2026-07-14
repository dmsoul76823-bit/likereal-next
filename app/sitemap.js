import { getEvents, SITE_URL } from "@/lib/supabase";

export default async function sitemap() {
  const events = await getEvents();

  const eventUrls = events.map((e) => ({
    url: `${SITE_URL}/events/${e.slug}`,
    lastModified: new Date(e.created_at),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...eventUrls,
  ];
}
