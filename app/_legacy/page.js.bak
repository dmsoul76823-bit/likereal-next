import { getEvents, getAnnouncements, getBanners, getSettings } from "@/lib/supabase";
import HomeClient from "./HomeClient";

export const revalidate = 60;

export default async function Home() {
  const [events, announcements, bannersTop, bannersBottom, settings] =
    await Promise.all([
      getEvents(),
      getAnnouncements(),
      getBanners("top"),
      getBanners("bottom"),
      getSettings(),
    ]);

  return (
    <HomeClient
      events={events}
      announcements={announcements}
      bannersTop={bannersTop}
      bannersBottom={bannersBottom}
      marquee={settings.marquee || []}
    />
  );
}
