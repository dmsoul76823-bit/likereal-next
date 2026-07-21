"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase, createStaffAccount } from "@/lib/supabase";
import { C, CATEGORIES } from "@/lib/theme";

const A = {
  bg: "#F4F6F9",
  surface: "#fff",
  border: "#E0E5EC",
  primary: "#0A0E14",
  accent: "#0066FF",
  accentL: "#EBF2FF",
  text: "#0A0E14",
  sub: "#5A6A7A",
  muted: "#9AAABB",
  red: "#FF3B30",
  yellow: "#FF9500",
  green: "#00C853",
};

const ROLE_LABEL = { admin: "管理者", editor: "編輯者", staff: "驗票員" };

// 所有可指派的權限模組
const ALL_PERMS = [
  { id: "dashboard", label: "儀表板" },
  { id: "analytics", label: "銷售分析" },
  { id: "events", label: "活動管理" },
  { id: "orders", label: "訂單查看" },
  { id: "members", label: "會員管理" },
  { id: "tiers", label: "等級設定" },
  { id: "refunds", label: "退票審核" },
  { id: "seo", label: "SEO 設定" },
  { id: "site", label: "場域設定" },
  { id: "scanner", label: "驗票入場" },
  { id: "affiliates", label: "分潤管理" },
  { id: "coupons", label: "優惠券" },
  { id: "staff", label: "帳號權限" },
];
const ROLE_PERMS = {
  admin: ["dashboard", "analytics", "events", "orders", "members", "tiers", "refunds", "seo", "site", "scanner", "affiliates", "coupons", "staff"],
  editor: ["dashboard", "analytics", "events", "orders", "members", "seo", "site"],
  staff: ["scanner", "orders"],
};

const SPEC = {
  cover: {
    size: "1200 × 675 px",
    ratio: "16:9",
    fmt: "JPG / WebP",
    weight: "建議 400 KB 以內",
    note: "活動封面，用於卡片、輪播、活動頁 Hero",
  },
  og: {
    size: "1200 × 630 px",
    ratio: "1.91:1",
    fmt: "JPG / PNG",
    weight: "建議 300 KB 以內",
    note: "社群分享預覽圖（Facebook、LINE）",
  },
  banner: {
    size: "1200 × 400 px",
    ratio: "3:1",
    fmt: "JPG / WebP",
    weight: "建議 500 KB 以內",
    note: "頂部橫幅。文字會壓在左半邊，主體請放右側",
  },
  bannerBottom: {
    size: "1200 × 300 px",
    ratio: "4:1",
    fmt: "JPG / WebP",
    weight: "建議 400 KB 以內",
    note: "底部橫幅。比頂部略矮，同樣文字壓左側",
  },
};

function Btn({ children, onClick, variant = "primary", small, disabled }) {
  const v = {
    primary: { background: A.primary, color: "#fff", border: "none" },
    accent: { background: A.accent, color: "#fff", border: "none" },
    ghost: {
      background: "none",
      color: A.text,
      border: `1px solid ${A.border}`,
    },
    danger: {
      background: "#FFF1F0",
      color: A.red,
      border: "1px solid #FFB3AD",
    },
  }[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...v,
        borderRadius: 3,
        padding: small ? "5px 10px" : "9px 16px",
        fontSize: small ? 11 : 13,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

function Field({ label, value, onChange, ph, type = "text", rows }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{ fontSize: 11, fontWeight: 600, color: A.sub, marginBottom: 4 }}
      >
        {label}
      </div>
      {rows ? (
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={ph}
          rows={rows}
          style={{
            width: "100%",
            padding: "9px 11px",
            border: `1px solid ${A.border}`,
            borderRadius: 3,
            fontSize: 13,
            outline: "none",
            resize: "vertical",
          }}
        />
      ) : (
        <input
          type={type}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={ph}
          style={{
            width: "100%",
            padding: "9px 11px",
            border: `1px solid ${A.border}`,
            borderRadius: 3,
            fontSize: 13,
            outline: "none",
          }}
        />
      )}
    </div>
  );
}

function SpecHint({ type }) {
  const s = SPEC[type];
  if (!s) return null;
  return (
    <div
      style={{
        background: A.accentL,
        border: `1px solid ${A.accent}30`,
        borderRadius: 3,
        padding: "9px 11px",
        marginBottom: 8,
        fontSize: 11,
        lineHeight: 1.7,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 2 }}>建議素材規格</div>
      <div>
        尺寸：<strong>{s.size}</strong>（比例 {s.ratio}）
      </div>
      <div>
        格式：<strong>{s.fmt}</strong> · {s.weight}
      </div>
      <div style={{ color: A.sub, marginTop: 2 }}>{s.note}</div>
    </div>
  );
}

