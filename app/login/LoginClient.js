"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, updateMyProfile } from "@/lib/supabase";

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
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  const u = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  function switchMode(m) {
    setMode(m);
    setErr("");
    setOk("");
  }

  async function handleLogin() {
    setErr("");
    setOk("");
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
    setOk("");
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

    // 會員資料列由 auth.users 的 trigger 自動建立，這裡只補姓名與電話。
    // 若開了 email 驗證，此刻還沒有 session，更新會被 RLS 擋下，
    // 等使用者驗證完回到 /auth/callback 再補。
    if (data.user) {
      try {
        await updateMyProfile({ name: form.name, phone: form.phone || null });
      } catch (e) {
        /* 交給 callback 補 */
      }
    }
    setBusy(false);

    if (data.session) {
      router.push("/account");
    } else {
      setMode("login");
      setOk("註冊成功，請用剛才的 Email 與密碼登入。");
    }
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  const submit = mode === "login" ? handleLogin : handleRegister;

  return (
    <div className="wv-root lg-wrap">
      <div className="lg-box">
        <div className="lg-head">
          <Link href="/" aria-label="Wonder V 首頁">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="logo-img" src="/logo-wonderv.png" alt="Wonder V" />
          </Link>
          <div className="sub">{mode === "login" ? "Member Login" : "Join Wonder V"}</div>
        </div>

        <div className="lg-card">
          <div className="lg-tabs" role="tablist">
            {[
              ["login", "登入"],
              ["register", "註冊"],
            ].map(([m, label]) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                className={mode === m ? "on" : undefined}
                onClick={() => switchMode(m)}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "register" && (
            <Fld label="本名" required value={form.name} onChange={(v) => u("name", v)} ph="王小明" />
          )}
          <Fld
            label="Email（作為帳號）"
            required
            type="email"
            value={form.email}
            onChange={(v) => u("email", v)}
            ph="you@example.com"
          />
          <Fld
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
              <Fld
                label="再次輸入密碼"
                required
                type="password"
                value={form.password2}
                onChange={(v) => u("password2", v)}
                onEnter={handleRegister}
              />
              <Fld
                label="手機（選填）"
                value={form.phone}
                onChange={(v) => u("phone", v)}
                ph="09XXXXXXXX"
              />
            </>
          )}

          {err && <div className="lg-err">{err}</div>}
          {ok && <div className="lg-ok">{ok}</div>}

          <button
            type="button"
            className="btn btn-brand lg-submit"
            onClick={submit}
            disabled={busy}
          >
            {busy ? "處理中…" : mode === "login" ? "登入" : "建立帳號"}
          </button>

          <div className="lg-or">
            <i />
            <span>或</span>
            <i />
          </div>

          <button type="button" className="lg-google" onClick={handleGoogle}>
            <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
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
            <div className="lg-note">使用 Google 註冊後，仍需補填本名等會員資料</div>
          )}
        </div>

        <Link href="/" className="lg-back">
          ← 回到首頁
        </Link>
      </div>
    </div>
  );
}

function Fld({ label, value, onChange, ph, type = "text", required, onEnter }) {
  return (
    <div className="lg-fld">
      <label>
        {label}
        {required && <span className="req"> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter && onEnter()}
        placeholder={ph}
      />
    </div>
  );
}
