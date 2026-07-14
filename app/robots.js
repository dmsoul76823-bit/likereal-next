import { SITE_URL } from "@/lib/supabase";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/events/*/buy"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
