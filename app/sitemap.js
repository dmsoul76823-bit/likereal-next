import { SITE_URL } from "@/lib/supabase";
import { getAllProgramNames } from "@/lib/wv";

export default async function sitemap() {
  const base = SITE_URL || "https://likereal-next.vercel.app";
  const now = new Date();

  const names = await getAllProgramNames();

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/programs`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ...names.map((name) => ({
      url: `${base}/programs/${encodeURIComponent(name)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    })),
  ];
}
