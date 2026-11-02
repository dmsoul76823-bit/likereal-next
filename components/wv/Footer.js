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
        <p style={{ fontSize: 12, opacity: 0.75 }}>
          © {new Date().getFullYear()} Wonder V 沉浸式場域
          <span style={{ margin: "0 10px", opacity: 0.4 }}>·</span>
          <Link href="/programs">節目總覽</Link>
        </p>
      </div>
    </footer>
  );
}
