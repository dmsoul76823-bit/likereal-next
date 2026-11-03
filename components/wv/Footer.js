import Link from "next/link";

export default function Footer() {
  return (
    <footer style={{ marginTop: 72, borderTop: "1px solid var(--line2)", padding: "34px 0 48px" }}>
      <div className="wrap" style={{ textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-wonderv.png"
          alt="Wonder V"
          style={{ height: 30, width: "auto", margin: "0 auto 12px", display: "block", opacity: 0.9 }}
        />
        <p style={{ marginBottom: 14 }}>360° 全息舞台 · 裸視 3D 觀看 · 沉浸式場域娛樂</p>
        <div className="cols">
          <Link href="/">首頁</Link>
          <Link href="/programs">沉浸節目</Link>
          <Link href="/live">直播大廳</Link>
          <Link href="/ai">AI 夥伴</Link>
          <Link href="/#sessions">場域售票</Link>
          <Link href="/mypass">我的票券</Link>
          <Link href="/shop">3D 精選</Link>
          <Link href="/vip">會員儲值</Link>
          <Link href="/dining">沉浸餐飲</Link>
          <Link href="/about">關於 Wonder V</Link>
        </div>
        <p style={{ fontSize: 12, opacity: 0.75, marginTop: 14 }}>
          © {new Date().getFullYear()} Wonder V · 沉浸式場域娛樂平台
        </p>
      </div>
    </footer>
  );
}
