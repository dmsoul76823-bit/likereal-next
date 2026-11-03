"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useMember } from "@/components/MemberContext";
import { useFav } from "./FavContext";

const NAV = [
  { href: "/programs", label: "沉浸節目" },
  { href: "/tickets", label: "場域售票" },
  { href: "/mypass", label: "我的票券" },
  { href: "/shop", label: "3D 精選" },
  { href: "/vip", label: "會員儲值" },
  { href: "/dining", label: "沉浸餐飲" },
  { href: "/about", label: "關於" },
];

const MOBNAV = [
  { href: "/", label: "首頁" },
  ...NAV.slice(0, -1),
  { href: "/about", label: "關於 Wonder V" },
];

function initial(member, user) {
  const s = (member?.name || member?.email || user?.email || "").trim();
  return s ? s[0].toUpperCase() : "V";
}

export default function Header() {
  const pathname = usePathname();
  const { user, member, loading } = useMember() || {};
  const { count, setOpen, ready } = useFav();
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    setMenu(false);
  }, [pathname]);

  const isOn = (href) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  const wallet = Number(member?.wallet) || 0;
  const tier = member?.member_tiers?.name;

  return (
    <header>
      <div className="wrap nav">
        <Link href="/" aria-label="Wonder V 首頁">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo-img" src="/logo-wonderv.png" alt="Wonder V" />
        </Link>

        <nav>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={isOn(n.href) ? "on" : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="spacer" />

        <button
          type="button"
          className={`favtop${ready && count > 0 ? " has" : ""}`}
          title="我的收藏"
          aria-label="我的收藏"
          onClick={() => setOpen(true)}
        >
          ♡<span className="fc">{ready ? count : 0}</span>
        </button>

        {user ? (
          <>
            <Link className="wallet" href="/vip">
              💎 <b>{wallet.toLocaleString()}</b> 幣
            </Link>
            {tier && <span className="vip">{tier}</span>}
            <Link
              className="avatar"
              href="/account"
              title={member?.name || user.email || "我的帳戶"}
            >
              {initial(member, user)}
            </Link>
          </>
        ) : (
          !loading && (
            <Link className="wallet" href="/login">
              登入 / 註冊
            </Link>
          )
        )}

        <button
          type="button"
          className="burger"
          aria-label="選單"
          aria-expanded={menu}
          onClick={() => setMenu((v) => !v)}
        >
          {menu ? "✕" : "☰"}
        </button>
      </div>

      <div className={`mobnav${menu ? " open" : ""}`}>
        {MOBNAV.map((n) => (
          <Link key={n.href} href={n.href} className={isOn(n.href) ? "on" : undefined}>
            {n.label}
          </Link>
        ))}
        {user ? (
          <Link href="/account" className={isOn("/account") ? "on" : undefined}>
            我的帳戶（{wallet.toLocaleString()} 幣）
          </Link>
        ) : (
          <Link href="/login">登入 / 註冊</Link>
        )}
      </div>
    </header>
  );
}
