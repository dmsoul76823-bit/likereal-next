"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * members 已經改接 Supabase Auth：
 *   id 是 auth.users.id（uuid），等級改用 tier_id 指向 member_tiers，
 *   不再有舊的 vip 文字欄位。舊的 5 筆示範資料留在 members_legacy。
 *
 * email 這裡設成唯讀：它要跟 auth.users 的帳號一致，
 * 在這裡改只會讓兩邊對不上，真要換帳號得走 Auth 的流程。
 */
export default function Members({ flash }) {
  const [rows, setRows] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const [m, t] = await Promise.all([
      supabase.from("members").select("*, member_tiers(id,name,level)").order("join_date", { ascending: false }),
      supabase.from("member_tiers").select("id,name,level").order("level"),
    ]);
    if (m.error) setErr(m.error.message);
    else { setRows(m.data || []); setErr(""); }
    if (!t.error) setTiers(t.data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return (rows || []).filter(
      (m) =>
        !k ||
        String(m.name || "").includes(q.trim()) ||
        String(m.email || "").toLowerCase().includes(k) ||
        String(m.phone || "").includes(q.trim())
    );
  }, [rows, q]);

  if (err && !rows) return <div className="panel"><h3>讀取失敗</h3><div className="hint">{err}</div></div>;
  if (!rows) return <div className="panel"><div className="hint">載入中…</div></div>;

  const totalWallet = rows.reduce((s, m) => s + (Number(m.wallet) || 0), 0);
  const totalPoints = rows.reduce((s, m) => s + (Number(m.points) || 0), 0);
  const totalPending = rows.reduce((s, m) => s + (Number(m.pending_points) || 0), 0);

  return (
    <>
      <div className="stat-grid">
        <div className="stat">
          <div className="l">會員數</div>
          <div className="v">{rows.length.toLocaleString()}</div>
          <div className="c">已註冊帳號</div>
        </div>
        <div className="stat">
          <div className="l">錢包總餘額</div>
          <div className="v">{totalWallet.toLocaleString()}</div>
          <div className="c">尚未使用的儲值幣</div>
        </div>
        <div className="stat">
          <div className="l">可用點數</div>
          <div className="v">{totalPoints.toLocaleString()}</div>
          <div className="c">已解鎖</div>
        </div>
        <div className="stat">
          <div className="l">未解鎖點數</div>
          <div className="v">{totalPending.toLocaleString()}</div>
          <div className="c">票券演出後 / 商品 10 天後發放</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>會員管理</h3>
            <div className="hint" style={{ margin: 0 }}>前台會員、等級與儲值</div>
          </div>
          <div className="tools">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋姓名 / Email / 電話…" />
          </div>
        </div>

        {err && <div style={{ color: "var(--err)", fontSize: 13, marginBottom: 10 }}>{err}</div>}

        {list.length === 0 ? (
          <div className="empty">沒有符合的會員</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>會員</th><th>聯絡方式</th><th>等級</th><th>錢包</th>
                <th>點數</th><th>累積消費</th><th>加入日期</th><th />
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id}>
                  <td><b>{m.name || "（未填姓名）"}</b></td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>
                    {m.phone || "—"}
                    <br />
                    {m.email}
                  </td>
                  <td>
                    {m.member_tiers?.name
                      ? <span className="tag b">{m.member_tiers.name}</span>
                      : <span className="hint">未設定</span>}
                  </td>
                  <td style={{ color: "var(--brand3)", fontWeight: 700 }}>
                    {(Number(m.wallet) || 0).toLocaleString()} 幣
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {(Number(m.points) || 0).toLocaleString()}
                    {Number(m.pending_points) > 0 && (
                      <span className="hint"> （未解鎖 {Number(m.pending_points).toLocaleString()}）</span>
                    )}
                  </td>
                  <td>NT${(Number(m.total_spent) || 0).toLocaleString()}</td>
                  <td style={{ color: "var(--muted)" }}>{m.join_date}</td>
                  <td>
                    <div className="row-act">
                      <button className="btn btn-ghost btn-sm" onClick={() => setEdit(m)}>編輯</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="spec" style={{ marginTop: 14 }}>
          <b>💡 關於錢包與點數</b>這裡直接改儲值幣不會留下異動紀錄。
          點數則相反，是由 apply_order_points / release_due_points 依訂單計算的，
          請不要在這裡手動調整，否則會跟 point_logs 的紀錄對不起來。
        </div>
      </div>

      {edit && (
        <MemberEditor
          member={edit}
          tiers={tiers}
          flash={flash}
          onClose={() => setEdit(null)}
          onSaved={async () => { setEdit(null); await load(); }}
        />
      )}
    </>
  );
}

