"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { NAV, ROLE, toMe } from "@/lib/admin";

import Dashboard from "./tabs/Dashboard";
import Orders from "./tabs/Orders";
import CheckIn from "./tabs/CheckIn";
import Events from "./tabs/Events";
import Products from "./tabs/Products";
import Creators from "./tabs/Creators";
import Staff from "./tabs/Staff";
import Settings from "./tabs/Settings";
import HomeLayout from "./tabs/HomeLayout";
import Placeholder from "./tabs/Placeholder";

const TABS = {
  dash: Dashboard,
  orders: Orders,
  checkin: CheckIn,
  events: Events,
  products: Products,
  creators: Creators,
  staff: Staff,
  settings: Settings,
  home: HomeLayout,
};

export default function AdminShell() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dash");
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState("");

  const flash = useCallback((t) => {
    setToast(t);
    setTimeout(() => setToast(""), 2800);
  }, []);

  // 已登入就直接進來
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!uid) {
        if (alive) setLoading(false);
        return;
      }
      const { data: row } = await supabase.from("staff").select("*").eq("id", uid).maybeSingle();
      if (!alive) return;
      if (row) {
        const m = toMe(row);
        setMe(m);
        setTab(m.perms[0] || "dash");
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    setMe(null);
  }

  if (loading) {
    return (
      <div className="login">
        <div className="login-card" style={{ textAlign: "center" }}>
          <div className="sub" style={{ margin: 0 }}>載入中…</div>
        </div>
      </div>
    );
  }

  if (!me) return <Login onIn={(m) => { setMe(m); setTab(m.perms[0] || "dash"); }} />;

  const nav = NAV.filter((n) => me.perms.includes(n.k));
  const cur = nav.find((n) => n.k === tab) || nav[0] || NAV[0];
  const Active = TABS[cur.k] || Placeholder;

  return (
    <div className="shell on">
      <div className="mobbar">
        <button className="mb-burger" onClick={() => setDrawer(true)} aria-label="選單">
          ☰
        </button>
        <div className="mb-title">Wonder V 後台</div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>{cur.t}</div>
      </div>

      <div className={`side-mask${drawer ? " on" : ""}`} onClick={() => setDrawer(false)} />

      <aside className={`side${drawer ? " open" : ""}`}>
        <div className="brand">
          <div className="mark">W</div>
          <h1 className="serif">Wonder V</h1>
        </div>

        <div>
          {nav.map((n) => (
            <div
              key={n.k}
              className={`nav-i${n.k === cur.k ? " on" : ""}`}
              onClick={() => {
                setTab(n.k);
                setDrawer(false);
              }}
            >
              <span className="ic">{n.i}</span>
              {n.t}
            </div>
          ))}
        </div>

        <div className="sp" />
        <div className="who">
          <div className="n">{me.name || me.email}</div>
          <div className="r">
            {ROLE[me.role] || me.role} · {me.email}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={logout} style={{ marginTop: 10 }}>
            登出
          </button>
        </div>
      </aside>

      <main>
        <div className="top">
          <div>
            <h2>{cur.t}</h2>
            <div className="d">{cur.d}</div>
          </div>
        </div>

        <section className="page on">
          <Active me={me} flash={flash} tab={cur} />
        </section>
      </main>

      {toast && <div className="toast on">{toast}</div>}
    </div>
  );
}

function Login({ onIn }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function go() {
    if (!email.trim() || !pass) {
      setErr("請輸入帳號與密碼");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: pass,
      });
      if (error) throw new Error("帳號或密碼錯誤");

      const { data: row, error: e2 } = await supabase
        .from("staff")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();
      if (e2) throw e2;
      if (!row) {
        await supabase.auth.signOut();
        throw new Error("此帳號不在後台人員名單中");
      }
      onIn(toMe(row));
    } catch (e) {
      setErr(e?.message || "登入失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="login-card">
        <div className="brand">
          <div className="mark">W</div>
          <h1 className="serif">Wonder V</h1>
        </div>
        <div className="sub">沉浸式場域 · 後台管理系統</div>

        <div className="fld">
          <label>電子信箱</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && go()}
            autoComplete="username"
          />
        </div>
        <div className="fld">
          <label>密碼</label>
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && go()}
            autoComplete="current-password"
          />
        </div>

        {err && (
          <div style={{ color: "var(--err)", fontSize: 13, marginBottom: 12 }}>{err}</div>
        )}

        <button className="btn btn-brand" style={{ width: "100%" }} onClick={go} disabled={busy}>
          {busy ? "登入中…" : "登入後台"}
        </button>

        <div className="demo">
          <p>登入說明</p>
          <div className="demo-row" style={{ cursor: "default" }}>
            <b>用 Supabase 帳號</b>
            <span className="r">Authentication → Users</span>
          </div>
          <div className="demo-row" style={{ cursor: "default" }}>
            <b>需在 staff 名單內</b>
            <span className="r">否則無法進入</span>
          </div>
        </div>
      </div>
    </div>
  );
}
