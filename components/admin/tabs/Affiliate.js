"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAffiliateList,
  saveAffiliate,
  setAffiliateActive,
  saveRule,
  deleteRule,
  getCommissions,
  setCommissionStatus,
  getTargetOptions,
  TARGET_LABEL,
  RATE_LABEL,
  STATUS_LABEL,
} from "@/lib/admin-affiliate";
import { money } from "@/lib/admin";

const SITE = typeof window !== "undefined" ? window.location.origin : "";

export default function Affiliate({ flash }) {
  const [view, setView] = useState("partners"); // partners | ledger
  const [rows, setRows] = useState(null);
  const [opts, setOpts] = useState({ programs: [], products: [] });
  const [err, setErr] = useState("");
  const [editAff, setEditAff] = useState(null);
  const [editRule, setEditRule] = useState(null);

  const load = useCallback(async () => {
    try {
      const [list, o] = await Promise.all([getAffiliateList(), getTargetOptions()]);
      setRows(list);
      setOpts(o);
      setErr("");
    } catch (e) {
      setErr(e?.message || String(e));
      setRows([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (err && !rows?.length) {
    return (
      <div className="panel">
        <h3>讀取失敗</h3>
        <div className="hint">{err}</div>
        <div className="spec" style={{ marginTop: 12 }}>
          如果錯誤訊息提到 <code>target_type</code> 或 <code>affiliate_commissions</code>，
          代表 <code>sql/wv-affiliate-schema.sql</code> 還沒執行。
        </div>
      </div>
    );
  }
  if (!rows) return <div className="panel"><div className="hint">載入中…</div></div>;

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>分潤管理</h3>
            <div className="hint" style={{ margin: 0 }}>推廣夥伴、分潤規則與結算</div>
          </div>
          <div className="tools">
            <button
              className={`btn btn-sm ${view === "partners" ? "btn-brand" : "btn-ghost"}`}
              onClick={() => setView("partners")}
            >
              夥伴與規則
            </button>
            <button
              className={`btn btn-sm ${view === "ledger" ? "btn-brand" : "btn-ghost"}`}
              onClick={() => setView("ledger")}
            >
              分潤帳本
            </button>
          </div>
        </div>

        <div className="spec" style={{ marginBottom: 14 }}>
          <b>💡 分潤怎麼算</b>
          客人點了帶 <code>?ref=代碼</code> 的連結，代碼會存進他的瀏覽器
          （天數由每個夥伴的「追蹤天數」決定）。結帳時以<b>券碼優先</b>，
          沒有用券碼才採用存著的推薦碼。費率取<b>最具體的那一條</b> ——
          有該節目／商品的規則就用它，否則用全站預設。
        </div>

        {err && <div style={{ color: "var(--err)", fontSize: 13, marginBottom: 10 }}>{err}</div>}

        {view === "partners" ? (
          <Partners
            rows={rows}
            opts={opts}
            onNew={() => setEditAff({ cookie_days: 30, is_active: true })}
            onEdit={setEditAff}
            onRule={setEditRule}
            onToggle={async (a) => {
              try {
                await setAffiliateActive(a.id, !a.is_active);
                flash?.(a.is_active ? "已停用" : "已啟用");
                await load();
              } catch (e) { setErr(e?.message || String(e)); }
            }}
            onDeleteRule={async (id) => {
              if (!window.confirm("確定刪除這條規則？已經產生的分潤紀錄不受影響。")) return;
              try { await deleteRule(id); flash?.("規則已刪除"); await load(); }
              catch (e) { setErr(e?.message || String(e)); }
            }}
          />
        ) : (
          <Ledger rows={rows} flash={flash} />
        )}
      </div>

      {editAff && (
        <AffiliateEditor
          row={editAff}
          flash={flash}
          onClose={() => setEditAff(null)}
          onSaved={async () => { setEditAff(null); await load(); }}
        />
      )}
      {editRule && (
        <RuleEditor
          rule={editRule}
          opts={opts}
          flash={flash}
          onClose={() => setEditRule(null)}
          onSaved={async () => { setEditRule(null); await load(); }}
        />
      )}
    </>
  );
}

/* ───────────── 夥伴與規則 ───────────── */

function Partners({ rows, onNew, onEdit, onRule, onToggle, onDeleteRule }) {
  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <button className="btn btn-brand btn-sm" onClick={onNew}>+ 新增夥伴</button>
      </div>

      {rows.length === 0 ? (
        <div className="empty">還沒有推廣夥伴。建立一個之後，就能把帶推廣碼的連結給對方。</div>
      ) : (
        rows.map((a) => {
          const rules = (a.affiliate_rules || []).filter((r) => r.is_active !== false);
          const base = rules.find((r) => r.target_type === "all");
          return (
            <div key={a.id} className="spec" style={{ marginBottom: 14, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <b style={{ fontSize: 15 }}>{a.name}</b>
                <span className="tag b">{a.code}</span>
                {a.is_active === false && <span className="tag">已停用</span>}
                <span className="hint" style={{ margin: 0 }}>追蹤 {a.cookie_days || 30} 天</span>
                <div style={{ flex: 1 }} />
                <button className="btn btn-ghost btn-sm" onClick={() => onEdit(a)}>編輯</button>
                <button className="btn btn-ghost btn-sm" onClick={() => onToggle(a)}>
                  {a.is_active === false ? "啟用" : "停用"}
                </button>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
                推廣連結：<code>{SITE}/?ref={a.code}</code>
                {a.contact ? ` · 聯絡：${a.contact}` : ""}
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <b style={{ fontSize: 13 }}>分潤規則</b>
                  {!base && <span className="hint" style={{ margin: 0 }}>（尚未設定全站預設費率）</span>}
                  <div style={{ flex: 1 }} />
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => onRule({ affiliate_id: a.id, target_type: "all", commission_type: "percent" })}
                  >
                    + 新增規則
                  </button>
                </div>

                {rules.length === 0 ? (
                  <div className="hint" style={{ margin: 0 }}>還沒有規則，這個夥伴帶來的訂單不會產生分潤。</div>
                ) : (
                  <table>
                    <thead>
                      <tr><th>適用範圍</th><th>對象</th><th>計算方式</th><th>數值</th><th /></tr>
                    </thead>
                    <tbody>
                      {rules.map((r) => (
                        <tr key={r.id}>
                          <td><span className="tag">{TARGET_LABEL[r.target_type] || r.target_type}</span></td>
                          <td style={{ fontSize: 12 }}>{r.target_key || "—"}</td>
                          <td style={{ fontSize: 12 }}>{RATE_LABEL[r.commission_type] || r.commission_type}</td>
                          <td style={{ color: "var(--brand3)", fontWeight: 700 }}>
                            {r.commission_type === "percent"
                              ? `${r.commission_value}%`
                              : money(r.commission_value)}
                          </td>
                          <td>
                            <div className="row-act">
                              <button className="btn btn-ghost btn-sm" onClick={() => onRule(r)}>編輯</button>
                              <button className="btn btn-ghost btn-sm" onClick={() => onDeleteRule(r.id)}>刪除</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}

/* ───────────── 分潤帳本 ───────────── */

function Ledger({ rows, flash }) {
  const [list, setList] = useState(null);
  const [status, setStatus] = useState("pending");
  const [sel, setSel] = useState([]);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      setList(await getCommissions({ status: status || undefined }));
      setSel([]);
      setErr("");
    } catch (e) { setErr(e?.message || String(e)); setList([]); }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const total = useMemo(
    () => (list || []).reduce((s, c) => s + (Number(c.amount) || 0), 0),
    [list]
  );

  async function mark(next) {
    if (!sel.length) return;
    const label = STATUS_LABEL[next];
    if (!window.confirm(`把選取的 ${sel.length} 筆標成「${label}」？`)) return;
    try {
      await setCommissionStatus(sel, next);
      flash?.(`已標為${label}`);
      await load();
    } catch (e) { setErr(e?.message || String(e)); }
  }

  if (!list) return <div className="hint">載入中…</div>;

  return (
    <>
      <div className="stat-grid" style={{ marginBottom: 14 }}>
        <div className="stat">
          <div className="l">{STATUS_LABEL[status] || "全部"}筆數</div>
          <div className="v">{list.length}</div>
        </div>
        <div className="stat">
          <div className="l">金額合計</div>
          <div className="v">{money(total)}</div>
        </div>
      </div>

      <div className="tools" style={{ marginBottom: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["pending", "approved", "paid", "reversed", ""].map((s) => (
          <button
            key={s || "all"}
            className={`btn btn-sm ${status === s ? "btn-brand" : "btn-ghost"}`}
            onClick={() => setStatus(s)}
          >
            {s ? STATUS_LABEL[s] : "全部"}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-sm" disabled={!sel.length} onClick={() => mark("approved")}>核准</button>
        <button className="btn btn-ghost btn-sm" disabled={!sel.length} onClick={() => mark("paid")}>標為已付</button>
        <button className="btn btn-ghost btn-sm" disabled={!sel.length} onClick={() => mark("reversed")}>沖銷</button>
      </div>

      {err && <div style={{ color: "var(--err)", fontSize: 13, marginBottom: 10 }}>{err}</div>}

      {list.length === 0 ? (
        <div className="empty">
          沒有符合的分潤紀錄。
          <div className="hint" style={{ marginTop: 6 }}>
            分潤要等結帳函式接上歸因（階段 3）之後才會自動產生。
          </div>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th style={{ width: 32 }}>
                <input
                  type="checkbox"
                  checked={sel.length === list.length && list.length > 0}
                  onChange={(e) => setSel(e.target.checked ? list.map((c) => c.id) : [])}
                />
              </th>
              <th>夥伴</th><th>訂單</th><th>適用</th><th>計算基準</th><th>分潤</th><th>狀態</th><th>時間</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={sel.includes(c.id)}
                    onChange={(e) =>
                      setSel((p) => (e.target.checked ? [...p, c.id] : p.filter((x) => x !== c.id)))
                    }
                  />
                </td>
                <td><b>{c.affiliates?.name || "—"}</b></td>
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>{c.order_id}</td>
                <td style={{ fontSize: 12 }}>
                  {TARGET_LABEL[c.target_type] || c.target_type}
                  {c.target_key ? ` · ${c.target_key}` : ""}
                </td>
                <td>{money(c.base_amount)}</td>
                <td style={{ color: "var(--brand3)", fontWeight: 700 }}>{money(c.amount)}</td>
                <td><span className="tag">{STATUS_LABEL[c.status] || c.status}</span></td>
                <td style={{ color: "var(--muted)", fontSize: 12 }}>
                  {String(c.created_at || "").slice(0, 10)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

/* ───────────── 編輯視窗 ───────────── */

function AffiliateEditor({ row, flash, onClose, onSaved }) {
  const [f, setF] = useState({ ...row });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    setBusy(true); setErr("");
    try {
      await saveAffiliate(f);
      flash?.(row.id ? "夥伴資料已更新" : "夥伴已建立");
      onSaved?.();
    } catch (e) { setErr(e?.message || String(e)); }
    finally { setBusy(false); }
  }

  return (
    <>
      <div className="mask on" onClick={onClose} />
      <div className="modal on">
        <div className="modal-head">
          <h3>{row.id ? `編輯夥伴 · ${row.name}` : "新增推廣夥伴"}</h3>
          <span className="x" onClick={onClose}>✕</span>
        </div>
        <div className="modal-body">
          <div className="fgrid">
            <div className="fld"><label>夥伴名稱</label>
              <input value={f.name || ""} onChange={(e) => set("name", e.target.value)} /></div>
            <div className="fld"><label>推廣代碼</label>
              <input
                value={f.code || ""}
                onChange={(e) => set("code", e.target.value)}
                placeholder="例如 kol-mia"
                disabled={!!row.id}
              />
              {row.id && <small className="hint">代碼建立後不能改，對方可能已經在用了。</small>}
            </div>
            <div className="fld full"><label>聯絡方式</label>
              <input value={f.contact || ""} onChange={(e) => set("contact", e.target.value)} /></div>
            <div className="fld"><label>追蹤天數</label>
              <input type="number" min={1} max={365}
                value={f.cookie_days ?? 30}
                onChange={(e) => set("cookie_days", e.target.value)} />
              <small className="hint">客人點了連結後，幾天內下單都算這個夥伴的。</small>
            </div>
            <div className="fld full"><label>備註</label>
              <input value={f.note || ""} onChange={(e) => set("note", e.target.value)} /></div>
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

function RuleEditor({ rule, opts, flash, onClose, onSaved }) {
  const [f, setF] = useState({ commission_type: "percent", ...rule });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    setBusy(true); setErr("");
    try {
      await saveRule(f);
      flash?.("規則已儲存");
      onSaved?.();
    } catch (e) { setErr(e?.message || String(e)); }
    finally { setBusy(false); }
  }

  const type = f.target_type || "all";

  return (
    <>
      <div className="mask on" onClick={onClose} />
      <div className="modal on">
        <div className="modal-head">
          <h3>{rule.id ? "編輯分潤規則" : "新增分潤規則"}</h3>
          <span className="x" onClick={onClose}>✕</span>
        </div>
        <div className="modal-body">
          <div className="fgrid">
            <div className="fld"><label>適用範圍</label>
              <select value={type} onChange={(e) => { set("target_type", e.target.value); set("target_key", ""); }}>
                <option value="all">全站預設</option>
                <option value="program">指定節目</option>
                <option value="product">指定商品</option>
              </select>
            </div>

            {type === "program" && (
              <div className="fld"><label>節目</label>
                <select value={f.target_key || ""} onChange={(e) => set("target_key", e.target.value)}>
                  <option value="">請選擇…</option>
                  {opts.programs.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            )}
            {type === "product" && (
              <div className="fld"><label>商品</label>
                <select value={f.target_key || ""} onChange={(e) => set("target_key", e.target.value)}>
                  <option value="">請選擇…</option>
                  {opts.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}

            <div className="fld"><label>計算方式</label>
              <select value={f.commission_type} onChange={(e) => set("commission_type", e.target.value)}>
                <option value="percent">百分比</option>
                <option value="fixed">固定金額</option>
              </select>
            </div>
            <div className="fld"><label>數值</label>
              <input type="number" min={0}
                value={f.commission_value ?? ""}
                onChange={(e) => set("commission_value", e.target.value)}
                placeholder={f.commission_type === "percent" ? "例如 10（代表 10%）" : "例如 50（每筆 50 元）"} />
            </div>

            {type === "product" && (
              <div className="fld full">
                <div className="spec">
                  ⚠️ 商品目前<b>無法線上購買</b>（商品頁寫著「線上購物車與金流串接中」）。
                  這條規則可以先建好，但在電商結帳做出來之前不會產生任何分潤。
                </div>
              </div>
            )}
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
