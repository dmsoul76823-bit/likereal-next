"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const VIP = ["星紫卡", "沉浸卡", "紫鑽卡"];

export default function Members({ flash }) {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .order("join_date", { ascending: false });
    if (error) setErr(error.message);
    else setRows(data || []);
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

  return (
    <>
      <div className="stat-grid">
        <div className="stat">
          <div className="l">會員數</div>
          <div className="v">{rows.length.toLocaleString()}</div>
          <div className="c">註冊會員</div>
        </div>
        <div className="stat">
          <div className="l">錢包總餘額</div>
          <div className="v">{totalWallet.toLocaleString()}</div>
          <div className="c">尚未使用的儲值幣</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>會員管理</h3>
            <div className="hint" style={{ margin: 0 }}>前台會員與儲值</div>
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
              <tr><th>會員</th><th>聯絡方式</th><th>會員等級</th><th>錢包餘額</th><th>訂單數</th><th>加入日期</th><th /></tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id}>
                  <td><b>{m.name}</b></td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>
                    {m.phone}
                    <br />
                    {m.email}
                  </td>
                  <td><span className="tag b">{m.vip}</span></td>
                  <td style={{ color: "var(--brand3)", fontWeight: 700 }}>
                    {(Number(m.wallet) || 0).toLocaleString()} 幣
                  </td>
                  <td>{m.orders_count ?? 0}</td>
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
          <b>💡 關於錢包餘額</b>這裡直接改會員的儲值幣，沒有留下異動紀錄。
          等金流接上之後，加值與扣款應該改走交易紀錄，才查得出每一筆錢的來龍去脈。
        </div>
      </div>

      {edit && (
        <MemberEditor
          member={edit}
          flash={flash}
          onClose={() => setEdit(null)}
          onSaved={async () => { setEdit(null); await load(); }}
        />
      )}
    </>
  );
}

function MemberEditor({ member, flash, onClose, onSaved }) {
  const [f, setF] = useState({ ...member });
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
          phone: f.phone || "",
          email: f.email || "",
          vip: f.vip,
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
          <h3>編輯會員 · {member.name}</h3>
          <span className="x" onClick={onClose}>✕</span>
        </div>
        <div className="modal-body">
          <div className="fgrid">
            <div className="fld"><label>姓名</label>
              <input value={f.name || ""} onChange={(e) => set("name", e.target.value)} /></div>
            <div className="fld"><label>電話</label>
              <input value={f.phone || ""} onChange={(e) => set("phone", e.target.value)} /></div>
            <div className="fld full"><label>Email</label>
              <input value={f.email || ""} onChange={(e) => set("email", e.target.value)} /></div>
            <div className="fld"><label>會員等級</label>
              <select value={f.vip || VIP[0]} onChange={(e) => set("vip", e.target.value)}>
                {VIP.map((x) => <option key={x}>{x}</option>)}
              </select></div>
            <div className="fld"><label>錢包餘額（幣）</label>
              <input type="number" value={f.wallet ?? 0} onChange={(e) => set("wallet", e.target.value)} />
              {diff !== 0 && (
                <small style={{ color: diff > 0 ? "var(--ok)" : "var(--warn)", fontSize: 11, display: "block", marginTop: 5 }}>
                  將{diff > 0 ? "增加" : "減少"} {Math.abs(diff).toLocaleString()} 幣
                </small>
              )}
            </div>
            <div className="fld full">
              <div className="spec">
                訂單數（{member.orders_count ?? 0}）與加入日期（{member.join_date}）由系統計算，這裡不能改。
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
