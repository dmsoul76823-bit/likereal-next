"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { NAV, ROLE, ALL_PERMS } from "@/lib/admin";

export default function Staff({ me, flash }) {
  const [rows, setRows] = useState(null);
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("staff").select("*").order("email");
    if (error) setErr(error.message);
    else setRows(data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function remove(s) {
    if (String(s.id) === String(me.id)) {
      return setErr("不能刪除自己的帳號");
    }
    if (!window.confirm(`確定把「${s.name || s.email}」移出後台人員名單？\n\n（不會刪除他的 Supabase 登入帳號，只是不能再進後台）`)) return;
    const { error } = await supabase.from("staff").delete().eq("id", s.id);
    if (error) return setErr("刪除失敗：" + error.message);
    flash?.("已移出名單");
    load();
  }

  if (err && !rows) return <div className="panel"><h3>讀取失敗</h3><div className="hint">{err}</div></div>;
  if (!rows) return <div className="panel"><div className="hint">載入中…</div></div>;

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>人員權限</h3>
            <div className="hint" style={{ margin: 0 }}>後台帳號與可用功能</div>
          </div>
          <div className="tools">
            <button className="btn btn-brand btn-sm" onClick={() => setEdit({ name: "", email: "", role: "staff", perms: ["checkin", "orders"] })}>
              ＋ 新增人員
            </button>
          </div>
        </div>

        {err && <div style={{ color: "var(--err)", fontSize: 13, marginBottom: 10 }}>{err}</div>}

        <table>
          <thead>
            <tr><th>姓名</th><th>帳號</th><th>身分</th><th>可用功能</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const perms = s.role === "admin" ? ALL_PERMS : (Array.isArray(s.perms) ? s.perms : []);
              return (
                <tr key={s.id}>
                  <td>
                    <b>{s.name || "—"}</b>
                    {String(s.id) === String(me.id) && <span className="tag info" style={{ marginLeft: 6 }}>你自己</span>}
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{s.email}</td>
                  <td><span className={`tag ${s.role === "admin" ? "b" : ""}`}>{ROLE[s.role] || s.role}</span></td>
                  <td style={{ fontSize: 12, color: "var(--muted)" }}>
                    {s.role === "admin"
                      ? "全部功能"
                      : perms.length
                      ? NAV.filter((n) => perms.includes(n.k)).map((n) => n.t).join("、")
                      : "（沒有勾選任何功能，登入後會看不到東西）"}
                  </td>
                  <td>
                    <div className="row-act">
                      <button className="btn btn-ghost btn-sm" onClick={() => setEdit(s)}>編輯</button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(s)}>移除</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="spec" style={{ marginTop: 14 }}>
          <b>💡 身分與權限的關係</b>「管理者」自動擁有全部功能，勾選不影響；其他身分只看得到勾選的項目。
          <br />驗票等動作在資料庫端也會再檢查一次權限，不是只靠畫面隱藏。
        </div>
      </div>

      {edit && (
        <StaffEditor
          row={edit}
          me={me}
          flash={flash}
          onClose={() => setEdit(null)}
          onSaved={async () => { setEdit(null); await load(); }}
        />
      )}
    </>
  );
}

function StaffEditor({ row, me, flash, onClose, onSaved }) {
  const isNew = !row.id;
  const [name, setName] = useState(row.name || "");
  const [email, setEmail] = useState(row.email || "");
  const [role, setRole] = useState(row.role || "staff");
  const [perms, setPerms] = useState(Array.isArray(row.perms) ? row.perms : []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const toggle = (k) =>
    setPerms((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  async function save() {
    if (!name.trim() || !email.trim()) return setErr("姓名與帳號都要填");
    if (role !== "admin" && !perms.length) return setErr("請至少勾選一項功能，否則這個帳號登入後看不到任何東西");

    // 不讓人把自己從管理者降級後鎖死自己
    if (!isNew && String(row.id) === String(me.id) && me.role === "admin" && role !== "admin") {
      if (!window.confirm("你正在把自己從管理者降級。降級後可能無法再進入「人員權限」這一頁。確定嗎？")) return;
    }

    setBusy(true);
    setErr("");
    try {
      if (isNew) {
        const { error } = await supabase.rpc("add_staff", {
          p_email: email.trim().toLowerCase(),
          p_name: name.trim(),
          p_role: role,
          p_perms: perms,
        });
        if (error) throw error;
        flash?.("人員已新增");
      } else {
        const { error } = await supabase
          .from("staff")
          .update({ name: name.trim(), role, perms })
          .eq("id", row.id);
        if (error) throw error;
        flash?.("人員已更新");
      }
      onSaved?.();
    } catch (e) {
      const m = e?.message || String(e);
      setErr(
        /not found|查無|does not exist/i.test(m)
          ? `找不到這個 Email 的登入帳號。請先到 Supabase → Authentication → Users → Add user 建立（記得勾 Auto Confirm），再回來新增。（${m}）`
          : "儲存失敗：" + m
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mask on" onClick={onClose} />
      <div className="modal on">
        <div className="modal-head">
          <h3>{isNew ? "新增人員" : "編輯人員"}</h3>
          <span className="x" onClick={onClose}>✕</span>
        </div>
        <div className="modal-body">
          <div className="fgrid">
            <div className="fld"><label>姓名</label>
              <input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="fld"><label>帳號 Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={!isNew}
                style={!isNew ? { opacity: 0.7 } : undefined}
              /></div>

            {isNew && (
              <div className="fld full">
                <div className="spec">
                  <b>💡 新增人員步驟</b>
                  <br />1) 先到 Supabase → Authentication → Users → Add user 建立帳號（勾 Auto Confirm）
                  <br />2) 回到這裡填入<b>相同的 Email</b>與權限後儲存
                </div>
              </div>
            )}

            <div className="fld full"><label>身分</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                {Object.keys(ROLE).map((r) => <option key={r} value={r}>{ROLE[r]}</option>)}
              </select></div>

            <div className="fld full">
              <label>可用功能（個別授權）</label>
              <div className="perm">
                {NAV.map((n) => (
                  <label key={n.k}>
                    <input
                      type="checkbox"
                      checked={role === "admin" || perms.includes(n.k)}
                      disabled={role === "admin"}
                      onChange={() => toggle(n.k)}
                    />
                    {n.t}
                  </label>
                ))}
              </div>
              {role === "admin" && (
                <small style={{ color: "var(--muted)", fontSize: 11, display: "block", marginTop: 6 }}>
                  管理者自動擁有全部功能，不需要勾選。
                </small>
              )}
            </div>
          </div>
          {err && <div style={{ color: "var(--err)", fontSize: 13, marginTop: 12, lineHeight: 1.8 }}>{err}</div>}
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
          <button className="btn btn-brand" onClick={save} disabled={busy}>{busy ? "儲存中…" : "儲存"}</button>
        </div>
      </div>
    </>
  );
}
