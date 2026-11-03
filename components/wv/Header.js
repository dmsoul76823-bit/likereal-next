import Link from "next/link";

const NAV = [
  { href: "/programs", label: "沉浸節目" },
  { href: "/#sessions", label: "場域售票" },
  { href: "/mypass", label: "我的票券" },
  { href: "/shop", label: "3D 精選" },
  { href: "/vip", label: "會員儲值" },
  { href: "/dining", label: "沉浸餐飲" },
  { href: "/about", label: "關於" },
];

export default function Header() {
  return (
    <header>
      <div className="wrap nav">
        <Link href="/" aria-label="Wonder V 首頁">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo-img" src="/logo-wonderv.png" alt="Wonder V" />
        </Link>
        <nav>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="spacer" />
        <span className="vip">IMMERSIVE VENUE</span>
      </div>
    </header>
  );
}
