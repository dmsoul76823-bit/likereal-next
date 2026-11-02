import "../wv.css";
import { getWvSettings } from "@/lib/wv";
import { MARQUEE_DEFAULT } from "@/lib/wv-cms";
import Header from "@/components/wv/Header";
import Marquee from "@/components/wv/Marquee";
import Footer from "@/components/wv/Footer";
import Tilt from "@/components/wv/Tilt";

export const revalidate = 300;

export default async function WonderVLayout({ children }) {
  const s = await getWvSettings();
  const marquee = typeof s.marquee === "string" ? s.marquee : MARQUEE_DEFAULT;

  return (
    <div className="wv-root">
      <Header />
      <Marquee text={marquee} />
      <main>{children}</main>
      <Footer />
      <Tilt />
    </div>
  );
}
