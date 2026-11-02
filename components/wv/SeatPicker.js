"use client";
import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import SeatMap from "./SeatMap";
import TicketResult from "./TicketResult";
import {
  ZONE_COLORS,
  SEAT_MAX,
  zoneMap,
  soldSet,
  seatLabelOf,
  unitOf,
  selUnits,
  unitName,
  unitPrice,
  tierStat,
} from "@/lib/wv-seats";

const DONATE = [
  "創世基金會（愛心碼 919）",
  "家扶基金會（愛心碼 25885）",
  "陽光社福基金會（愛心碼 8585）",
];

export default function SeatPicker({
  programName,
  session,
  venue,
  onClose,
  change = null, // 換位模式：{ code, oldPrice, oldSeat, oldLabel, oldTicket }
  onChanged,
}) {
  const [step, setStep] = useState("tier"); // tier → seats → form → done
  const [tier, setTier] = useState(-1);
  const [sel, setSel] = useState(() => new Set());
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    inv: "personal",
    carrier: "",
    tax: "",
    title: "",
    donate: DONATE[0],
  });
  const [bad, setBad] = useState({});

  const tickets = session?.tickets || [];
  const zm = useMemo(() => zoneMap(session), [session]);
  const sold = useMemo(() => {
    const s = soldSet(session);
    if (change?.oldSeat) s.delete(change.oldSeat); // 原座位先當空位，但下面不准選回去
    return s;
  }, [session, change]);

  const units = useMemo(() => selUnits(venue, zm, sel), [venue, zm, sel]);
  const total = units.reduce((s, u) => s + unitPrice(zm, u), 0);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const flash = (t) => {
    setMsg(t);
    setTimeout(() => setMsg(""), 2200);
  };

  // ── 選座位 ────────────────────────────────────────
  function toggleSeat(id) {
    const z = zm[id];
    if (tier >= 0 && z && z.i !== tier) {
      flash("這個位置屬於其他票種");
      return;
    }
    if (change) {
      if (id === change.oldSeat) {
        flash("這就是你原本的座位");
        return;
      }
      setSel(sel.has(id) ? new Set() : new Set([id]));
      return;
    }

    const unit = unitOf(venue, zm, id);
    const next = new Set(sel);

    if (next.has(id)) {
      unit.forEach((x) => next.delete(x));
    } else {
      if (unit.some((x) => sold.has(x))) {
        flash("此包廂已有座位售出");
        return;
      }
      if (units.length >= SEAT_MAX) {
        flash(`一次最多選 ${SEAT_MAX} 個單位`);
        return;
      }
      unit.forEach((x) => next.add(x));
    }
    setSel(next);
  }

  // ── 表單驗證 ──────────────────────────────────────
  function validate() {
    const b = {};
    if (!form.name.trim()) b.name = true;
    if (!/^[0-9+\-\s()]{8,}$/.test(form.phone.trim())) b.phone = true;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) b.email = true;
    if (form.inv === "company") {
      if (!/^\d{8}$/.test(form.tax.trim())) b.tax = true;
      if (!form.title.trim()) b.title = true;
    }
    setBad(b);
    if (Object.keys(b).length) flash("請檢查標示紅框的欄位");
    return !Object.keys(b).length;
  }

  function invoiceData() {
    if (form.inv === "company")
      return { type: "company", tax: form.tax.trim(), title: form.title.trim() };
    if (form.inv === "donate") return { type: "donate", to: form.donate };
    return { type: "personal", carrier: form.carrier.trim() };
  }

  // ── 送出：呼叫 buy_seats，資料庫端原子操作，不會超賣 ──
  async function submit() {
    if (!validate()) return;
    setBusy(true);
    try {
      const payload = [];
      units.forEach((u) => {
        const z = zm[u[0]];
        const price = unitPrice(zm, u);
        const per = u.length ? Math.round(price / u.length) : price;
        u.forEach((s, i) => {
          payload.push({
            seat: s,
            label: seatLabelOf(s),
            ticket: z?.t?.n || "",
            price: i === 0 ? price - per * (u.length - 1) : per,
          });
        });
      });

      const { data, error } = await supabase.rpc("buy_seats", {
        p_event_id: Number(session.id),
        p_seats: payload,
        p_name: form.name.trim(),
        p_phone: form.phone.trim(),
        p_email: form.email.trim(),
        p_invoice: invoiceData(),
      });
      if (error) throw error;

      setResult({ ...data, event: programName });
      setStep("done");
    } catch (e) {
      flash("購票失敗：" + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  // ── 送出換位 ──────────────────────────────────────
  async function submitChange() {
    const u = units[0];
    if (!u) {
      flash("請先點選新座位");
      return;
    }
    if (u.length > 1) {
      flash("換位一次只能選一個座位（包廂請聯絡客服）");
      return;
    }
    const seat = u[0];
    const z = zm[seat];
    const price = Number(z?.t?.p) || 0;
    if (price < change.oldPrice) {
      flash("僅提供同級或升級換位");
      return;
    }
    const diff = price - change.oldPrice;

    const ok = window.confirm(
      "確認換位？\n\n" +
        `原座位：${change.oldTicket} ${change.oldLabel}\n` +
        `新座位：${z.t.n} ${seatLabelOf(seat)}\n\n` +
        (diff > 0 ? `需補差額：NT$${diff.toLocaleString()}` : "無需補差額") +
        "\n\n⚠ 每張票券僅限換位一次，確認後無法再更改。"
    );
    if (!ok) return;

    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("change_seat", {
        p_code: change.code,
        p_seat: seat,
        p_label: seatLabelOf(seat),
        p_ticket: z.t.n,
        p_price: price,
      });
      if (error) throw error;
      onChanged?.(data, diff);
      onClose();
    } catch (e) {
      flash("換位失敗：" + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  // ── 各步驟畫面 ────────────────────────────────────
  const stepBar = (now) => (
    <div className="step-bar">
      <span className={now === 1 ? "on" : ""}>1 選票種</span>
      <i>→</i>
      <span className={now === 2 ? "on" : ""}>2 選座位</span>
      <i>→</i>
      <span className={now === 3 ? "on" : ""}>{change ? "3 確認換位" : "3 填資料"}</span>
    </div>
  );

  let body = null;
  let footLeft = null;
  let cancelText = "取消";
  let okText = null;
  let onOk = null;

  if (step === "tier") {
    body = (
      <>
        {stepBar(1)}
        {change && (
          <div className="tier-note" style={{ margin: "0 0 12px" }}>
            原票種 <b>{change.oldTicket}</b>（NT${change.oldPrice.toLocaleString()}）—
            只能選擇<b>同價或更高</b>的票種，差額另行補款。
          </div>
        )}
        <div className="tier-list">
          {tickets.map((t, i) => {
            const s = tierStat(session, venue, sold, i);
            const low = !!change && (Number(t.p) || 0) < change.oldPrice;
            const out = s.left <= 0 || low;
            return (
              <div
                key={i}
                className={`tier ${out ? "out" : ""}`}
                onClick={
                  out
                    ? undefined
                    : () => {
                        setTier(i);
                        setSel(new Set());
                        setStep("seats");
                      }
                }
              >
                <span
                  className="sw"
                  style={{ background: ZONE_COLORS[i % ZONE_COLORS.length] }}
                />
                <div className="ti">
                  <b>{t.n}</b>
                  <small>
                    {t.unit === "box" ? "整間販售" : "單席販售"} · 共 {s.total} {s.unit}
                  </small>
                </div>
                <div className="tp">
                  <div className="p">NT${(Number(t.p) || 0).toLocaleString()}</div>
                  <div
                    className="lf"
                    style={{
                      color: out
                        ? "var(--rose)"
                        : s.left <= s.total * 0.1
                        ? "var(--warn)"
                        : "var(--muted)",
                    }}
                  >
                    {low ? "低於原票價" : out ? "已售完" : `剩 ${s.left} ${s.unit}`}
                  </div>
                </div>
                <span className="go">
                  {low ? "低於原票價" : out ? "—" : "選座位 →"}
                </span>
              </div>
            );
          })}
        </div>
        <div className="tier-note">
          選定票種後，座位圖只會亮起該票種的區域，其他區域無法點選。
        </div>
      </>
    );
    footLeft = "請先選擇票種";
    cancelText = "取消";
  }

  if (step === "seats") {
    const t = tickets[tier] || {};
    body = (
      <>
        {stepBar(2)}
        {change && (
          <div className="tier-note" style={{ margin: "0 0 10px" }}>
            原座位 <b>{change.oldTicket} {change.oldLabel}</b>　差額{" "}
            <b>
              NT$
              {Math.max(0, (Number(t.p) || 0) - change.oldPrice).toLocaleString()}
            </b>
            ／席　·　只能選 1 個座位
          </div>
        )}
        <div className="tier-now">
          <span
            className="sw"
            style={{ background: ZONE_COLORS[tier % ZONE_COLORS.length] }}
          />
          <b>{t.n}</b>
          <span className="pp">
            NT${(Number(t.p) || 0).toLocaleString()}
            {t.unit === "box" ? "／整間" : "／席"}
          </span>
          <button
            className="chg"
            onClick={() => {
              setTier(-1);
              setSel(new Set());
              setStep("tier");
            }}
          >
            更換票種
          </button>
        </div>
        <SeatMap
          venue={venue}
          zm={zm}
          sold={sold}
          sel={sel}
          activeTier={tier}
          tickets={tickets}
          onPick={toggleSeat}
        />
      </>
    );
    footLeft = units.length ? (
      <>
        已選 <b>{units.length}</b> 個：
        {units.map((u) => unitName(venue, zm, u)).join("、")}
      </>
    ) : (
      `尚未選擇座位（最多 ${SEAT_MAX} 個單位；包廂整間為 1 單位）`
    );
    cancelText = "返回";
    okText = change ? (busy ? "處理中…" : "確認換位") : "填寫購票資料";
    onOk = change
      ? submitChange
      : () => {
          if (!units.length) {
            flash("請先點選座位");
            return;
          }
          setStep("form");
        };
  }

  if (step === "form") {
    const bf = (k) => `bf${bad[k] ? " bad" : ""}`;
    body = (
      <>
        {stepBar(3)}
        <div className="bform">
          <div className={bf("name")}>
            <label>
              姓名 <i>*</i>
            </label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="王小明"
              autoComplete="name"
              className={bad.name ? "bad" : ""}
            />
          </div>
          <div className={bf("phone")}>
            <label>
              手機號碼 <i>*</i>
            </label>
            <input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="0912-345-678"
              autoComplete="tel"
              className={bad.phone ? "bad" : ""}
            />
          </div>
          <div className="bf full">
            <label>
              電子信箱 <i>*</i>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className={bad.email ? "bad" : ""}
            />
            <small>電子票券與入場 QR Code 會寄到這裡</small>
          </div>

          <div className="bf full">
            <label>發票類型</label>
            <div className="binv">
              {[
                ["personal", "個人電子發票"],
                ["company", "公司行號"],
                ["donate", "捐贈發票"],
              ].map(([v, label]) => (
                <label key={v} className="opt">
                  <input
                    type="radio"
                    name="inv"
                    value={v}
                    checked={form.inv === v}
                    onChange={() => set("inv", v)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {form.inv === "personal" && (
            <div className="bf full">
              <label>手機條碼載具（選填）</label>
              <input
                value={form.carrier}
                onChange={(e) => set("carrier", e.target.value)}
                placeholder="/ABC+123"
              />
            </div>
          )}
          {form.inv === "company" && (
            <>
              <div className="bf">
                <label>
                  統一編號 <i>*</i>
                </label>
                <input
                  value={form.tax}
                  onChange={(e) => set("tax", e.target.value)}
                  placeholder="12345678"
                  maxLength={8}
                  className={bad.tax ? "bad" : ""}
                />
              </div>
              <div className="bf">
                <label>
                  發票抬頭 <i>*</i>
                </label>
                <input
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="○○有限公司"
                  className={bad.title ? "bad" : ""}
                />
              </div>
            </>
          )}
          {form.inv === "donate" && (
            <div className="bf full">
              <label>捐贈單位</label>
              <select value={form.donate} onChange={(e) => set("donate", e.target.value)}>
                {DONATE.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="border-note">
          目前為<b>示範環境，不會實際扣款</b>；送出後即產生電子票券。
        </div>
      </>
    );
    footLeft = (
      <>
        共 <b>{units.length}</b> 個單位
      </>
    );
    cancelText = "返回選位";
    okText = busy ? "處理中…" : "確認購票";
    onOk = submit;
  }

  if (step === "done" && result) {
    return <TicketResult result={result} onClose={onClose} />;
  }

  const sub = [
    session?.venue || venue?.name || "",
    session?.date ? `${session.date} ${session.time || ""}`.trim() : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div className="smask on" onClick={onClose} />
      <div className="smodal on" style={step === "form" ? { width: 620 } : undefined}>
        <div className="sm-head">
          <div>
            <h3 className="serif">
              {change ? "換位／升級" : step === "form" ? "購票資料" : "選擇座位"}
            </h3>
            <p>
              {programName}
              {sub ? " · " + sub : ""}
            </p>
          </div>
          <span className="x" onClick={onClose}>
            ✕
          </span>
        </div>

        <div className="sm-body">{body}</div>

        <div className="sm-foot">
          <div>
            <div className="picked">{footLeft}</div>
            <div className="tot">NT${total.toLocaleString()}</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-ghost"
              onClick={() => {
                if (step === "seats") {
                  setTier(-1);
                  setSel(new Set());
                  setStep("tier");
                } else if (step === "form") {
                  setStep("seats");
                } else {
                  onClose();
                }
              }}
            >
              {cancelText}
            </button>
            {okText && (
              <button className="btn btn-brand" onClick={onOk} disabled={busy}>
                {okText}
              </button>
            )}
          </div>
        </div>

        {msg && <div className="toast show">{msg}</div>}
      </div>
    </>
  );
}
