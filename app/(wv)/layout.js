import "../wv.css";
import Header from "@/components/wv/Header";
import Marquee from "@/components/wv/Marquee";
import Footer from "@/components/wv/Footer";
import Tilt from "@/components/wv/Tilt";

export default function WonderVLayout({ children }) {
  return (
    <div className="wv-root">
      <Header />
      <Marquee />
      <main>{children}</main>
      <Footer />
      <Tilt />
    </div>
  );
}
