import Link from "next/link";
import { getVenues } from "@/lib/wv";
import MyPass from "@/components/wv/MyPass";

export const metadata = {
  alternates: { canonical: "/mypass" },
  title: "我的票券",
  description: "查詢 Wonder V 電子票券、出示入場 QR Code，或辦理換位／升級。",
  robots: { index: false, follow: false },
};

export default async function MyPassPage() {
  const venues = await getVenues();

  return (
    <section>
      <div className="wrap">
        <Link className="backlink" href="/#sessions">
          ← 回場域售票
        </Link>

        <div className="sec-head" style={{ marginBottom: 10 }}>
          <div>
            <h2 className="serif">我的票券</h2>
            <p>查詢電子票券、出示 QR Code，或辦理換位／升級</p>
          </div>
        </div>

        <MyPass venues={venues} />
      </div>
    </section>
  );
}