function MemberEditor({ member, tiers, flash, onClose, onSaved }) {
  const [f, setF] = useState({
    name: member.name || "",
    phone: member.phone || "",
    tier_id: member.tier_id || "",
    wallet: member.wallet ?? 0,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const before = Number(member.wallet) || 0;
  const after = Number(f.wallet) || 0;
  const diff = after - before;

  async function save() {
    if (!String(f.name || "").trim()) return setErr("請填寫姓名");

    if (diff !== 0) {
      const ok = window.confirm(
        `錢包餘額會從 ${before.toLocaleString()} 改成 ${after.toLocaleString()} 幣` +
          `（${diff > 0 ? "+" : ""}${diff.toLocaleString()}）。\n\n` +
          `這個動作不會留下異動紀錄，之後查不到是誰在什麼時候改的。確定嗎？`
      );
      if (!ok) return;
    }

    setBusy(true);
    setErr("");
    try {
      const { error } = await supabase
        .from("members")
        .update({
          name: f.name.trim(),
          phone: f.phone || null,
          tier_id: f.tier_id || null,
          wallet: after,
        })
        .eq("id", member.id);
      if (error) throw error;
      flash?.("會員資料已更新");
      onSaved?.();
    } catch (e) {
      setErr("儲存失敗：" + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mask on" onClick={onClose} />
      <div className="modal on">
        <div className="modal-head">
          <h3>編輯會員 · {member.name || member.email}</h3>
          <span className="x" onClick={onClose}>✕</span>
        </div>
        <div className="modal-body">
          <div className="fgrid">
            <div className="fld"><label>姓名</label>
              <input value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
            <div className="fld"><label>電話</label>
              <input value={f.phone} onChange={(e) => set("phone", e.target.value)} /></div>
            <div className="fld full"><label>Email（登入帳號，不可在此修改）</label>
              <input value={member.email || ""} readOnly disabled /></div>
            <div className="fld"><label>會員等級</label>
              <select value={f.tier_id || ""} onChange={(e) => set("tier_id", e.target.value)}>
                <option value="">未設定</option>
                {tiers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select></div>
            <div className="fld"><label>錢包餘額（幣）</label>
              <input type="number" value={f.wallet} onChange={(e) => set("wallet", e.target.value)} />
              {diff !== 0 && (
                <small style={{ color: diff > 0 ? "var(--ok)" : "var(--warn)", fontSize: 11, display: "block", marginTop: 5 }}>
                  將{diff > 0 ? "增加" : "減少"} {Math.abs(diff).toLocaleString()} 幣
                </small>
              )}
            </div>
            <div className="fld full">
              <div className="spec">
                點數（可用 {Number(member.points) || 0}、未解鎖 {Number(member.pending_points) || 0}）、
                累積消費（NT${(Number(member.total_spent) || 0).toLocaleString()}）與
                加入日期（{member.join_date}）由系統計算，這裡不能改。
              </div>
            </div>
          </div>
          {err && <div style={{ color: "var(--err)", fontSize: 13, marginTop: 12 }}>{err}</div>}
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
          <button className="btn btn-brand" onClick={save} disabled={busy}>{busy ? "儲存中…" : "儲存"}</button>
        </div>
      </div>
    </>
  );
}
