"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, upsertMember } from "@/lib/supabase";
import { C } from "@/lib/theme";

export default function LoginClient() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // login | register
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password2: "",
    phone: "",
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const u = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function handleLogin() {
    setErr("");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    setBusy(false);
    if (error) return setErr("Email 或密碼錯誤");
    router.push("/account");
  }

  async function handleRegister() {
    setErr("");
    if (!form.name.trim()) return setErr("請填寫本名");
    if (form.password.length < 6) return setErr("密碼至少 6 個字元");
    if (form.password !== form.password2) return setErr("兩次密碼不一致");

    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });
    if (error) {
      setBusy(false);
      return setErr(
        error.message.includes("already")
          ? "此 Email 已註冊過，請直接登入"
          : "註冊失敗：" + error.message
      );
    }

    // 建立會員資料
    if (data.user) {
      try {
        await upsertMember({
          id: data.user.id,
          email: form.email,
          name: form.name,
          phone: form.phone || null,
        });
      } catch (e) {
        // RLS 需登入後才能寫，若 email 驗證開啟會在此失敗，稍後於 callback 補建
      }
    }
    setBusy(false);

    // 若專案未開 email 驗證，signUp 後即有 session
    if (data.session) {
      router.push("/account");
    } else {
      setErr("");
      setMode("login");
      alert("註冊成功！請直接登入。");
    }
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

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
      <div style={{ width: "100%", maxWidth: 400 }}>
        <Link
          href="/"
          style={{
            display: "block",
            textAlign: "center",
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          LIKE <span style={{ fontWeight: 200 }}>REAL</span>
        </Link>
        <div
          style={{
            textAlign: "center",
            fontSize: 12,
            color: C.muted,
            marginBottom: 24,
          }}
        >
          會員{mode === "login" ? "登入" : "註冊"}
        </div>

        <div
          style={{
            background: "#fff",
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: 28,
          }}
        >
          <div style={{ display: "flex", marginBottom: 20 }}>
            {[
              ["login", "登入"],
              ["register", "註冊"],
            ].map(([m, label]) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setErr("");
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  border: "none",
                  borderBottom: `2px solid ${mode === m ? C.primary : C.border}`,
                  background: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: mode === m ? 700 : 400,
                  color: mode === m ? C.text : C.sub,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "register" && (
            <FormRow
              label="本名"
              required
              value={form.name}
              onChange={(v) => u("name", v)}
              ph="王小明"
            />
          )}
          <FormRow
            label="Email（作為帳號）"
            required
            type="email"
            value={form.email}
            onChange={(v) => u("email", v)}
            ph="you@example.com"
          />
          <FormRow
            label="密碼"
            required
            type="password"
            value={form.password}
            onChange={(v) => u("password", v)}
            ph={mode === "register" ? "至少 6 個字元" : ""}
            onEnter={mode === "login" ? handleLogin : undefined}
          />
          {mode === "register" && (
            <>
              <FormRow
                label="再次輸入密碼"
                required
                type="password"
                value={form.password2}
                onChange={(v) => u("password2", v)}
              />
              <FormRow
                label="手機（選填）"
                value={form.phone}
                onChange={(v) => u("phone", v)}
                ph="09XXXXXXXX"
              />
            </>
          )}

          {err && (
            <div style={{ fontSize: 12, color: C.red, marginBottom: 12 }}>
              {err}
            </div>
          )}

          <button
            onClick={mode === "login" ? handleLogin : handleRegister}
            disabled={busy}
            style={{
              width: "100%",
              padding: 13,
              background: C.primary,
              color: "#fff",
              border: "none",
              borderRadius: 3,
              fontWeight: 700,
              fontSize: 14,
              cursor: busy ? "wait" : "pointer",
              marginBottom: 14,
            }}
          >
            {busy ? "處理中…" : mode === "login" ? "登入" : "註冊"}
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              margin: "6px 0 14px",
            }}
          >
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontSize: 11, color: C.muted }}>或</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          <button
            onClick={handleGoogle}
            style={{
              width: "100%",
              padding: 12,
              background: "#fff",
              border: `1px solid ${C.border}`,
              borderRadius: 3,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 48 48">
              <path
                fill="#EA4335"
                d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.7 30.1 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.3 17.6 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.1 24.6c0-1.6-.1-3.2-.4-4.6H24v9.1h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 6.6-9.6 6.6-16.9z"
              />
              <path
                fill="#FBBC05"
                d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C1 16.5 0 20.1 0 24s1 7.5 2.6 10.8l7.8-6.1z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.3-4.5 2.1-8.8 2.1-6.4 0-11.7-3.8-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z"
              />
            </svg>
            使用 Google 帳號{mode === "login" ? "登入" : "註冊"}
          </button>

          {mode === "register" && (
            <div
              style={{
                fontSize: 10,
                color: C.muted,
                marginTop: 12,
                lineHeight: 1.6,
                textAlign: "center",
              }}
            >
              使用 Google 註冊仍需補填本名等會員資料
            </div>
          )}
        </div>

        <Link
          href="/"
          style={{
            display: "block",
            textAlign: "center",
            marginTop: 16,
            fontSize: 12,
            color: C.muted,
          }}
        >
          ← 回到首頁
        </Link>
      </div>
    </div>
  );
}

function FormRow({ label, value, onChange, ph, type = "text", required, onEnter }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{ fontSize: 11, fontWeight: 600, color: C.sub, marginBottom: 4 }}
      >
        {label}
        {required && <span style={{ color: C.red }}> *</span>}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter && onEnter()}
        placeholder={ph}
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
  );
}