function ImageField({ label, type, value, onChange, h = 110 }) {
  const [err, setErr] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{ fontSize: 11, fontWeight: 600, color: A.sub, marginBottom: 5 }}
      >
        {label}
      </div>
      <SpecHint type={type} />
      <input
        value={value || ""}
        onChange={(e) => {
          setErr(false);
          onChange(e.target.value);
        }}
        placeholder="貼上圖片網址（https://...）"
        style={{
          width: "100%",
          padding: "9px 11px",
          border: `1px solid ${A.border}`,
          borderRadius: 3,
          fontSize: 12,
          outline: "none",
          marginBottom: 7,
        }}
      />
      {value && !err && (
        <div
          style={{
            height: h,
            border: `1px solid ${A.border}`,
            borderRadius: 3,
            overflow: "hidden",
            background: "#0A0E14",
          }}
        >
          <img
            src={value}
            alt="預覽"
            onError={() => setErr(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}
      {value && err && (
        <div
          style={{
            padding: 10,
            background: "#FFF1F0",
            border: "1px solid #FFB3AD",
            borderRadius: 3,
            fontSize: 11,
            color: A.red,
          }}
        >
          圖片載入失敗，請確認網址正確且可公開存取
        </div>
      )}
      {!value && (
        <div
          style={{
            padding: 14,
            background: A.bg,
            border: `1px dashed ${A.border}`,
            borderRadius: 3,
            fontSize: 11,
            color: A.muted,
            textAlign: "center",
          }}
        >
          尚未設定圖片
        </div>
      )}
    </div>
  );
}

// ── SEO 即時預覽 ──
function SeoPreview({ title, desc, image, url }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: A.sub,
            marginBottom: 8,
          }}
        >
          Google 搜尋結果預覽
        </div>
        <div
          style={{
            background: "#fff",
            border: `1px solid ${A.border}`,
            borderRadius: 6,
            padding: 14,
          }}
        >
          <div style={{ fontSize: 12, color: "#202124", marginBottom: 3 }}>
            {url}
          </div>
          <div
            style={{
              fontSize: 18,
              color: "#1a0dab",
              marginBottom: 3,
              lineHeight: 1.3,
            }}
          >
            {(title || "（未設定標題）").slice(0, 60)}
          </div>
          <div style={{ fontSize: 13, color: "#4d5156", lineHeight: 1.5 }}>
            {(desc || "（未設定描述）").slice(0, 155)}
          </div>
        </div>
        <div style={{ fontSize: 10, color: A.muted, marginTop: 4 }}>
          標題建議 30–60 字元（目前 {title?.length || 0}）· 描述建議 80–155 字元（目前{" "}
          {desc?.length || 0}）
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: A.sub,
            marginBottom: 8,
          }}
        >
          Facebook / LINE 分享預覽
        </div>
        <div
          style={{
            background: "#fff",
            border: `1px solid ${A.border}`,
            borderRadius: 6,
            overflow: "hidden",
            maxWidth: 400,
          }}
        >
          <div style={{ height: 160, background: "#e4e6eb" }}>
            {image && (
              <img
                src={image}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
          </div>
          <div style={{ padding: 12, background: "#f0f2f5" }}>
            <div
              style={{
                fontSize: 11,
                color: "#65676b",
                textTransform: "uppercase",
                marginBottom: 3,
              }}
            >
              {url.replace(/^https?:\/\//, "").split("/")[0]}
            </div>
            <div
              style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}
            >
              {(title || "（未設定標題）").slice(0, 50)}
            </div>
            <div style={{ fontSize: 13, color: "#65676b" }}>
              {(desc || "").slice(0, 70)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
export default function Admin() {
  const [user, setUser] = useState(null);
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [navOpen, setNavOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loginErr, setLoginErr] = useState("");

  const [events, setEvents] = useState([]);
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState({});
  const [banners, setBanners] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [members, setMembers] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [affiliates, setAffiliates] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [editing, setEditing] = useState(null);
  const [saved, setSaved] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) loadStaff(data.session.user);
      else setLoading(false);
    });
  }, []);

  async function loadStaff(u) {
    const { data } = await supabase
      .from("staff")
      .select("*")
      .eq("id", u.id)
      .single();
    if (data?.is_active) {
      setUser(u);
      setStaff(data);
      const perms = data.role === "admin"
        ? ALL_PERMS.map((p) => p.id)
        : (data.permissions || ROLE_PERMS[data.role] || []);
      data._perms = perms;
      setPage(perms[0] || "dashboard");
      await loadAll();
    } else {
      setLoginErr("此帳號沒有後台權限");
      await supabase.auth.signOut();
    }
    setLoading(false);
  }

  async function loadAll() {
    const [e, o, s, b, a, m, t, rf, sf, af, cp] = await Promise.all([
      supabase.from("events").select("*, tickets(*)").order("sort_order"),
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("site_settings").select("*").eq("id", 1).single(),
      supabase.from("banners").select("*").order("sort_order"),
      supabase.from("announcements").select("*").order("sort_order"),
      supabase.from("members").select("*, member_tiers(name, color)").order("created_at", { ascending: false }),
      supabase.from("member_tiers").select("*").order("level"),
      supabase.from("refund_requests").select("*, orders(id, total, buyer_name, events(title))").order("requested_at", { ascending: false }),
      supabase.from("staff").select("*").order("created_at"),
      supabase.from("affiliates").select("*, affiliate_rules(*, events(title, slug))").order("created_at", { ascending: false }),
      supabase.from("coupons").select("*, events(title), affiliates(name, code)").order("created_at", { ascending: false }),
    ]);
    setEvents(e.data || []);
    setOrders(o.data || []);
    setSettings(s.data || {});
    setBanners(b.data || []);
    setAnnouncements(a.data || []);
    setMembers(m.data || []);
    setTiers(t.data || []);
    setRefunds(rf.data || []);
    setStaffList(sf.data || []);
    setAffiliates(af.data || []);
    setCoupons(cp.data || []);
  }

  async function login() {
    setLoginErr("");
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pw,
    });
    if (error) return setLoginErr("帳號或密碼錯誤");
    setLoading(true);
    await loadStaff(data.user);
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setStaff(null);
  }

  function flash(msg) {
    setSaved(msg);
    setTimeout(() => setSaved(""), 2500);
  }

  async function saveEvent(ev) {
    const { tickets, ...row } = ev;
    if (ev.id) {
      await supabase.from("events").update(row).eq("id", ev.id);
    } else {
      await supabase.from("events").insert(row);
    }
    setEditing(null);
    await loadAll();
    flash("活動已儲存");
  }

  async function delEvent(id) {
    if (!confirm("確定刪除這個活動？票種與相關資料會一併移除。")) return;
    await supabase.from("events").delete().eq("id", id);
    await loadAll();
    flash("活動已刪除");
  }

  async function saveSettings(s) {
    await supabase.from("site_settings").update(s).eq("id", 1);
    setSettings(s);
    flash("設定已儲存");
  }

  async function checkIn(orderId) {
    await supabase
      .from("orders")
      .update({ checked_in: true, checked_in_at: new Date().toISOString() })
      .eq("id", orderId);
    await loadAll();
  }

  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: A.muted,
        }}
      >
        載入中…
      </div>
    );

  if (!user)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: A.primary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 4,
            padding: 36,
            width: "100%",
            maxWidth: 360,
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              LIKE <span style={{ fontWeight: 200 }}>REAL</span>
            </div>
            <div style={{ fontSize: 10, color: A.muted, letterSpacing: 1 }}>
              後台管理系統
            </div>
          </div>
          <Field label="Email" value={email} onChange={setEmail} ph="you@example.com" />
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: A.sub,
                marginBottom: 4,
              }}
            >
              密碼
            </div>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: `1px solid ${A.border}`,
                borderRadius: 3,
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>
          {loginErr && (
            <div style={{ fontSize: 12, color: A.red, marginBottom: 10 }}>
              {loginErr}
            </div>
          )}
          <button
            onClick={login}
            style={{
              width: "100%",
              background: A.primary,
              color: "#fff",
              border: "none",
              borderRadius: 3,
              padding: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            登入
          </button>
          <Link
            href="/"
            style={{
              display: "block",
              textAlign: "center",
              marginTop: 14,
              fontSize: 11,
              color: A.muted,
            }}
          >
            ← 回到前台
          </Link>
        </div>
      </div>
    );

  const myPerms =
    staff.role === "admin"
      ? ALL_PERMS.map((p) => p.id)
      : staff._perms || staff.permissions || ROLE_PERMS[staff.role] || [];
  const NAV = [
    { id: "dashboard", label: "儀表板" },
    { id: "analytics", label: "銷售分析" },
    { id: "events", label: "活動管理" },
    { id: "orders", label: "訂單查看" },
    { id: "members", label: "會員管理" },
    { id: "tiers", label: "等級設定" },
    { id: "refunds", label: "退票審核" },
    { id: "seo", label: "SEO 設定" },
    { id: "site", label: "場域設定" },
    { id: "scanner", label: "驗票入場" },
    { id: "affiliates", label: "分潤管理" },
    { id: "coupons", label: "優惠券" },
    { id: "staff", label: "帳號權限" },
  ].filter((n) => myPerms.includes(n.id));

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: A.bg }}>
      {/* 手機頂欄 */}
      <div className="lr-admin-topbar">
        <button
          onClick={() => setNavOpen(true)}
          aria-label="開啟選單"
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            fontSize: 22,
            cursor: "pointer",
            padding: 4,
          }}
        >
          ☰
        </button>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
          LIKE <span style={{ fontWeight: 200 }}>REAL</span>
        </div>
        <div style={{ width: 30 }} />
      </div>

      {/* 手機遮罩 */}
      {navOpen && (
        <div
          className="lr-admin-overlay"
          onClick={() => setNavOpen(false)}
        />
      )}

      <aside
        className={navOpen ? "lr-admin-aside lr-admin-aside-open" : "lr-admin-aside"}
        style={{
          width: 200,
          background: A.primary,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          className="lr-admin-logo"
          style={{
            padding: "20px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
            LIKE <span style={{ fontWeight: 200 }}>REAL</span>
          </div>
          <div
            style={{
              fontSize: 9,
              color: "rgba(255,255,255,0.4)",
              letterSpacing: 1,
            }}
          >
            ADMIN
          </div>
        </div>
        <nav style={{ flex: 1, padding: "10px 8px" }}>
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => { setPage(n.id); setNavOpen(false); }}
              style={{
                width: "100%",
                padding: "11px 12px",
                border: "none",
                borderLeft: `3px solid ${
                  page === n.id ? A.accent : "transparent"
                }`,
                background:
                  page === n.id ? "rgba(0,102,255,0.2)" : "transparent",
                color: page === n.id ? "#fff" : "rgba(255,255,255,0.55)",
                fontSize: 13,
                fontWeight: page === n.id ? 700 : 400,
                textAlign: "left",
                cursor: "pointer",
                marginBottom: 2,
              }}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <div
          style={{
            padding: "14px 16px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
            {staff.name || staff.email}
          </div>
          <div style={{ fontSize: 10, color: A.accent, marginBottom: 8 }}>
            {ROLE_LABEL[staff.role]}
          </div>
          <button
            onClick={logout}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.4)",
              fontSize: 11,
              cursor: "pointer",
              padding: 0,
            }}
          >
            登出
          </button>
        </div>
      </aside>

      <main className="lr-admin-main" style={{ flex: 1, padding: 24, overflowY: "auto", maxHeight: "100vh" }}>
        {saved && (
          <div
            style={{
              position: "fixed",
              top: 20,
              right: 20,
              background: A.green,
              color: "#fff",
              padding: "10px 18px",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              zIndex: 300,
            }}
          >
            {saved}
          </div>
        )}

        {page === "dashboard" && (
          <Dashboard events={events} orders={orders} />
        )}
        {page === "events" && (
          <EventsPage
            events={events}
            onNew={() => setEditing({})}
            onEdit={setEditing}
            onDelete={delEvent}
          />
        )}
        {page === "orders" && <OrdersPage orders={orders} events={events} />}
        {page === "seo" && (
          <SeoPage settings={settings} events={events} onSave={saveSettings} />
        )}
        {page === "site" && (
          <SitePage
            settings={settings}
            banners={banners}
            announcements={announcements}
            onSave={saveSettings}
            reload={loadAll}
            flash={flash}
          />
        )}
        {page === "scanner" && (
          <ScannerPage orders={orders} events={events} onCheckIn={checkIn} />
        )}
        {page === "analytics" && (
          <AnalyticsPage orders={orders} events={events} />
        )}
        {page === "members" && (
          <MembersPage members={members} orders={orders} tiers={tiers} reload={loadAll} flash={flash} />
        )}
        {page === "tiers" && (
          <TiersPage tiers={tiers} reload={loadAll} flash={flash} />
        )}
        {page === "refunds" && (
          <RefundsPage refunds={refunds} reload={loadAll} flash={flash} staffId={staff.id} />
        )}
        {page === "staff" && (
          <StaffPage staffList={staffList} reload={loadAll} flash={flash} allPerms={ALL_PERMS} />
        )}
        {page === "coupons" && (
          <CouponsPage
            coupons={coupons}
            events={events}
            affiliates={affiliates}
            reload={loadAll}
            flash={flash}
          />
        )}
        {page === "affiliates" && (
          <AffiliatesPage
            affiliates={affiliates}
            events={events}
            orders={orders}
            reload={loadAll}
            flash={flash}
          />
        )}
      </main>

      {editing && (
        <EventForm
          init={editing}
          onSave={saveEvent}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ── 儀表板 ──
function Dashboard({ events, orders }) {
  const paid = orders.filter((o) => o.status === "paid");
  const revenue = paid.reduce((a, o) => a + o.total, 0);
  const stats = [
    { label: "活動總數", value: events.length, color: A.accent },
    { label: "訂單總數", value: orders.length, color: A.green },
    { label: "已入場", value: orders.filter((o) => o.checked_in).length, color: A.yellow },
    { label: "營收", value: `NT$${revenue.toLocaleString()}`, color: "#7C3AED" },
  ];
  return (
    <div>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>儀表板</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              background: A.surface,
              border: `1px solid ${A.border}`,
              borderRadius: 4,
              padding: 18,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: A.sub, marginTop: 3 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: A.sub, marginBottom: 10 }}>
        活動概況
      </div>
      {events.map((ev) => (
        <div
          key={ev.id}
          className="lr-admin-card"
          style={{
            background: A.surface,
            border: `1px solid ${A.border}`,
            borderRadius: 4,
            padding: 14,
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 3,
              overflow: "hidden",
              background: "#0A0E14",
              flexShrink: 0,
            }}
          >
            {ev.cover_image && (
              <img
                src={ev.cover_image}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{ev.title}</div>
            <div style={{ fontSize: 11, color: A.sub }}>
              {ev.date_text} · {ev.venue} · {ev.tickets?.length || 0} 種票
            </div>
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 9px",
              borderRadius: 20,
              background:
                ev.status === "published"
                  ? "#E8FFF0"
                  : ev.status === "draft"
                  ? "#FFF8E8"
                  : "#FFF1F0",
              color:
                ev.status === "published"
                  ? A.green
                  : ev.status === "draft"
                  ? A.yellow
                  : A.red,
            }}
          >
            {ev.status === "published"
              ? "已發布"
              : ev.status === "draft"
              ? "草稿"
              : "已截止"}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 活動管理 ──
function EventsPage({ events, onNew, onEdit, onDelete }) {
  return (
    <div>
      <div
        className="lr-admin-head"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>活動管理</h1>
        <Btn onClick={onNew}>＋ 新增活動</Btn>
      </div>
      {events.map((ev) => (
        <div
          key={ev.id}
          className="lr-admin-card"
          style={{
            background: A.surface,
            border: `1px solid ${A.border}`,
            borderRadius: 4,
            padding: 14,
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 3,
              overflow: "hidden",
              background: "#0A0E14",
              flexShrink: 0,
            }}
          >
            {ev.cover_image && (
              <img
                src={ev.cover_image}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{ev.title}</div>
            <div style={{ fontSize: 11, color: A.sub, marginTop: 2 }}>
              /events/{ev.slug} · {ev.date_text} · {ev.price_text}
            </div>
            <div style={{ fontSize: 11, color: A.muted }}>
              {ev.tickets?.length || 0} 種票券
              {!ev.seo_title && (
                <span style={{ color: A.yellow, marginLeft: 8 }}>
                  ⚠ 尚未設定 SEO
                </span>
              )}
            </div>
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 9px",
              borderRadius: 20,
              background:
                ev.status === "published"
                  ? "#E8FFF0"
                  : ev.status === "draft"
                  ? "#FFF8E8"
                  : "#FFF1F0",
              color:
                ev.status === "published"
                  ? A.green
                  : ev.status === "draft"
                  ? A.yellow
                  : A.red,
            }}
          >
            {ev.status === "published"
              ? "已發布"
              : ev.status === "draft"
              ? "草稿"
              : "已截止"}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn variant="ghost" small onClick={() => onEdit(ev)}>
              編輯
            </Btn>
            <Btn variant="danger" small onClick={() => onDelete(ev.id)}>
              刪除
            </Btn>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 活動編輯表單 ──
function EventForm({ init, onSave, onClose }) {
  const [f, setF] = useState({
    slug: "",
    title: "",
    subtitle: "",
    category: "immersive",
    cover_image: "",
    youtube_id: "",
    date_text: "",
    time_text: "",
    venue: "",
    address: "",
    price_text: "",
    tag: "",
    accent_color: "#0066FF",
    description: "",
    sale_info: "",
    refund_policy: "",
    notices: [],
    info_items: [],
    status: "draft",
    is_featured: false,
    seo_title: "",
    seo_desc: "",
    seo_image: "",
    ...init,
  });
  const [tab, setTab] = useState("basic");
  const u = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const TABS = [
    { id: "basic", label: "基本資訊" },
    { id: "content", label: "活動內容" },
    { id: "tickets", label: "票種設定" },
    { id: "media", label: "媒體版位" },
    { id: "seo", label: "SEO 設定" },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 200,
        display: "flex",
        justifyContent: "center",
        padding: "20px 12px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 6,
          width: "100%",
          maxWidth: 640,
          height: "fit-content",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${A.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {init.id ? "編輯活動" : "新增活動"}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
              color: A.muted,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: "flex",
            borderBottom: `1px solid ${A.border}`,
            padding: "0 20px",
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "12px 14px",
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: tab === t.id ? 700 : 400,
                color: tab === t.id ? A.text : A.sub,
                borderBottom: `2px solid ${
                  tab === t.id ? A.primary : "transparent"
                }`,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 20 }}>
          {tab === "basic" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="活動名稱" value={f.title} onChange={(v) => u("title", v)} ph="介質之間" />
                <Field
                  label="網址代稱（英文，用於 /events/xxx）"
                  value={f.slug}
                  onChange={(v) => u("slug", v.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                  ph="interstitial"
                />
              </div>
              <Field label="副標題" value={f.subtitle} onChange={(v) => u("subtitle", v)} ph="INTERSTITIAL — 光、聲、空間的邊界實驗" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: A.sub, marginBottom: 4 }}>
                    分類
                  </div>
                  <select
                    value={f.category}
                    onChange={(e) => u("category", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 11px",
                      border: `1px solid ${A.border}`,
                      borderRadius: 3,
                      fontSize: 13,
                      outline: "none",
                      background: "#fff",
                    }}
                  >
                    {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Field label="日期" value={f.date_text} onChange={(v) => u("date_text", v)} ph="2026.09.12 起" />
                <Field label="時間" value={f.time_text} onChange={(v) => u("time_text", v)} ph="19:30" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="場館" value={f.venue} onChange={(v) => u("venue", v)} ph="Like Real Studio A" />
                <Field label="地址" value={f.address} onChange={(v) => u("address", v)} ph="台北市內湖區..." />
                <Field label="起始票價文字" value={f.price_text} onChange={(v) => u("price_text", v)} ph="NT$680 起" />
                <Field label="標籤" value={f.tag} onChange={(v) => u("tag", v)} ph="即將開放" />
              </div>
              <div style={{ display: "flex", gap: 20, alignItems: "center", marginTop: 8 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: A.sub, marginBottom: 6 }}>
                    狀態
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[
                      ["draft", "草稿"],
                      ["published", "已發布"],
                      ["closed", "已截止"],
                    ].map(([v, l]) => (
                      <button
                        key={v}
                        onClick={() => u("status", v)}
                        style={{
                          padding: "6px 14px",
                          border: `1.5px solid ${f.status === v ? A.primary : A.border}`,
                          background: f.status === v ? A.primary : "#fff",
                          color: f.status === v ? "#fff" : A.sub,
                          fontSize: 12,
                          fontWeight: f.status === v ? 700 : 400,
                          cursor: "pointer",
                          borderRadius: 3,
                        }}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <label style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer", fontSize: 12, marginTop: 20 }}>
                  <input
                    type="checkbox"
                    checked={f.is_featured}
                    onChange={(e) => u("is_featured", e.target.checked)}
                    style={{ accentColor: A.accent }}
                  />
                  設為推薦活動
                </label>
              </div>
            </>
          )}

          {tab === "content" && (
            <>
              <Field label="活動簡介（段落間空一行）" value={f.description} onChange={(v) => u("description", v)} rows={5} />
              <Field label="售票資訊（每行一項）" value={f.sale_info} onChange={(v) => u("sale_info", v)} rows={3} />
              <Field label="退票規則" value={f.refund_policy} onChange={(v) => u("refund_policy", v)} rows={2} />

              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: A.sub }}>注意事項</div>
                  <Btn variant="ghost" small onClick={() => u("notices", [...(f.notices || []), ""])}>
                    ＋ 新增
                  </Btn>
                </div>
                {(f.notices || []).map((n, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    <input
                      value={n}
                      onChange={(e) => {
                        const ns = [...f.notices];
                        ns[i] = e.target.value;
                        u("notices", ns);
                      }}
                      style={{
                        flex: 1,
                        padding: "8px 10px",
                        border: `1px solid ${A.border}`,
                        borderRadius: 3,
                        fontSize: 12,
                        outline: "none",
                      }}
                    />
                    <button
                      onClick={() => u("notices", f.notices.filter((_, j) => j !== i))}
                      style={{
                        background: "#FFF1F0",
                        border: "none",
                        borderRadius: 3,
                        padding: "0 10px",
                        color: A.red,
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: A.sub }}>演出資訊表</div>
                  <Btn
                    variant="ghost"
                    small
                    onClick={() => u("info_items", [...(f.info_items || []), { label: "", value: "" }])}
                  >
                    ＋ 新增
                  </Btn>
                </div>
                {(f.info_items || []).map((it, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    <input
                      value={it.label}
                      onChange={(e) => {
                        const items = [...f.info_items];
                        items[i] = { ...items[i], label: e.target.value };
                        u("info_items", items);
                      }}
                      placeholder="項目"
                      style={{
                        width: 100,
                        padding: "8px 10px",
                        border: `1px solid ${A.border}`,
                        borderRadius: 3,
                        fontSize: 12,
                        outline: "none",
                      }}
                    />
                    <input
                      value={it.value}
                      onChange={(e) => {
                        const items = [...f.info_items];
                        items[i] = { ...items[i], value: e.target.value };
                        u("info_items", items);
                      }}
                      placeholder="內容"
                      style={{
                        flex: 1,
                        padding: "8px 10px",
                        border: `1px solid ${A.border}`,
                        borderRadius: 3,
                        fontSize: 12,
                        outline: "none",
                      }}
                    />
                    <button
                      onClick={() => u("info_items", f.info_items.filter((_, j) => j !== i))}
                      style={{
                        background: "#FFF1F0",
                        border: "none",
                        borderRadius: 3,
                        padding: "0 10px",
                        color: A.red,
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === "media" && (
            <>
              <ImageField
                label="活動封面圖"
                type="cover"
                value={f.cover_image}
                onChange={(v) => u("cover_image", v)}
                h={130}
              />
              <Field
                label="YouTube 影片 ID（網址 ?v= 後面那串，留空則不顯示）"
                value={f.youtube_id}
                onChange={(v) => u("youtube_id", v)}
                ph="LXb3EKWsInQ"
              />
              {f.youtube_id && (
                <div style={{ display: "flex", gap: 12, alignItems: "center", background: A.bg, padding: 10, borderRadius: 3 }}>
                  <img
                    src={`https://img.youtube.com/vi/${f.youtube_id}/mqdefault.jpg`}
                    alt=""
                    style={{ width: 120, height: 68, objectFit: "cover", borderRadius: 2 }}
                  />
                  <div style={{ fontSize: 11, color: A.sub }}>影片已設定</div>
                </div>
              )}
              <div style={{ marginTop: 14 }}>
                <Field
                  label="主色（用於標籤與強調色）"
                  value={f.accent_color}
                  onChange={(v) => u("accent_color", v)}
                  ph="#0066FF"
                />
                <div
                  style={{
                    height: 30,
                    background: f.accent_color,
                    borderRadius: 3,
                    border: `1px solid ${A.border}`,
                  }}
                />
              </div>
            </>
          )}

          {tab === "seo" && (
            <>
              <div
                style={{
                  background: "#FFFBEB",
                  border: "1px solid #FFE0A3",
                  borderRadius: 3,
                  padding: 12,
                  fontSize: 12,
                  color: "#8A5A00",
                  marginBottom: 16,
                  lineHeight: 1.7,
                }}
              >
                這裡設定的內容會出現在 Google 搜尋結果和社群分享卡片。留空則自動使用活動標題與簡介。
              </div>
              <Field
                label="SEO 標題（建議 30–60 字元）"
                value={f.seo_title}
                onChange={(v) => u("seo_title", v)}
                ph="介質之間 INTERSTITIAL｜2026 沉浸式裝置展｜Like Real"
              />
              <Field
                label="SEO 描述（建議 80–155 字元）"
                value={f.seo_desc}
                onChange={(v) => u("seo_desc", v)}
                rows={3}
                ph="光、聲音與空間的邊界實驗。9/12 起於 Like Real Studio A 展出，NT$680 起。"
              />
              <ImageField
                label="社群分享圖（留空則用封面圖）"
                type="og"
                value={f.seo_image}
                onChange={(v) => u("seo_image", v)}
                h={120}
              />
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${A.border}` }}>
                <SeoPreview
                  title={f.seo_title || f.title}
                  desc={f.seo_desc || f.description}
                  image={f.seo_image || f.cover_image}
                  url={`https://yoursite.com/events/${f.slug || "..."}`}
                />
              </div>
            </>
          )}

          {tab === "tickets" && (
            <TicketsEditor eventId={init?.id} />
          )}
        </div>

        <div
          style={{
            padding: "14px 20px",
            borderTop: `1px solid ${A.border}`,
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <Btn variant="ghost" onClick={onClose}>
            取消
          </Btn>
          <Btn onClick={() => onSave(f)} disabled={!f.title || !f.slug}>
            儲存
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── 訂單 ──
function OrdersPage({ orders, events }) {
  const [q, setQ] = useState("");
  const evName = (id) => events.find((e) => e.id === id)?.title || "—";
  const list = orders.filter(
    (o) =>
      !q ||
      o.id.includes(q.toUpperCase()) ||
      o.buyer_name?.includes(q) ||
      o.buyer_email?.includes(q)
  );
  return (
    <div>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>訂單查看</h1>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜尋訂單號、姓名、Email..."
        style={{
          width: "100%",
          maxWidth: 360,
          padding: "9px 12px",
          border: `1px solid ${A.border}`,
          borderRadius: 3,
          fontSize: 13,
          outline: "none",
          marginBottom: 14,
        }}
      />
      {list.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: A.muted, fontSize: 13 }}>
          {orders.length === 0 ? "還沒有訂單" : "找不到符合的訂單"}
        </div>
      )}
      {list.map((o) => (
        <div
          key={o.id}
          className="lr-admin-card"
          style={{
            background: A.surface,
            border: `1px solid ${A.border}`,
            borderRadius: 4,
            padding: 14,
            marginBottom: 8,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: A.accent }}>
                {o.id}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 20,
                  background:
                    o.status === "paid" ? "#E8FFF0" : o.status === "pending" ? "#FFF8E8" : "#FFF1F0",
                  color: o.status === "paid" ? A.green : o.status === "pending" ? A.yellow : A.red,
                }}
              >
                {o.status === "paid" ? "已付款" : o.status === "pending" ? "待付款" : "已退款"}
              </span>
              {o.checked_in && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 20,
                    background: "#E8FFF0",
                    color: A.green,
                  }}
                >
                  已入場
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {o.buyer_name} · {evName(o.event_id)}
            </div>
            <div style={{ fontSize: 11, color: A.sub }}>
              座位 {Array.isArray(o.seats) ? o.seats.map((s) => `#${s}`).join("、") : "—"} ·{" "}
              {o.buyer_email} · {o.buyer_phone}
            </div>
          </div>
          <div style={{ fontWeight: 800, fontSize: 15, whiteSpace: "nowrap" }}>
            NT${o.total?.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── SEO 設定 ──
function SeoPage({ settings, events, onSave }) {
  const [s, setS] = useState(settings);
  const u = (k, v) => setS((p) => ({ ...p, [k]: v }));
  const missing = events.filter((e) => !e.seo_title);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>SEO 設定</h1>
        <Btn onClick={() => onSave(s)}>儲存設定</Btn>
      </div>

      {missing.length > 0 && (
        <div
          style={{
            background: "#FFFBEB",
            border: "1px solid #FFE0A3",
            borderRadius: 4,
            padding: 12,
            fontSize: 12,
            color: "#8A5A00",
            marginBottom: 18,
          }}
        >
          有 {missing.length} 個活動尚未設定 SEO：{missing.map((e) => e.title).join("、")}。
          到「活動管理」編輯活動 → SEO 設定分頁補上。
        </div>
      )}

      <div
        style={{
          background: A.surface,
          border: `1px solid ${A.border}`,
          borderRadius: 4,
          padding: 20,
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: A.sub, marginBottom: 14 }}>
          全站 SEO
        </div>
        <Field label="網站名稱" value={s.site_name} onChange={(v) => u("site_name", v)} ph="Like Real" />
        <Field
          label="首頁標題（建議 30–60 字元）"
          value={s.site_title}
          onChange={(v) => u("site_title", v)}
          ph="Like Real｜虛擬與現實整合劇場"
        />
        <Field
          label="首頁描述（建議 80–155 字元）"
          value={s.site_desc}
          onChange={(v) => u("site_desc", v)}
          rows={3}
        />
        <Field
          label="關鍵字（逗號分隔）"
          value={s.site_keywords}
          onChange={(v) => u("site_keywords", v)}
          ph="沉浸式劇場,沉浸式展覽,互動藝術,台北展覽"
        />
        <ImageField
          label="預設社群分享圖"
          type="og"
          value={s.og_image}
          onChange={(v) => u("og_image", v)}
          h={120}
        />
      </div>

      <div
        style={{
          background: A.surface,
          border: `1px solid ${A.border}`,
          borderRadius: 4,
          padding: 20,
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: A.sub, marginBottom: 14 }}>
          追蹤與驗證
        </div>
        <Field
          label="Google Analytics ID"
          value={s.ga_id}
          onChange={(v) => u("ga_id", v)}
          ph="G-XXXXXXXXXX"
        />
        <Field
          label="Google Search Console 驗證碼"
          value={s.gsc_token}
          onChange={(v) => u("gsc_token", v)}
          ph="從 Search Console 取得的 meta 驗證字串"
        />
        <Field
          label="Meta (Facebook) Pixel ID"
          value={s.meta_pixel_id}
          onChange={(v) => u("meta_pixel_id", v)}
          ph="例如 1234567890123456"
        />
        <Field
          label="LINE Tag ID"
          value={s.line_tag_id}
          onChange={(v) => u("line_tag_id", v)}
          ph="從 LINE Ads 後台取得"
        />
        <div
          style={{
            background: A.accentL,
            border: `1px solid ${A.accent}30`,
            borderRadius: 4,
            padding: "10px 12px",
            fontSize: 11,
            color: A.sub,
            lineHeight: 1.8,
            marginTop: 4,
          }}
        >
          填入後會自動追蹤這些事件：瀏覽網站、瀏覽活動頁、進入購票、完成訂單。
          廣告後台就能看到每筆廣告帶來多少張票與金額。
        </div>
        <div style={{ fontSize: 11, color: A.muted, lineHeight: 1.8, marginTop: 8 }}>
          網站上線後，到 Google Search Console 提交你的 sitemap：
          <code style={{ background: A.bg, padding: "2px 6px", marginLeft: 4 }}>
            /sitemap.xml
          </code>
          （已自動產生，包含所有已發布活動）
        </div>
      </div>

      <div
        style={{
          background: A.surface,
          border: `1px solid ${A.border}`,
          borderRadius: 4,
          padding: 20,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: A.sub, marginBottom: 14 }}>
          首頁預覽
        </div>
        <SeoPreview
          title={s.site_title}
          desc={s.site_desc}
          image={s.og_image}
          url="https://yoursite.com"
        />
      </div>
    </div>
  );
}

// ── 場域設定 ──
function SitePage({ settings, banners, announcements, onSave, reload, flash }) {
  const [tab, setTab] = useState("marquee");
  const [marquee, setMarquee] = useState(settings.marquee || []);

  async function saveBanner(b) {
    if (b.id) await supabase.from("banners").update(b).eq("id", b.id);
    else await supabase.from("banners").insert(b);
    await reload();
    flash("Banner 已儲存");
  }
  async function delBanner(id) {
    await supabase.from("banners").delete().eq("id", id);
    await reload();
    flash("Banner 已刪除");
  }
  async function saveAnn(a) {
    if (a.id) await supabase.from("announcements").update(a).eq("id", a.id);
    else await supabase.from("announcements").insert(a);
    await reload();
    flash("公告已儲存");
  }
  async function delAnn(id) {
    await supabase.from("announcements").delete().eq("id", id);
    await reload();
    flash("公告已刪除");
  }

  return (
    <div>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>場域設定</h1>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[
          ["marquee", "跑馬燈"],
          ["announcements", "公告"],
          ["banners", "Banner"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              padding: "7px 14px",
              border: `1px solid ${tab === id ? A.primary : A.border}`,
              background: tab === id ? A.primary : "#fff",
              color: tab === id ? "#fff" : A.sub,
              fontSize: 12,
              fontWeight: tab === id ? 700 : 400,
              cursor: "pointer",
              borderRadius: 3,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "marquee" && (
        <div
          style={{
            background: A.surface,
            border: `1px solid ${A.border}`,
            borderRadius: 4,
            padding: 20,
          }}
        >
          {marquee.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 7 }}>
              <input
                value={m}
                onChange={(e) => {
                  const ms = [...marquee];
                  ms[i] = e.target.value;
                  setMarquee(ms);
                }}
                style={{
                  flex: 1,
                  padding: "8px 11px",
                  border: `1px solid ${A.border}`,
                  borderRadius: 3,
                  fontSize: 12,
                  outline: "none",
                }}
              />
              <button
                onClick={() => setMarquee(marquee.filter((_, j) => j !== i))}
                style={{
                  background: "#FFF1F0",
                  border: "none",
                  borderRadius: 3,
                  padding: "0 12px",
                  color: A.red,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <Btn variant="ghost" small onClick={() => setMarquee([...marquee, "✦ 新訊息"])}>
              ＋ 新增
            </Btn>
            <Btn small onClick={() => onSave({ ...settings, marquee })}>
              儲存跑馬燈
            </Btn>
          </div>
        </div>
      )}

      {tab === "announcements" && (
        <div>
          {announcements.map((a) => (
            <AnnRow key={a.id} ann={a} onSave={saveAnn} onDelete={delAnn} />
          ))}
          <Btn
            variant="ghost"
            onClick={() =>
              saveAnn({
                tag: "公告",
                content: "",
                is_hot: false,
                published_at: new Date().toISOString().slice(0, 10),
                sort_order: announcements.length + 1,
              })
            }
          >
            ＋ 新增公告
          </Btn>
        </div>
      )}

      {tab === "banners" && (
        <div>
          {banners.map((b) => (
            <BannerRow key={b.id} banner={b} onSave={saveBanner} onDelete={delBanner} />
          ))}
          <Btn
            variant="ghost"
            onClick={() =>
              saveBanner({
                position: "top",
                title: "新 Banner",
                subtitle: "",
                cta_text: "了解更多",
                color: "linear-gradient(135deg,#0A0E14,#0066FF)",
                sort_order: banners.length + 1,
                is_active: true,
              })
            }
          >
            ＋ 新增 Banner
          </Btn>
        </div>
      )}
    </div>
  );
}

function AnnRow({ ann, onSave, onDelete }) {
  const [a, setA] = useState(ann);
  return (
    <div
      style={{
        background: A.surface,
        border: `1px solid ${A.border}`,
        borderRadius: 4,
        padding: 14,
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
        <input
          value={a.tag}
          onChange={(e) => setA({ ...a, tag: e.target.value })}
          placeholder="標籤"
          style={{
            width: 90,
            padding: "7px 9px",
            border: `1px solid ${A.border}`,
            borderRadius: 3,
            fontSize: 12,
            outline: "none",
          }}
        />
        <input
          type="date"
          value={a.published_at}
          onChange={(e) => setA({ ...a, published_at: e.target.value })}
          style={{
            padding: "7px 9px",
            border: `1px solid ${A.border}`,
            borderRadius: 3,
            fontSize: 12,
            outline: "none",
          }}
        />
        <label style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 12, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={a.is_hot}
            onChange={(e) => setA({ ...a, is_hot: e.target.checked })}
            style={{ accentColor: A.red }}
          />
          重要
        </label>
        <div style={{ flex: 1 }} />
        <Btn small onClick={() => onSave(a)}>
          儲存
        </Btn>
        <Btn variant="danger" small onClick={() => onDelete(a.id)}>
          刪除
        </Btn>
      </div>
      <textarea
        value={a.content}
        onChange={(e) => setA({ ...a, content: e.target.value })}
        rows={2}
        placeholder="公告內容"
        style={{
          width: "100%",
          padding: "8px 10px",
          border: `1px solid ${A.border}`,
          borderRadius: 3,
          fontSize: 12,
          outline: "none",
          resize: "vertical",
        }}
      />
    </div>
  );
}

function BannerRow({ banner, onSave, onDelete }) {
  const [b, setB] = useState(banner);
  return (
    <div
      style={{
        background: A.surface,
        border: `1px solid ${A.border}`,
        borderRadius: 4,
        padding: 14,
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
        <select
          value={b.position}
          onChange={(e) => setB({ ...b, position: e.target.value })}
          style={{
            padding: "7px 9px",
            border: `1px solid ${A.border}`,
            borderRadius: 3,
            fontSize: 12,
            background: "#fff",
          }}
        >
          <option value="top">頂部</option>
          <option value="bottom">底部</option>
        </select>
        <label style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 12, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={b.is_active}
            onChange={(e) => setB({ ...b, is_active: e.target.checked })}
            style={{ accentColor: A.green }}
          />
          啟用
        </label>
        <div style={{ flex: 1 }} />
        <Btn small onClick={() => onSave(b)}>
          儲存
        </Btn>
        <Btn variant="danger" small onClick={() => onDelete(b.id)}>
          刪除
        </Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <input
          value={b.title || ""}
          onChange={(e) => setB({ ...b, title: e.target.value })}
          placeholder="大標題"
          style={{ padding: "8px 10px", border: `1px solid ${A.border}`, borderRadius: 3, fontSize: 12, outline: "none" }}
        />
        <input
          value={b.subtitle || ""}
          onChange={(e) => setB({ ...b, subtitle: e.target.value })}
          placeholder="副標題"
          style={{ padding: "8px 10px", border: `1px solid ${A.border}`, borderRadius: 3, fontSize: 12, outline: "none" }}
        />
        <input
          value={b.cta_text || ""}
          onChange={(e) => setB({ ...b, cta_text: e.target.value })}
          placeholder="按鈕文字"
          style={{ padding: "8px 10px", border: `1px solid ${A.border}`, borderRadius: 3, fontSize: 12, outline: "none" }}
        />
        <input
          value={b.color || ""}
          onChange={(e) => setB({ ...b, color: e.target.value })}
          placeholder="漸層色（無圖時使用）"
          style={{ padding: "8px 10px", border: `1px solid ${A.border}`, borderRadius: 3, fontSize: 12, outline: "none" }}
        />
      </div>
      <ImageField
        label="Banner 背景圖（選填）"
        type={b.position === "bottom" ? "bannerBottom" : "banner"}
        value={b.image}
        onChange={(v) => setB({ ...b, image: v })}
        h={110}
      />
    </div>
  );
}

// ── 驗票 ──
function ScannerPage({ orders, events, onCheckIn }) {
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const evName = (id) => events.find((e) => e.id === id)?.title || "—";

  function lookup() {
    const o = orders.find((x) => x.id === code.trim().toUpperCase());
    setResult(o || { error: true, code });
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>驗票入場</h1>

      <div
        style={{
          background: A.surface,
          border: `1px solid ${A.border}`,
          borderRadius: 4,
          padding: 20,
          textAlign: "center",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            aspectRatio: "1",
            maxWidth: 240,
            margin: "0 auto 14px",
            background: A.bg,
            border: `2px dashed ${A.border}`,
            borderRadius: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 36 }}>📷</div>
          <div style={{ fontSize: 11, color: A.muted, padding: "0 20px", lineHeight: 1.6 }}>
            相機掃描功能需在手機瀏覽器開啟並授權
            <br />
            目前請用下方手動輸入
          </div>
        </div>
        <div style={{ fontSize: 11, color: A.muted }}>
          支援：QR Code · NFC 感應 · 手動輸入
        </div>
      </div>

      <div
        style={{
          background: A.surface,
          border: `1px solid ${A.border}`,
          borderRadius: 4,
          padding: 16,
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: A.sub, marginBottom: 8 }}>
          輸入票券編號
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookup()}
            placeholder="LR-XXXXXX-XXXX"
            style={{
              flex: 1,
              padding: "10px 12px",
              border: `1px solid ${A.border}`,
              borderRadius: 3,
              fontSize: 13,
              outline: "none",
              fontFamily: "monospace",
            }}
          />
          <Btn onClick={lookup}>查詢</Btn>
        </div>
      </div>

      {result && (
        <div
          style={{
            background: A.surface,
            border: `2px solid ${
              result.error ? A.red : result.checked_in ? A.green : A.accent
            }`,
            borderRadius: 4,
            padding: 18,
          }}
        >
          {result.error ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 30, marginBottom: 6 }}>❌</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: A.red }}>票券無效</div>
              <div style={{ fontSize: 12, color: A.sub }}>找不到票券：{result.code}</div>
            </div>
          ) : result.checked_in ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 30, marginBottom: 6 }}>⚠️</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: A.yellow }}>
                此票券已入場
              </div>
              <div style={{ fontSize: 12, color: A.sub, marginTop: 4 }}>
                {result.buyer_name} · {evName(result.event_id)}
              </div>
              <div style={{ fontSize: 11, color: A.muted }}>
                入場時間：{new Date(result.checked_in_at).toLocaleString("zh-TW")}
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{result.buyer_name}</div>
                <div style={{ fontSize: 12, color: A.sub, marginTop: 3 }}>
                  {evName(result.event_id)}
                </div>
                <div style={{ fontSize: 12, color: A.sub }}>
                  座位：
                  {Array.isArray(result.seats)
                    ? result.seats.map((s) => `#${s}`).join("、")
                    : "—"}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: "monospace",
                    color: A.muted,
                    marginTop: 6,
                  }}
                >
                  {result.id}
                </div>
              </div>
              {result.status === "paid" ? (
                <Btn variant="accent" onClick={() => onCheckIn(result.id)}>
                  ✓ 確認入場
                </Btn>
              ) : (
                <div style={{ fontSize: 12, color: A.red, fontWeight: 600 }}>
                  ⚠️ 此訂單狀態為「{result.status === "pending" ? "待付款" : "已退款"}」，不得入場
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// 銷售分析
// ═══════════════════════════════════════════
function AnalyticsPage({ orders, events }) {
  const [range, setRange] = useState("month"); // day week month custom
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [filterEvent, setFilterEvent] = useState("all");
  const [sortBy, setSortBy] = useState("revenue"); // revenue count
  const [statusFilter, setStatusFilter] = useState("paid"); // paid all

  // 只算有效訂單（付款完成，或全部）
  const base = orders.filter((o) =>
    statusFilter === "paid" ? o.status === "paid" : true
  );

  // 依區間過濾
  const now = new Date();
  function inRange(dateStr) {
    const d = new Date(dateStr);
    if (range === "day") {
      return d.toDateString() === now.toDateString();
    }
    if (range === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return d >= weekAgo;
    }
    if (range === "month") {
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth()
      );
    }
    if (range === "custom") {
      if (!customStart || !customEnd) return true;
      const s = new Date(customStart);
      const e = new Date(customEnd);
      e.setHours(23, 59, 59);
      return d >= s && d <= e;
    }
    return true;
  }

  let filtered = base.filter((o) => inRange(o.created_at));
  if (filterEvent !== "all") {
    filtered = filtered.filter((o) => o.event_id === filterEvent);
  }

  const totalRevenue = filtered.reduce((a, o) => a + (o.total || 0), 0);
  const totalCount = filtered.length;
  const totalTickets = filtered.reduce(
    (a, o) => a + (Array.isArray(o.seats) ? o.seats.length : 0),
    0
  );
  const avgOrder = totalCount ? Math.round(totalRevenue / totalCount) : 0;

  // 依活動彙總
  const byEvent = {};
  filtered.forEach((o) => {
    const key = o.event_id || "unknown";
    if (!byEvent[key]) byEvent[key] = { revenue: 0, count: 0, tickets: 0 };
    byEvent[key].revenue += o.total || 0;
    byEvent[key].count += 1;
    byEvent[key].tickets += Array.isArray(o.seats) ? o.seats.length : 0;
  });
  const evName = (id) => events.find((e) => e.id === id)?.title || "未知活動";
  let eventRows = Object.entries(byEvent).map(([id, v]) => ({
    id,
    name: evName(id),
    ...v,
  }));
  eventRows.sort((a, b) =>
    sortBy === "revenue" ? b.revenue - a.revenue : b.count - a.count
  );

  // 每日趨勢（區間內）
  const byDay = {};
  filtered.forEach((o) => {
    const day = new Date(o.created_at).toLocaleDateString("zh-TW", {
      month: "numeric",
      day: "numeric",
    });
    byDay[day] = (byDay[day] || 0) + (o.total || 0);
  });
  const dayEntries = Object.entries(byDay).slice(-14);
  const maxDay = Math.max(1, ...dayEntries.map(([, v]) => v));

  const RANGE_LABEL = { day: "今日", week: "近 7 天", month: "本月", custom: "自訂" };

  return (
    <div>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>銷售分析</h1>

      {/* 控制列 */}
      <div
        style={{
          background: A.surface,
          border: `1px solid ${A.border}`,
          borderRadius: 6,
          padding: 16,
          marginBottom: 16,
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          alignItems: "flex-end",
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: A.sub, marginBottom: 6 }}>
            時間區間
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {["day", "week", "month", "custom"].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  padding: "7px 14px",
                  border: `1px solid ${range === r ? A.primary : A.border}`,
                  background: range === r ? A.primary : "#fff",
                  color: range === r ? "#fff" : A.sub,
                  fontSize: 12,
                  fontWeight: range === r ? 700 : 400,
                  cursor: "pointer",
                  borderRadius: 3,
                }}
              >
                {RANGE_LABEL[r]}
              </button>
            ))}
          </div>
        </div>

        {range === "custom" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              style={{
                padding: "7px 10px",
                border: `1px solid ${A.border}`,
                borderRadius: 3,
                fontSize: 12,
              }}
            />
            <span style={{ color: A.muted }}>–</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              style={{
                padding: "7px 10px",
                border: `1px solid ${A.border}`,
                borderRadius: 3,
                fontSize: 12,
              }}
            />
          </div>
        )}

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: A.sub, marginBottom: 6 }}>
            篩選活動
          </div>
          <select
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            style={{
              padding: "7px 10px",
              border: `1px solid ${A.border}`,
              borderRadius: 3,
              fontSize: 12,
              background: "#fff",
              minWidth: 140,
            }}
          >
            <option value="all">全部活動</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: A.sub, marginBottom: 6 }}>
            訂單狀態
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "7px 10px",
              border: `1px solid ${A.border}`,
              borderRadius: 3,
              fontSize: 12,
              background: "#fff",
            }}
          >
            <option value="paid">僅已付款</option>
            <option value="all">全部訂單</option>
          </select>
        </div>
      </div>

      {/* 數字卡 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          { label: `${RANGE_LABEL[range]}營收`, value: `NT$${totalRevenue.toLocaleString()}`, color: A.accent },
          { label: "訂單數", value: totalCount, color: A.green },
          { label: "售出票數", value: totalTickets, color: A.yellow },
          { label: "平均客單價", value: `NT$${avgOrder.toLocaleString()}`, color: "#7C3AED" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: A.surface,
              border: `1px solid ${A.border}`,
              borderRadius: 6,
              padding: 18,
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: A.sub, marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 每日趨勢長條圖 */}
      {dayEntries.length > 0 && (
        <div
          style={{
            background: A.surface,
            border: `1px solid ${A.border}`,
            borderRadius: 6,
            padding: 18,
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
            每日營收趨勢
          </div>
          <div
            className="lr-admin-chart-scroll"
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 6,
              height: 140,
            }}
          >
            {dayEntries.map(([day, v]) => (
              <div
                key={day}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <div style={{ fontSize: 9, color: A.sub }}>
                  {v >= 1000 ? `${Math.round(v / 1000)}k` : v}
                </div>
                <div
                  style={{
                    width: "100%",
                    height: `${(v / maxDay) * 100}%`,
                    minHeight: 2,
                    background: A.accent,
                    borderRadius: "2px 2px 0 0",
                  }}
                />
                <div style={{ fontSize: 9, color: A.muted }}>{day}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 各活動排行 */}
      <div
        style={{
          background: A.surface,
          border: `1px solid ${A.border}`,
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${A.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700 }}>各活動銷售排行</div>
          <div style={{ display: "flex", gap: 4 }}>
            {[
              ["revenue", "依營收"],
              ["count", "依訂單數"],
            ].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setSortBy(v)}
                style={{
                  padding: "5px 12px",
                  border: `1px solid ${sortBy === v ? A.primary : A.border}`,
                  background: sortBy === v ? A.primary : "#fff",
                  color: sortBy === v ? "#fff" : A.sub,
                  fontSize: 11,
                  fontWeight: sortBy === v ? 700 : 400,
                  cursor: "pointer",
                  borderRadius: 3,
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        {eventRows.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: A.muted, fontSize: 13 }}>
            此區間沒有銷售資料
          </div>
        )}
        {eventRows.map((row, i) => (
          <div
            key={row.id}
            style={{
              padding: "12px 16px",
              borderBottom: i < eventRows.length - 1 ? `1px solid ${A.border}` : "none",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: i === 0 ? "#FFD70022" : A.bg,
                color: i === 0 ? "#B8860B" : A.sub,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{row.name}</div>
              <div style={{ fontSize: 11, color: A.sub }}>
                {row.count} 筆訂單 · {row.tickets} 張票
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>
                NT${row.revenue.toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// 會員管理
// ═══════════════════════════════════════════
function MembersPage({ members, orders, tiers, reload, flash }) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const [adjust, setAdjust] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [busy, setBusy] = useState(false);

  const list = members.filter(
    (m) =>
      !q ||
      m.name?.includes(q) ||
      m.email?.includes(q) ||
      m.phone?.includes(q)
  );

  const memberOrders = (mid) => orders.filter((o) => o.member_id === mid);

  async function doAdjust() {
    const amt = parseInt(adjust);
    if (!amt || !selected) return;
    setBusy(true);
    const newBalance = selected.points + amt;
    await supabase
      .from("members")
      .update({ points: newBalance })
      .eq("id", selected.id);
    await supabase.from("point_logs").insert({
      member_id: selected.id,
      type: amt > 0 ? "earn" : "redeem",
      amount: amt,
      balance: newBalance,
      note: adjustNote || "後台手動調整",
    });
    setBusy(false);
    setAdjust("");
    setAdjustNote("");
    setSelected(null);
    await reload();
    flash("點數已調整");
  }

  return (
    <div>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>會員管理</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {[
          { label: "會員總數", value: members.length, color: A.accent },
          {
            label: "總持有點數",
            value: members.reduce((a, m) => a + m.points, 0).toLocaleString(),
            color: A.green,
          },
          {
            label: "待發放點數",
            value: members.reduce((a, m) => a + m.pending_points, 0).toLocaleString(),
            color: A.yellow,
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: A.surface,
              border: `1px solid ${A.border}`,
              borderRadius: 6,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: A.sub }}>{s.label}</div>
          </div>
        ))}
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜尋姓名、Email、手機..."
        style={{
          width: "100%",
          maxWidth: 360,
          padding: "9px 12px",
          border: `1px solid ${A.border}`,
          borderRadius: 3,
          fontSize: 13,
          outline: "none",
          marginBottom: 14,
        }}
      />

      {list.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: A.muted, fontSize: 13 }}>
          {members.length === 0 ? "還沒有會員" : "找不到符合的會員"}
        </div>
      )}

      {list.map((m) => (
        <div
          key={m.id}
          style={{
            background: A.surface,
            border: `1px solid ${A.border}`,
            borderRadius: 6,
            padding: 14,
            marginBottom: 8,
          }}
        >
          <div className="lr-admin-card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 20,
                    background: (m.member_tiers?.color || A.muted) + "22",
                    color: m.member_tiers?.color || A.sub,
                  }}
                >
                  {m.member_tiers?.name || "一般會員"}
                </span>
              </div>
              <div style={{ fontSize: 11, color: A.sub }}>
                {m.email} {m.phone && `· ${m.phone}`}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: A.accent }}>
                {m.points} 點
              </div>
              <div style={{ fontSize: 10, color: A.muted }}>
                待發 {m.pending_points} · 累計消費 ${m.total_spent.toLocaleString()}
              </div>
            </div>
            <button
              onClick={() => setSelected(selected?.id === m.id ? null : m)}
              style={{
                padding: "6px 12px",
                border: `1px solid ${A.border}`,
                borderRadius: 3,
                background: selected?.id === m.id ? A.primary : "#fff",
                color: selected?.id === m.id ? "#fff" : A.text,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              調整
            </button>
          </div>

          {selected?.id === m.id && (
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: `1px solid ${A.border}`,
              }}
            >
              <div style={{ fontSize: 11, color: A.sub, marginBottom: 8 }}>
                手動調整點數（正數增加、負數扣除）
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                  type="number"
                  value={adjust}
                  onChange={(e) => setAdjust(e.target.value)}
                  placeholder="例：+100 或 -50"
                  style={{
                    width: 120,
                    padding: "8px 10px",
                    border: `1px solid ${A.border}`,
                    borderRadius: 3,
                    fontSize: 13,
                    outline: "none",
                  }}
                />
                <input
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="調整原因（選填）"
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    border: `1px solid ${A.border}`,
                    borderRadius: 3,
                    fontSize: 13,
                    outline: "none",
                  }}
                />
                <Btn onClick={doAdjust} disabled={busy || !adjust}>
                  確認
                </Btn>
              </div>
              <div style={{ fontSize: 11, color: A.sub, marginTop: 8 }}>
                消費紀錄：{memberOrders(m.id).length} 筆訂單
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// 等級設定
// ═══════════════════════════════════════════
function TiersPage({ tiers, reload, flash }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>會員等級設定</h1>
        <Btn
          onClick={async () => {
            const maxLevel = Math.max(0, ...tiers.map((t) => t.level));
            await supabase.from("member_tiers").insert({
              name: "新等級",
              level: maxLevel + 1,
              min_spent: 0,
              earn_per: 50,
              redeem_cap: 30,
              color: "#697485",
            });
            await reload();
            flash("已新增等級");
          }}
        >
          ＋ 新增等級
        </Btn>
      </div>

      <div
        style={{
          background: "#FFFBEB",
          border: "1px solid #FFE0A3",
          borderRadius: 6,
          padding: 12,
          fontSize: 12,
          color: "#8A5A00",
          marginBottom: 16,
          lineHeight: 1.7,
        }}
      >
        修改後會員會依「累計消費」自動套用對應等級。「每 N 元 1 點」的數字越小，回饋越多。「折抵上限」是單筆訂單最多可用點數折抵的比例。
      </div>

      {tiers.map((t) => (
        <TierRow key={t.id} tier={t} reload={reload} flash={flash} />
      ))}
    </div>
  );
}

function TierRow({ tier, reload, flash }) {
  const [t, setT] = useState(tier);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await supabase
      .from("member_tiers")
      .update({
        name: t.name,
        level: t.level,
        min_spent: t.min_spent,
        earn_per: t.earn_per,
        redeem_cap: t.redeem_cap,
        color: t.color,
      })
      .eq("id", t.id);
    setBusy(false);
    await reload();
    flash("等級已儲存");
  }

  async function del() {
    if (!confirm(`確定刪除「${t.name}」？`)) return;
    await supabase.from("member_tiers").delete().eq("id", t.id);
    await reload();
    flash("等級已刪除");
  }

  return (
    <div
      style={{
        background: A.surface,
        border: `1px solid ${A.border}`,
        borderRadius: 6,
        padding: 16,
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <input
          type="color"
          value={t.color}
          onChange={(e) => setT({ ...t, color: e.target.value })}
          style={{ width: 32, height: 32, border: "none", cursor: "pointer", background: "none" }}
        />
        <input
          value={t.name}
          onChange={(e) => setT({ ...t, name: e.target.value })}
          style={{
            fontSize: 15,
            fontWeight: 700,
            border: `1px solid ${A.border}`,
            borderRadius: 3,
            padding: "6px 10px",
            outline: "none",
            width: 140,
          }}
        />
        <div style={{ flex: 1 }} />
        <Btn small onClick={save} disabled={busy}>儲存</Btn>
        <Btn small variant="danger" onClick={del}>刪除</Btn>
      </div>
      <div className="lr-tier-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        <TierField
          label="等級順序"
          value={t.level}
          onChange={(v) => setT({ ...t, level: parseInt(v) || 1 })}
        />
        <TierField
          label="升級門檻（累計消費）"
          value={t.min_spent}
          onChange={(v) => setT({ ...t, min_spent: parseInt(v) || 0 })}
        />
        <TierField
          label="每 N 元 1 點"
          value={t.earn_per}
          onChange={(v) => setT({ ...t, earn_per: parseInt(v) || 1 })}
        />
        <TierField
          label="折抵上限 %"
          value={t.redeem_cap}
          onChange={(v) => setT({ ...t, redeem_cap: parseInt(v) || 0 })}
        />
      </div>
    </div>
  );
}

function TierField({ label, value, onChange }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: A.sub, marginBottom: 4 }}>{label}</div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "8px 10px",
          border: `1px solid ${A.border}`,
          borderRadius: 3,
          fontSize: 13,
          outline: "none",
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════
// 退票審核
// ═══════════════════════════════════════════
function RefundsPage({ refunds, reload, flash, staffId }) {
  const [tab, setTab] = useState("pending");
  const list = refunds.filter((r) =>
    tab === "all" ? true : r.status === tab
  );

  async function handle(refund, decision) {
    const note = decision === "approved" ? "同意退票" : "婉拒退票";
    await supabase
      .from("refund_requests")
      .update({
        status: decision,
        admin_note: note,
        handled_at: new Date().toISOString(),
        handled_by: staffId,
      })
      .eq("id", refund.id);

    if (decision === "approved") {
      // 訂單標記退款、釋放座位
      await supabase.from("orders").update({ status: "refunded" }).eq("id", refund.order_id);
      await supabase.rpc("release_seats", { p_order_id: refund.order_id });
    }
    await reload();
    flash(decision === "approved" ? "已核准退票" : "已婉拒退票");
  }

  const pendingCount = refunds.filter((r) => r.status === "pending").length;

  return (
    <div>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>退票審核</h1>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[
          ["pending", `待處理 ${pendingCount > 0 ? `(${pendingCount})` : ""}`],
          ["approved", "已核准"],
          ["rejected", "已婉拒"],
          ["all", "全部"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              padding: "7px 14px",
              border: `1px solid ${tab === id ? A.primary : A.border}`,
              background: tab === id ? A.primary : "#fff",
              color: tab === id ? "#fff" : A.sub,
              fontSize: 12,
              fontWeight: tab === id ? 700 : 400,
              cursor: "pointer",
              borderRadius: 3,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {list.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: A.muted, fontSize: 13 }}>
          沒有{tab === "pending" ? "待處理的" : ""}退票申請
        </div>
      )}

      {list.map((r) => (
        <div
          key={r.id}
          style={{
            background: A.surface,
            border: `1px solid ${A.border}`,
            borderRadius: 6,
            padding: 16,
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {r.orders?.events?.title || "（活動已刪除）"}
              </div>
              <div style={{ fontSize: 12, color: A.sub }}>
                {r.orders?.buyer_name} · 訂單 {r.order_id} · NT${r.orders?.total?.toLocaleString()}
              </div>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 20,
                height: "fit-content",
                background:
                  r.status === "pending" ? "#FFF8E8" : r.status === "approved" ? "#E8FFF0" : "#FFF1F0",
                color:
                  r.status === "pending" ? A.yellow : r.status === "approved" ? A.green : A.red,
              }}
            >
              {r.status === "pending" ? "待處理" : r.status === "approved" ? "已核准" : "已婉拒"}
            </span>
          </div>

          {r.reason && (
            <div
              style={{
                fontSize: 12,
                color: A.text,
                background: A.bg,
                padding: "8px 12px",
                borderRadius: 4,
                marginBottom: 10,
              }}
            >
              退票原因：{r.reason}
            </div>
          )}

          <div style={{ fontSize: 11, color: A.muted, marginBottom: 10 }}>
            申請時間：{new Date(r.requested_at).toLocaleString("zh-TW")}
          </div>

          {r.status === "pending" && (
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="accent" small onClick={() => handle(r, "approved")}>
                核准退票（釋放座位）
              </Btn>
              <Btn variant="danger" small onClick={() => handle(r, "rejected")}>
                婉拒
              </Btn>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// 帳號權限管理
// ═══════════════════════════════════════════
function StaffPage({ staffList, reload, flash, allPerms }) {
  const [adding, setAdding] = useState(false);
  return (
    <div>
      <div
        className="lr-admin-head"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>帳號權限</h1>
        <Btn onClick={() => setAdding(!adding)}>
          {adding ? "取消" : "＋ 新增人員"}
        </Btn>
      </div>

      {adding && (
        <NewStaffForm
          allPerms={allPerms}
          onDone={async () => {
            setAdding(false);
            await reload();
            flash("人員已建立");
          }}
        />
      )}

      <div
        style={{
          background: "#FFFBEB",
          border: "1px solid #FFE0A3",
          borderRadius: 6,
          padding: 12,
          fontSize: 12,
          color: "#8A5A00",
          marginBottom: 16,
          lineHeight: 1.7,
        }}
      >
        勾選每個帳號可進入的功能模組。「管理者」角色永遠擁有全部權限（包含此頁），無法被移除。新增人員後，請把 Email 與初始密碼交給對方，並提醒他們登入後自行更換密碼。
      </div>

      {staffList.map((s) => (
        <StaffRow key={s.id} member={s} reload={reload} flash={flash} allPerms={allPerms} />
      ))}
    </div>
  );
}

function NewStaffForm({ allPerms, onDone }) {
  const [f, setF] = useState({ email: "", name: "", password: "" });
  const [perms, setPerms] = useState(["dashboard", "orders", "scanner"]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const u = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggle = (id) =>
    setPerms((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  function randomPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let s = "";
    for (let i = 0; i < 10; i++)
      s += chars[Math.floor(Math.random() * chars.length)];
    u("password", s + "!");
  }

  async function submit() {
    setErr("");
    if (!f.email.trim() || !/\S+@\S+\.\S+/.test(f.email))
      return setErr("請輸入有效的 Email");
    if (!f.name.trim()) return setErr("請輸入姓名");
    if (f.password.length < 6) return setErr("密碼至少 6 個字元");
    if (perms.length === 0) return setErr("請至少勾選一項權限");

    setBusy(true);
    try {
      await createStaffAccount({
        email: f.email.trim(),
        password: f.password,
        name: f.name.trim(),
        permissions: perms,
      });
      onDone();
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  return (
    <div
      style={{
        background: A.surface,
        border: `1px solid ${A.accent}40`,
        borderRadius: 6,
        padding: 18,
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
        新增後台人員
      </div>

      <div
        className="lr-tier-grid"
        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12 }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: A.sub, marginBottom: 4 }}>
            Email（登入帳號）
          </div>
          <input
            value={f.email}
            onChange={(e) => u("email", e.target.value)}
            placeholder="staff@example.com"
            style={{
              width: "100%",
              padding: "9px 11px",
              border: `1px solid ${A.border}`,
              borderRadius: 3,
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: A.sub, marginBottom: 4 }}>
            姓名
          </div>
          <input
            value={f.name}
            onChange={(e) => u("name", e.target.value)}
            placeholder="王小明"
            style={{
              width: "100%",
              padding: "9px 11px",
              border: `1px solid ${A.border}`,
              borderRadius: 3,
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: A.sub, marginBottom: 4 }}>
            初始密碼
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={f.password}
              onChange={(e) => u("password", e.target.value)}
              placeholder="至少 6 字元"
              style={{
                flex: 1,
                minWidth: 0,
                padding: "9px 11px",
                border: `1px solid ${A.border}`,
                borderRadius: 3,
                fontSize: 13,
                outline: "none",
                fontFamily: "monospace",
              }}
            />
            <button
              onClick={randomPassword}
              title="產生隨機密碼"
              style={{
                padding: "0 12px",
                border: `1px solid ${A.border}`,
                background: "#fff",
                borderRadius: 3,
                cursor: "pointer",
                fontSize: 12,
                whiteSpace: "nowrap",
              }}
            >
              產生
            </button>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, color: A.sub, marginBottom: 6 }}>
        可進入的功能
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
          gap: 8,
          marginBottom: 14,
        }}
      >
        {allPerms.map((perm) => {
          const on = perms.includes(perm.id);
          return (
            <label
              key={perm.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 10px",
                border: `1px solid ${on ? A.accent : A.border}`,
                background: on ? A.accentL : "#fff",
                borderRadius: 4,
                fontSize: 12,
                cursor: "pointer",
                color: on ? A.accent : A.sub,
                fontWeight: on ? 600 : 400,
              }}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(perm.id)}
                style={{ accentColor: A.accent }}
              />
              {perm.label}
            </label>
          );
        })}
      </div>

      {err && (
        <div style={{ fontSize: 12, color: A.red, marginBottom: 10 }}>{err}</div>
      )}

      <Btn onClick={submit} disabled={busy}>
        {busy ? "建立中…" : "建立帳號"}
      </Btn>
    </div>
  );
}

function StaffRow({ member, reload, flash, allPerms }) {
  const isAdmin = member.role === "admin";
  const [perms, setPerms] = useState(
    isAdmin ? allPerms.map((p) => p.id) : member.permissions || []
  );
  const [active, setActive] = useState(member.is_active);
  const [busy, setBusy] = useState(false);

  function toggle(id) {
    if (isAdmin) return;
    setPerms((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function save() {
    setBusy(true);
    await supabase
      .from("staff")
      .update({ permissions: perms, is_active: active })
      .eq("id", member.id);
    setBusy(false);
    await reload();
    flash("權限已更新");
  }

  return (
    <div
      style={{
        background: A.surface,
        border: `1px solid ${A.border}`,
        borderRadius: 6,
        padding: 16,
        marginBottom: 10,
        opacity: active ? 1 : 0.6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {member.name || member.email}
            </span>
            {isAdmin && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 20,
                  background: "#EBF2FF",
                  color: A.accent,
                }}
              >
                管理者
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: A.sub }}>{member.email}</div>
        </div>
        {!isAdmin && (
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              style={{ accentColor: A.green }}
            />
            啟用
          </label>
        )}
        {!isAdmin && (
          <Btn small onClick={save} disabled={busy}>
            儲存
          </Btn>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
          gap: 8,
        }}
      >
        {allPerms.map((perm) => {
          const on = perms.includes(perm.id);
          return (
            <label
              key={perm.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 10px",
                border: `1px solid ${on ? A.accent : A.border}`,
                background: on ? A.accentL : "#fff",
                borderRadius: 4,
                fontSize: 12,
                cursor: isAdmin ? "not-allowed" : "pointer",
                color: on ? A.accent : A.sub,
                fontWeight: on ? 600 : 400,
              }}
            >
              <input
                type="checkbox"
                checked={on}
                disabled={isAdmin}
                onChange={() => toggle(perm.id)}
                style={{ accentColor: A.accent }}
              />
              {perm.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// 分潤管理
// ═══════════════════════════════════════════
function AffiliatesPage({ affiliates, events, orders, reload, flash }) {
  const [adding, setAdding] = useState(false);
  const [tab, setTab] = useState("partners");

  // 有分潤的訂單
  const commissionOrders = orders.filter((o) => o.affiliate_id);
  const affName = (id) => affiliates.find((a) => a.id === id)?.name || "—";
  const evName = (id) => events.find((e) => e.id === id)?.title || "—";

  async function updateCommissionStatus(orderId, status) {
    await supabase.from("orders").update({ commission_status: status }).eq("id", orderId);
    await reload();
    flash("分潤狀態已更新");
  }

  const totalPending = commissionOrders
    .filter((o) => ["pending", "approved"].includes(o.commission_status))
    .reduce((a, o) => a + (o.commission_amount || 0), 0);
  const totalPaid = commissionOrders
    .filter((o) => o.commission_status === "paid")
    .reduce((a, o) => a + (o.commission_amount || 0), 0);

  return (
    <div>
      <div
        className="lr-admin-head"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>分潤管理</h1>
        {tab === "partners" && (
          <Btn onClick={() => setAdding(!adding)}>
            {adding ? "取消" : "＋ 新增夥伴"}
          </Btn>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[
          ["partners", "合作夥伴"],
          ["orders", `分潤訂單 ${commissionOrders.length > 0 ? `(${commissionOrders.length})` : ""}`],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              padding: "7px 14px",
              border: `1px solid ${tab === id ? A.primary : A.border}`,
              background: tab === id ? A.primary : "#fff",
              color: tab === id ? "#fff" : A.sub,
              fontSize: 12,
              fontWeight: tab === id ? 700 : 400,
              cursor: "pointer",
              borderRadius: 3,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "partners" && (
        <>
          {adding && (
            <NewAffiliateForm
              events={events}
              onDone={async () => {
                setAdding(false);
                await reload();
                flash("夥伴已建立");
              }}
            />
          )}

          {affiliates.length === 0 && !adding && (
            <div style={{ textAlign: "center", padding: 40, color: A.muted, fontSize: 13 }}>
              還沒有合作夥伴，點右上「新增夥伴」開始
            </div>
          )}

          {affiliates.map((a) => (
            <AffiliateRow
              key={a.id}
              affiliate={a}
              events={events}
              orders={orders}
              reload={reload}
              flash={flash}
            />
          ))}
        </>
      )}

      {tab === "orders" && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {[
              { label: "待結算分潤", value: `NT$${totalPending.toLocaleString()}`, color: A.yellow },
              { label: "已結算分潤", value: `NT$${totalPaid.toLocaleString()}`, color: A.green },
              { label: "分潤訂單數", value: commissionOrders.length, color: A.accent },
            ].map((x) => (
              <div
                key={x.label}
                style={{
                  background: A.surface,
                  border: `1px solid ${A.border}`,
                  borderRadius: 6,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 800, color: x.color }}>{x.value}</div>
                <div style={{ fontSize: 11, color: A.sub, marginTop: 3 }}>{x.label}</div>
              </div>
            ))}
          </div>

          {commissionOrders.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: A.muted, fontSize: 13 }}>
              還沒有透過推廣連結成交的訂單
            </div>
          )}

          {commissionOrders.map((o) => (
            <div
              key={o.id}
              className="lr-admin-card"
              style={{
                background: A.surface,
                border: `1px solid ${A.border}`,
                borderRadius: 6,
                padding: 14,
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {affName(o.affiliate_id)} · {evName(o.event_id)}
                </div>
                <div style={{ fontSize: 11, color: A.sub, marginTop: 2 }}>
                  訂單 {o.id} · NT${o.total?.toLocaleString()} ·{" "}
                  {new Date(o.created_at).toLocaleDateString("zh-TW")}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: A.accent }}>
                  NT${(o.commission_amount || 0).toLocaleString()}
                </div>
              </div>
              <select
                value={o.commission_status || "pending"}
                onChange={(e) => updateCommissionStatus(o.id, e.target.value)}
                style={{
                  padding: "7px 10px",
                  border: `1px solid ${A.border}`,
                  borderRadius: 3,
                  fontSize: 12,
                  background: "#fff",
                  flexShrink: 0,
                }}
              >
                <option value="pending">待結算</option>
                <option value="approved">已確認</option>
                <option value="paid">已付款</option>
                <option value="void">作廢</option>
              </select>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function NewAffiliateForm({ events, onDone }) {
  const [f, setF] = useState({
    name: "",
    code: "",
    contact: "",
    cookie_days: 30,
  });
  const [rules, setRules] = useState([
    { event_id: "", commission_type: "percent", commission_value: 10 },
  ]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const u = (k, v) => setF((p) => ({ ...p, [k]: v }));

  function randomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    u("code", s);
  }

  async function submit() {
    setErr("");
    if (!f.name.trim()) return setErr("請輸入夥伴名稱");
    if (!/^[A-Za-z0-9_-]{3,20}$/.test(f.code))
      return setErr("推廣代碼只能用英數字、底線、減號，長度 3–20");
    if (rules.length === 0) return setErr("請至少設定一組分潤方案");

    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("affiliates")
        .insert({
          name: f.name.trim(),
          code: f.code.trim(),
          contact: f.contact.trim() || null,
          cookie_days: Math.min(365, Math.max(1, parseInt(f.cookie_days) || 30)),
        })
        .select()
        .single();
      if (error) throw new Error(error.message.includes("duplicate") ? "此推廣代碼已被使用" : error.message);

      const rows = rules.map((r) => ({
        affiliate_id: data.id,
        event_id: r.event_id || null,
        commission_type: r.commission_type,
        commission_value: Number(r.commission_value) || 0,
      }));
      const { error: e2 } = await supabase.from("affiliate_rules").insert(rows);
      if (e2) throw new Error("分潤方案儲存失敗：" + e2.message);

      onDone();
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  return (
    <div
      style={{
        background: A.surface,
        border: `1px solid ${A.accent}40`,
        borderRadius: 6,
        padding: 18,
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>新增合作夥伴</div>

      <div
        className="lr-tier-grid"
        style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}
      >
        <div>
          <div style={fieldLabel}>夥伴名稱</div>
          <input
            value={f.name}
            onChange={(e) => u("name", e.target.value)}
            placeholder="王小明 / 某某工作室"
            style={fieldInput}
          />
        </div>
        <div>
          <div style={fieldLabel}>推廣代碼（網址用）</div>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={f.code}
              onChange={(e) => u("code", e.target.value.toUpperCase())}
              placeholder="KOL01"
              style={{ ...fieldInput, flex: 1, minWidth: 0, fontFamily: "monospace" }}
            />
            <button onClick={randomCode} style={smallBtn}>
              產生
            </button>
          </div>
        </div>
        <div>
          <div style={fieldLabel}>聯絡方式（選填）</div>
          <input
            value={f.contact}
            onChange={(e) => u("contact", e.target.value)}
            placeholder="Email 或 LINE"
            style={fieldInput}
          />
        </div>
        <div>
          <div style={fieldLabel}>追蹤天數（最多 365）</div>
          <input
            type="number"
            min={1}
            max={365}
            value={f.cookie_days}
            onChange={(e) => u("cookie_days", e.target.value)}
            style={fieldInput}
          />
        </div>
      </div>

      <div style={{ ...fieldLabel, marginBottom: 8 }}>分潤方案</div>
      {rules.map((r, i) => (
        <RuleEditor
          key={i}
          rule={r}
          events={events}
          onChange={(nr) => setRules(rules.map((x, j) => (j === i ? nr : x)))}
          onRemove={rules.length > 1 ? () => setRules(rules.filter((_, j) => j !== i)) : null}
        />
      ))}
      <Btn
        variant="ghost"
        small
        onClick={() =>
          setRules([...rules, { event_id: "", commission_type: "percent", commission_value: 10 }])
        }
      >
        ＋ 新增一組方案
      </Btn>

      {err && <div style={{ fontSize: 12, color: A.red, margin: "12px 0" }}>{err}</div>}

      <div style={{ marginTop: 14 }}>
        <Btn onClick={submit} disabled={busy}>
          {busy ? "建立中…" : "建立夥伴"}
        </Btn>
      </div>
    </div>
  );
}

function RuleEditor({ rule, events, onChange, onRemove }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        marginBottom: 8,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <select
        value={rule.event_id}
        onChange={(e) => onChange({ ...rule, event_id: e.target.value })}
        style={{ ...fieldInput, flex: "1 1 160px", minWidth: 0, background: "#fff" }}
      >
        <option value="">全站適用（所有活動）</option>
        {events.map((e) => (
          <option key={e.id} value={e.id}>
            {e.title}
          </option>
        ))}
      </select>
      <select
        value={rule.commission_type}
        onChange={(e) => onChange({ ...rule, commission_type: e.target.value })}
        style={{ ...fieldInput, width: 130, background: "#fff" }}
      >
        <option value="percent">百分比抽成</option>
        <option value="fixed">每張固定金額</option>
      </select>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          type="number"
          min={0}
          value={rule.commission_value}
          onChange={(e) => onChange({ ...rule, commission_value: e.target.value })}
          style={{ ...fieldInput, width: 80 }}
        />
        <span style={{ fontSize: 12, color: A.sub, whiteSpace: "nowrap" }}>
          {rule.commission_type === "percent" ? "%" : "元 / 張"}
        </span>
      </div>
      {onRemove && (
        <button onClick={onRemove} style={{ ...smallBtn, color: A.red, borderColor: "#FFB3AD" }}>
          ✕
        </button>
      )}
    </div>
  );
}

function AffiliateRow({ affiliate: a, events, orders, reload, flash }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(a.is_active);
  const [cookieDays, setCookieDays] = useState(a.cookie_days);
  const [rules, setRules] = useState(
    (a.affiliate_rules || []).map((r) => ({
      id: r.id,
      event_id: r.event_id || "",
      commission_type: r.commission_type,
      commission_value: r.commission_value,
    }))
  );
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const myOrders = orders.filter((o) => o.affiliate_id === a.id);
  const earned = myOrders.reduce((s, o) => s + (o.commission_amount || 0), 0);
  const sales = myOrders.reduce((s, o) => s + (o.total || 0), 0);

  const base = typeof window !== "undefined" ? window.location.origin : "";
  const dashUrl = `${base}/partner/${a.dashboard_token}`;

  async function save() {
    setBusy(true);
    await supabase
      .from("affiliates")
      .update({
        is_active: active,
        cookie_days: Math.min(365, Math.max(1, parseInt(cookieDays) || 30)),
      })
      .eq("id", a.id);

    // 規則：全刪重建（數量少，最單純）
    await supabase.from("affiliate_rules").delete().eq("affiliate_id", a.id);
    if (rules.length > 0) {
      await supabase.from("affiliate_rules").insert(
        rules.map((r) => ({
          affiliate_id: a.id,
          event_id: r.event_id || null,
          commission_type: r.commission_type,
          commission_value: Number(r.commission_value) || 0,
        }))
      );
    }
    setBusy(false);
    await reload();
    flash("已儲存");
  }

  async function del() {
    if (!confirm(`確定刪除夥伴「${a.name}」？已成交的分潤紀錄會保留在訂單上。`)) return;
    await supabase.from("affiliates").delete().eq("id", a.id);
    await reload();
    flash("夥伴已刪除");
  }

  return (
    <div
      style={{
        background: A.surface,
        border: `1px solid ${A.border}`,
        borderRadius: 6,
        padding: 16,
        marginBottom: 10,
        opacity: active ? 1 : 0.6,
      }}
    >
      <div
        className="lr-admin-card"
        style={{ display: "flex", alignItems: "center", gap: 12 }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</span>
            <span
              style={{
                fontSize: 11,
                fontFamily: "monospace",
                background: A.accentL,
                color: A.accent,
                padding: "2px 8px",
                borderRadius: 20,
                fontWeight: 700,
              }}
            >
              {a.code}
            </span>
            {!active && (
              <span style={{ fontSize: 10, color: A.red, fontWeight: 700 }}>已停用</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: A.sub, marginTop: 3 }}>
            {myOrders.length} 筆成交 · 帶來 NT${sales.toLocaleString()} · 分潤 NT$
            {earned.toLocaleString()}
            {a.contact && ` · ${a.contact}`}
          </div>
        </div>
        <Btn variant="ghost" small onClick={() => setOpen(!open)}>
          {open ? "收合" : "管理"}
        </Btn>
      </div>

      {open && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${A.border}` }}>
          {/* 儀表板連結 */}
          <div style={{ marginBottom: 14 }}>
            <div style={fieldLabel}>夥伴專屬儀表板（給對方看成效用，請勿公開）</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                readOnly
                value={dashUrl}
                onFocus={(e) => e.target.select()}
                style={{ ...fieldInput, flex: 1, minWidth: 0, fontFamily: "monospace", background: A.bg }}
              />
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(dashUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                }}
                style={{
                  ...smallBtn,
                  background: copied ? A.green : A.primary,
                  color: "#fff",
                  border: "none",
                  padding: "0 16px",
                }}
              >
                {copied ? "已複製" : "複製"}
              </button>
            </div>
          </div>

          {/* 設定 */}
          <div style={{ display: "flex", gap: 16, alignItems: "flex-end", marginBottom: 14, flexWrap: "wrap" }}>
            <div>
              <div style={fieldLabel}>追蹤天數</div>
              <input
                type="number"
                min={1}
                max={365}
                value={cookieDays}
                onChange={(e) => setCookieDays(e.target.value)}
                style={{ ...fieldInput, width: 100 }}
              />
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                cursor: "pointer",
                paddingBottom: 9,
              }}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                style={{ accentColor: A.green }}
              />
              啟用中
            </label>
          </div>

          {/* 分潤方案 */}
          <div style={{ ...fieldLabel, marginBottom: 8 }}>分潤方案</div>
          {rules.map((r, i) => (
            <RuleEditor
              key={i}
              rule={r}
              events={events}
              onChange={(nr) => setRules(rules.map((x, j) => (j === i ? nr : x)))}
              onRemove={() => setRules(rules.filter((_, j) => j !== i))}
            />
          ))}
          <Btn
            variant="ghost"
            small
            onClick={() =>
              setRules([...rules, { event_id: "", commission_type: "percent", commission_value: 10 }])
            }
          >
            ＋ 新增一組方案
          </Btn>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <Btn onClick={save} disabled={busy}>
              {busy ? "儲存中…" : "儲存變更"}
            </Btn>
            <Btn variant="danger" onClick={del}>
              刪除夥伴
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

const fieldLabel = {
  fontSize: 11,
  fontWeight: 600,
  color: A.sub,
  marginBottom: 4,
};

const fieldInput = {
  width: "100%",
  padding: "9px 11px",
  border: `1px solid ${A.border}`,
  borderRadius: 3,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const smallBtn = {
  padding: "0 12px",
  border: `1px solid ${A.border}`,
  background: "#fff",
  borderRadius: 3,
  cursor: "pointer",
  fontSize: 12,
  whiteSpace: "nowrap",
};

// ═══════════════════════════════════════════
// 優惠券 / 折扣碼
// ═══════════════════════════════════════════
function CouponsPage({ coupons, events, affiliates, reload, flash }) {
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState("all");

  const list = coupons.filter((c) => {
    if (filter === "site") return !c.affiliate_id;
    if (filter === "affiliate") return !!c.affiliate_id;
    return true;
  });

  return (
    <div>
      <div
        className="lr-admin-head"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>優惠券 / 折扣碼</h1>
        <Btn onClick={() => setAdding(!adding)}>
          {adding ? "取消" : "＋ 新增優惠券"}
        </Btn>
      </div>

      <div
        style={{
          background: A.accentL,
          border: `1px solid ${A.accent}30`,
          borderRadius: 6,
          padding: 12,
          fontSize: 12,
          color: A.sub,
          marginBottom: 16,
          lineHeight: 1.8,
        }}
      >
        綁定合作夥伴的折扣碼，客人使用時會同時計入該夥伴的分潤，且從他的推廣連結進來會自動帶入。
        不綁夥伴的就是官網自己的促銷券。
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[
          ["all", "全部"],
          ["site", "官網促銷"],
          ["affiliate", "夥伴專屬"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            style={{
              padding: "7px 14px",
              border: `1px solid ${filter === id ? A.primary : A.border}`,
              background: filter === id ? A.primary : "#fff",
              color: filter === id ? "#fff" : A.sub,
              fontSize: 12,
              fontWeight: filter === id ? 700 : 400,
              cursor: "pointer",
              borderRadius: 3,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {adding && (
        <CouponForm
          events={events}
          affiliates={affiliates}
          onDone={async () => {
            setAdding(false);
            await reload();
            flash("優惠券已建立");
          }}
        />
      )}

      {list.length === 0 && !adding && (
        <div style={{ textAlign: "center", padding: 40, color: A.muted, fontSize: 13 }}>
          還沒有優惠券
        </div>
      )}

      {list.map((c) => (
        <CouponRow
          key={c.id}
          coupon={c}
          events={events}
          affiliates={affiliates}
          reload={reload}
          flash={flash}
        />
      ))}
    </div>
  );
}

function CouponForm({ events, affiliates, initial, onDone, onCancel }) {
  const [f, setF] = useState({
    code: "",
    name: "",
    discount_type: "percent",
    discount_value: 10,
    event_id: "",
    affiliate_id: "",
    min_amount: 0,
    max_uses: "",
    max_uses_per_user: 1,
    valid_from: "",
    valid_until: "",
    is_active: true,
    ...(initial || {}),
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const u = (k, v) => setF((p) => ({ ...p, [k]: v }));

  function randomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
    u("code", s);
  }

  async function submit() {
    setErr("");
    if (!/^[A-Za-z0-9_-]{3,24}$/.test(f.code))
      return setErr("折扣碼只能用英數字、底線、減號，長度 3–24");
    if (!f.name.trim()) return setErr("請輸入優惠券名稱");
    if (Number(f.discount_value) <= 0) return setErr("折扣值需大於 0");
    if (f.discount_type === "percent" && Number(f.discount_value) > 100)
      return setErr("百分比不能超過 100");

    const row = {
      code: f.code.trim().toUpperCase(),
      name: f.name.trim(),
      discount_type: f.discount_type,
      discount_value: Number(f.discount_value),
      event_id: f.event_id || null,
      affiliate_id: f.affiliate_id || null,
      min_amount: Number(f.min_amount) || 0,
      max_uses: f.max_uses === "" ? null : Number(f.max_uses),
      max_uses_per_user:
        f.max_uses_per_user === "" ? null : Number(f.max_uses_per_user),
      valid_from: f.valid_from || null,
      valid_until: f.valid_until || null,
      is_active: f.is_active,
    };

    setBusy(true);
    try {
      if (initial?.id) {
        const { error } = await supabase.from("coupons").update(row).eq("id", initial.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("coupons").insert(row);
        if (error)
          throw new Error(
            error.message.includes("duplicate") ? "此折扣碼已存在" : error.message
          );
      }
      onDone();
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  return (
    <div
      style={{
        background: A.surface,
        border: `1px solid ${A.accent}40`,
        borderRadius: 6,
        padding: 18,
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
        {initial?.id ? "編輯優惠券" : "新增優惠券"}
      </div>

      <div
        className="lr-tier-grid"
        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12 }}
      >
        <div>
          <div style={fieldLabel}>折扣碼</div>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={f.code}
              onChange={(e) => u("code", e.target.value.toUpperCase())}
              placeholder="SUMMER30"
              style={{ ...fieldInput, flex: 1, minWidth: 0, fontFamily: "monospace" }}
            />
            <button onClick={randomCode} style={smallBtn}>
              產生
            </button>
          </div>
        </div>
        <div>
          <div style={fieldLabel}>名稱（給客人看）</div>
          <input
            value={f.name}
            onChange={(e) => u("name", e.target.value)}
            placeholder="夏季優惠 9 折"
            style={fieldInput}
          />
        </div>
        <div>
          <div style={fieldLabel}>折扣方式</div>
          <div style={{ display: "flex", gap: 6 }}>
            <select
              value={f.discount_type}
              onChange={(e) => u("discount_type", e.target.value)}
              style={{ ...fieldInput, flex: 1, minWidth: 0, background: "#fff" }}
            >
              <option value="percent">百分比</option>
              <option value="fixed">固定金額</option>
            </select>
            <input
              type="number"
              min={0}
              value={f.discount_value}
              onChange={(e) => u("discount_value", e.target.value)}
              style={{ ...fieldInput, width: 80 }}
            />
            <span
              style={{
                fontSize: 12,
                color: A.sub,
                alignSelf: "center",
                whiteSpace: "nowrap",
              }}
            >
              {f.discount_type === "percent" ? "% off" : "元"}
            </span>
          </div>
        </div>
      </div>

      <div
        className="lr-tier-grid"
        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12 }}
      >
        <div>
          <div style={fieldLabel}>適用活動</div>
          <select
            value={f.event_id}
            onChange={(e) => u("event_id", e.target.value)}
            style={{ ...fieldInput, background: "#fff" }}
          >
            <option value="">全站適用</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div style={fieldLabel}>綁定夥伴（選填，會計分潤）</div>
          <select
            value={f.affiliate_id}
            onChange={(e) => u("affiliate_id", e.target.value)}
            style={{ ...fieldInput, background: "#fff" }}
          >
            <option value="">不綁定（官網促銷券）</option>
            {affiliates.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}（{a.code}）
              </option>
            ))}
          </select>
        </div>
        <div>
          <div style={fieldLabel}>最低消費金額</div>
          <input
            type="number"
            min={0}
            value={f.min_amount}
            onChange={(e) => u("min_amount", e.target.value)}
            placeholder="0 = 不限"
            style={fieldInput}
          />
        </div>
      </div>

      <div
        className="lr-tier-grid"
        style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 12 }}
      >
        <div>
          <div style={fieldLabel}>總使用上限</div>
          <input
            type="number"
            min={1}
            value={f.max_uses}
            onChange={(e) => u("max_uses", e.target.value)}
            placeholder="留空 = 不限"
            style={fieldInput}
          />
        </div>
        <div>
          <div style={fieldLabel}>每人可用次數</div>
          <input
            type="number"
            min={1}
            value={f.max_uses_per_user}
            onChange={(e) => u("max_uses_per_user", e.target.value)}
            placeholder="留空 = 不限"
            style={fieldInput}
          />
        </div>
        <div>
          <div style={fieldLabel}>開始時間</div>
          <input
            type="datetime-local"
            value={f.valid_from}
            onChange={(e) => u("valid_from", e.target.value)}
            style={fieldInput}
          />
        </div>
        <div>
          <div style={fieldLabel}>結束時間</div>
          <input
            type="datetime-local"
            value={f.valid_until}
            onChange={(e) => u("valid_until", e.target.value)}
            style={fieldInput}
          />
        </div>
      </div>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          cursor: "pointer",
          marginBottom: 12,
        }}
      >
        <input
          type="checkbox"
          checked={f.is_active}
          onChange={(e) => u("is_active", e.target.checked)}
          style={{ accentColor: A.green }}
        />
        啟用中
      </label>

      {err && <div style={{ fontSize: 12, color: A.red, marginBottom: 10 }}>{err}</div>}

      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={submit} disabled={busy}>
          {busy ? "儲存中…" : initial?.id ? "儲存變更" : "建立優惠券"}
        </Btn>
        {onCancel && (
          <Btn variant="ghost" onClick={onCancel}>
            取消
          </Btn>
        )}
      </div>
    </div>
  );
}

function CouponRow({ coupon: c, events, affiliates, reload, flash }) {
  const [editing, setEditing] = useState(false);

  async function del() {
    if (!confirm(`確定刪除折扣碼「${c.code}」？`)) return;
    await supabase.from("coupons").delete().eq("id", c.id);
    await reload();
    flash("已刪除");
  }

  async function toggleActive() {
    await supabase.from("coupons").update({ is_active: !c.is_active }).eq("id", c.id);
    await reload();
    flash(c.is_active ? "已停用" : "已啟用");
  }

  if (editing)
    return (
      <CouponForm
        events={events}
        affiliates={affiliates}
        initial={{
          id: c.id,
          code: c.code,
          name: c.name,
          discount_type: c.discount_type,
          discount_value: c.discount_value,
          event_id: c.event_id || "",
          affiliate_id: c.affiliate_id || "",
          min_amount: c.min_amount || 0,
          max_uses: c.max_uses ?? "",
          max_uses_per_user: c.max_uses_per_user ?? "",
          valid_from: c.valid_from ? c.valid_from.slice(0, 16) : "",
          valid_until: c.valid_until ? c.valid_until.slice(0, 16) : "",
          is_active: c.is_active,
        }}
        onCancel={() => setEditing(false)}
        onDone={async () => {
          setEditing(false);
          await reload();
          flash("已更新");
        }}
      />
    );

  const usageText =
    c.max_uses != null
      ? `已用 ${c.used_count || 0} / ${c.max_uses}`
      : `已用 ${c.used_count || 0} 次`;

  return (
    <div
      className="lr-admin-card"
      style={{
        background: A.surface,
        border: `1px solid ${A.border}`,
        borderRadius: 6,
        padding: 14,
        marginBottom: 8,
        display: "flex",
        alignItems: "center",
        gap: 12,
        opacity: c.is_active ? 1 : 0.55,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "monospace",
              background: A.primaryL,
              padding: "3px 10px",
              borderRadius: 3,
            }}
          >
            {c.code}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: A.accent,
            }}
          >
            {c.discount_type === "percent"
              ? `${Number(c.discount_value)}% off`
              : `折 NT$${Number(c.discount_value)}`}
          </span>
          {c.affiliates && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 20,
                background: "#F3E8FF",
                color: "#7C3AED",
              }}
            >
              夥伴 {c.affiliates.name}
            </span>
          )}
          {!c.is_active && (
            <span style={{ fontSize: 10, color: A.red, fontWeight: 700 }}>已停用</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: A.sub, marginTop: 4 }}>
          {c.events ? c.events.title : "全站適用"} · {usageText}
          {c.min_amount > 0 && ` · 滿 NT$${c.min_amount}`}
          {c.valid_until &&
            ` · 至 ${new Date(c.valid_until).toLocaleDateString("zh-TW")}`}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <Btn variant="ghost" small onClick={() => setEditing(true)}>
          編輯
        </Btn>
        <Btn variant="ghost" small onClick={toggleActive}>
          {c.is_active ? "停用" : "啟用"}
        </Btn>
        <Btn variant="danger" small onClick={del}>
          刪除
        </Btn>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// 票種編輯器（活動編輯內的分頁）
// ═══════════════════════════════════════════
function TicketsEditor({ eventId }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  async function load() {
    if (!eventId) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("tickets")
      .select("*")
      .eq("event_id", eventId)
      .order("sort_order");
    setTickets(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [eventId]);

  function flashMsg(t) {
    setMsg(t);
    setTimeout(() => setMsg(""), 2200);
  }

  async function addTicket() {
    const maxSort = Math.max(0, ...tickets.map((t) => t.sort_order || 0));
    const { data, error } = await supabase
      .from("tickets")
      .insert({
        event_id: eventId,
        label: "新票種",
        price: 1000,
        seat_rows: 5,
        seat_cols: 10,
        max_per_order: 4,
        sort_order: maxSort + 1,
        is_hidden: true,
      })
      .select()
      .single();
    if (error) return flashMsg("新增失敗：" + error.message);

    // 產生座位
    await supabase.rpc("seed_seats_for_ticket", { p_ticket_id: data.id });
    await load();
    flashMsg("已新增票種（預設為隱藏，設定完再開啟）");
  }

  if (!eventId)
    return (
      <div
        style={{
          padding: 30,
          textAlign: "center",
          color: A.sub,
          fontSize: 13,
          lineHeight: 1.8,
        }}
      >
        請先儲存活動，才能設定票種。
        <br />
        （填好基本資訊後按右下角「儲存」，再重新開啟編輯）
      </div>
    );

  if (loading)
    return (
      <div style={{ padding: 30, textAlign: "center", color: A.muted, fontSize: 13 }}>
        載入票種中…
      </div>
    );

  return (
    <div>
      <div
        style={{
          background: "#FFFBEB",
          border: "1px solid #FFE0A3",
          borderRadius: 4,
          padding: 12,
          fontSize: 11,
          color: "#8A5A00",
          marginBottom: 14,
          lineHeight: 1.8,
        }}
      >
        每個票種可以各自設定開賣與結束時間（早鳥、晚鳥就是這樣做）。
        時間留空代表不限制。勾選「暫時隱藏」可以讓票種先不出現在前台。
        調整座位排數欄數後會重新產生座位，已售出的座位不受影響。
      </div>

      {msg && (
        <div
          style={{
            background: A.accentL,
            color: A.accent,
            padding: "8px 12px",
            borderRadius: 4,
            fontSize: 12,
            marginBottom: 12,
          }}
        >
          {msg}
        </div>
      )}

      {tickets.length === 0 && (
        <div style={{ textAlign: "center", padding: 24, color: A.muted, fontSize: 13 }}>
          這個活動還沒有票種
        </div>
      )}

      {tickets.map((t) => (
        <TicketRow key={t.id} ticket={t} reload={load} flashMsg={flashMsg} />
      ))}

      <Btn variant="ghost" onClick={addTicket}>
        ＋ 新增票種
      </Btn>
    </div>
  );
}

function TicketRow({ ticket, reload, flashMsg }) {
  const [t, setT] = useState({
    ...ticket,
    sale_start: ticket.sale_start ? ticket.sale_start.slice(0, 16) : "",
    sale_end: ticket.sale_end ? ticket.sale_end.slice(0, 16) : "",
  });
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const u = (k, v) => setT((p) => ({ ...p, [k]: v }));

  async function save() {
    setBusy(true);
    const seatsChanged =
      Number(t.seat_rows) !== ticket.seat_rows ||
      Number(t.seat_cols) !== ticket.seat_cols;

    const { error } = await supabase
      .from("tickets")
      .update({
        label: t.label,
        description: t.description || null,
        price: Number(t.price) || 0,
        seat_rows: Number(t.seat_rows) || 1,
        seat_cols: Number(t.seat_cols) || 1,
        max_per_order: Number(t.max_per_order) || 4,
        sort_order: Number(t.sort_order) || 0,
        sale_start: t.sale_start || null,
        sale_end: t.sale_end || null,
        is_hidden: !!t.is_hidden,
      })
      .eq("id", ticket.id);

    if (error) {
      setBusy(false);
      return flashMsg("儲存失敗：" + error.message);
    }

    if (seatsChanged) {
      await supabase.rpc("seed_seats_for_ticket", { p_ticket_id: ticket.id });
    }

    setBusy(false);
    await reload();
    flashMsg("票種已儲存");
  }

  async function del() {
    if (!confirm(`確定刪除票種「${t.label}」？相關座位也會一併刪除。`)) return;
    await supabase.from("tickets").delete().eq("id", ticket.id);
    await reload();
    flashMsg("票種已刪除");
  }

  const now = Date.now();
  let statusLabel = "販售中";
  let statusColor = A.green;
  if (t.is_hidden) {
    statusLabel = "已隱藏";
    statusColor = A.muted;
  } else if (t.sale_start && new Date(t.sale_start).getTime() > now) {
    statusLabel = "尚未開賣";
    statusColor = A.yellow;
  } else if (t.sale_end && new Date(t.sale_end).getTime() < now) {
    statusLabel = "已結束";
    statusColor = A.red;
  }

  return (
    <div
      style={{
        border: `1px solid ${A.border}`,
        borderRadius: 4,
        padding: 12,
        marginBottom: 8,
        background: t.is_hidden ? A.bg : "#fff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{t.label}</span>
            <span style={{ fontSize: 12, color: A.accent, fontWeight: 700 }}>
              NT${Number(t.price).toLocaleString()}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 20,
                background: statusColor + "1A",
                color: statusColor,
              }}
            >
              {statusLabel}
            </span>
          </div>
          <div style={{ fontSize: 11, color: A.sub, marginTop: 2 }}>
            {t.seat_rows} 排 × {t.seat_cols} 位 = {t.seat_rows * t.seat_cols} 個座位
          </div>
        </div>
        <Btn variant="ghost" small onClick={() => setOpen(!open)}>
          {open ? "收合" : "編輯"}
        </Btn>
      </div>

      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${A.border}` }}>
          <div
            className="lr-tier-grid"
            style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 10 }}
          >
            <div>
              <div style={fieldLabel}>票種名稱</div>
              <input
                value={t.label}
                onChange={(e) => u("label", e.target.value)}
                placeholder="早鳥票 / 全票 / 學生票"
                style={fieldInput}
              />
            </div>
            <div>
              <div style={fieldLabel}>票價</div>
              <input
                type="number"
                min={0}
                value={t.price}
                onChange={(e) => u("price", e.target.value)}
                style={fieldInput}
              />
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={fieldLabel}>說明（選填）</div>
            <input
              value={t.description || ""}
              onChange={(e) => u("description", e.target.value)}
              placeholder="含導覽手冊、限量 50 張…"
              style={fieldInput}
            />
          </div>

          <div
            className="lr-tier-grid"
            style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 10 }}
          >
            <div>
              <div style={fieldLabel}>座位排數</div>
              <input
                type="number"
                min={1}
                value={t.seat_rows}
                onChange={(e) => u("seat_rows", e.target.value)}
                style={fieldInput}
              />
            </div>
            <div>
              <div style={fieldLabel}>每排座位數</div>
              <input
                type="number"
                min={1}
                value={t.seat_cols}
                onChange={(e) => u("seat_cols", e.target.value)}
                style={fieldInput}
              />
            </div>
            <div>
              <div style={fieldLabel}>單筆最多可買</div>
              <input
                type="number"
                min={1}
                value={t.max_per_order}
                onChange={(e) => u("max_per_order", e.target.value)}
                style={fieldInput}
              />
            </div>
            <div>
              <div style={fieldLabel}>排序</div>
              <input
                type="number"
                value={t.sort_order || 0}
                onChange={(e) => u("sort_order", e.target.value)}
                style={fieldInput}
              />
            </div>
          </div>

          <div
            className="lr-tier-grid"
            style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 10 }}
          >
            <div>
              <div style={fieldLabel}>開賣時間（留空 = 不限）</div>
              <input
                type="datetime-local"
                value={t.sale_start}
                onChange={(e) => u("sale_start", e.target.value)}
                style={fieldInput}
              />
            </div>
            <div>
              <div style={fieldLabel}>結束時間（留空 = 不限）</div>
              <input
                type="datetime-local"
                value={t.sale_end}
                onChange={(e) => u("sale_end", e.target.value)}
                style={fieldInput}
              />
            </div>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              cursor: "pointer",
              marginBottom: 12,
              padding: "8px 10px",
              border: `1px solid ${t.is_hidden ? A.yellow : A.border}`,
              background: t.is_hidden ? "#FFFBEB" : "#fff",
              borderRadius: 4,
              width: "fit-content",
            }}
          >
            <input
              type="checkbox"
              checked={!!t.is_hidden}
              onChange={(e) => u("is_hidden", e.target.checked)}
              style={{ accentColor: A.yellow }}
            />
            暫時隱藏此票種（前台不顯示）
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={save} disabled={busy}>
              {busy ? "儲存中…" : "儲存票種"}
            </Btn>
            <Btn variant="danger" small onClick={del}>
              刪除
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
