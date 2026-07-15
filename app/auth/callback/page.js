"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, getMember, upsertMember } from "@/lib/supabase";
import { C } from "@/lib/theme";

export default function AuthCallback() {
  const router = useRouter();
  const [needName, setNeedName] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [user, setUser] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user;
      if (!u) {
        router.push("/login");
        return;
      }
      setUser(u);
      const m = await getMember(u.id);
      if (m && m.name) {
        router.push("/account");
      } else {
        // Google 登入但還沒有會員資料 → 要求補本名
        setName(u.user_metadata?.full_name || "");
        setNeedName(true);
      }
    })();
  }, []);

  async function saveProfile() {
    if (!name.trim()) return;
    setBusy(true);
    await upsertMember({
      id: user.id,
      email: user.email,
      name,
      phone: phone || null,
    });
    setBusy(false);
    router.push("/account");
  }

  if (!needName)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.muted,
        }}
      >
        登入中…
      </div>
    );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: "#fff",
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          padding: 28,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
          完成會員資料
        </div>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 20 }}>
          歡迎加入 Like Real，請填寫您的本名以完成註冊。
        </div>
        <div style={{ marginBottom: 12 }}>
          <div
            style={{ fontSize: 11, fontWeight: 600, color: C.sub, marginBottom: 4 }}
          >
            本名 <span style={{ color: C.red }}>*</span>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="王小明"
            style={{
              width: "100%",
              padding: "10px 12px",
              border: `1px solid ${C.border}`,
              borderRadius: 3,
              fontSize: 14,
              outline: "none",
            }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div
            style={{ fontSize: 11, fontWeight: 600, color: C.sub, marginBottom: 4 }}
          >
            手機（選填）
          </div>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09XXXXXXXX"
            style={{
              width: "100%",
              padding: "10px 12px",
              border: `1px solid ${C.border}`,
              borderRadius: 3,
              fontSize: 14,
              outline: "none",
            }}
          />
        </div>
        <button
          onClick={saveProfile}
          disabled={busy || !name.trim()}
          style={{
            width: "100%",
            padding: 13,
            background: name.trim() ? C.primary : C.border,
            color: "#fff",
            border: "none",
            borderRadius: 3,
            fontWeight: 700,
            fontSize: 14,
            cursor: name.trim() ? "pointer" : "not-allowed",
          }}
        >
          {busy ? "儲存中…" : "完成註冊"}
        </button>
      </div>
    </div>
  );
}
