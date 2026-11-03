import { getSiteSeo } from "@/lib/seo";

export default async function robots() {
  const { site_url } = await getSiteSeo();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 後台、會員私人頁面與分潤儀表板都不該被索引。
      // 原本還列了 /events/*/buy，那組路由已經移除。
      disallow: ["/admin", "/account", "/login", "/auth", "/partner"],
    },
    sitemap: `${site_url}/sitemap.xml`,
  };
}
