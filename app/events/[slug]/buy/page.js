import { getEvent } from "@/lib/supabase";
import { notFound } from "next/navigation";
import BuyClient from "./BuyClient";

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const ev = await getEvent(slug);
  return {
    title: ev ? `購票 — ${ev.title}` : "購票",
    robots: { index: false, follow: false },
  };
}

export default async function BuyPage({ params }) {
  const { slug } = await params;
  const ev = await getEvent(slug);
  if (!ev || ev.status !== "published") notFound();
  return <BuyClient event={ev} />;
}
