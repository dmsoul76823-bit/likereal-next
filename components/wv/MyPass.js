"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Qr from "./Qr";
import SeatPicker from "./SeatPicker";

export default function MyPass({ venues = [] }) {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [rows, setRows] = useState(null); // null = 還沒查過
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [changing, setChanging] = useState(null); // { pass, session, venue }

  const flash = (t) => {
    setMsg(t);
    setTimeout(() => setMsg(""), 2600);
  };

  async function lookup() {
    if (!code.trim() && !(email.trim() && phone.trim())) {
      flash("請輸入票券編號，或 Email 與手機");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("find_passes", {
        p_code: code.trim() || null,
        p_email: email.trim() || null,
        p_phone: phone.trim() || null,
      });
      if (error) throw error;
      const list = data || [];
      setRows(list);
      if (!list.length) flash("查無票券，請確認輸入的資料");
    } catch (e) {
      flash("查詢失敗：" + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  // 載入該場次的完整資料後開啟座位圖
  async function startChange(p) {
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", p.event_id)
        .maybeSingle();
      if (error || !data) throw error || new Error("找不到場次");

      const session = {
        id: data.id,
        name: data.name,
        venue: data.venue || "",
        venueId: data.venue_id ?? null,
        date: data.show_date || "",
        time: data.show_time || "",
        cap: Number(data.cap) || 0,
        sold: Number(data.sold) || 0,
        tickets: Array.isArray(data.tickets) ? data.tickets : [],
        soldSeats: Array.isArray(data.sold_seats) ? data.sold_seats : [],
      };
      const venue =
        venues.find((v) => String(v.id) === String(session.venueId)) || null;

      if (!venue || !session.tickets.some((t) => (t.seats || []).length)) {
        flash("這個場次沒有座位圖，請聯絡客服辦理換位");
        return;
      }
      setChanging({ pass: p, session, venue });
    } catch (e) {
      flash("無法載入場次資料：" + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  const onKey = (e) => {
    if (e.key === "Enter") lookup();
  };

  return (
    <>
      <div className="mp-form">
        <div className="mp-row">
          <div className="fld">
            <label>票券編號</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={onKey}
              placeholder="WV-2026-0007-1-A3F9"
            />
          </div>
          <div className="mp-or">或</div>
          <div className="fld">
            <label>Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={onKey}
              placeholder="購票時填的 Email"
            />
          </div>
          <div className="fld">
            <label>手機</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={onKey}
              placeholder="購票時填的手機"
            />
          </div>
          <button className="btn btn-brand" onClick={lookup} disabled={busy}>
            {busy ? "查詢中…" : "查詢票券"}
          </button>
        </div>
        <div className="mp-note">
          🔁 每張票券提供 <b>一次</b> 換位／升級票種的機會；升級需補差額，不受理降級退費。
          已入場或演出結束後不可換位。
        </div>
      </div>

      {rows && rows.length === 0 && (
        <div style={{ color: "var(--muted)", fontSize: "var(--fs-base)", padding: "10px 2px" }}>
          查無票券。請確認票券編號，或改用購票時填的 Email 與手機一起查詢。
        </div>
      )}

      {(rows || []).map((p) => (
        <div className="mp-card" key={p.code}>
          <div className="qr">
            <Qr value={p.code} size={160} />
          </div>

          <div className="mp-i">
            <h4>{p.event_name || ""}</h4>
            <div className="m">
              {p.show_date || ""} {(p.show_time || "").slice(0, 5)} · {p.venue || ""}
            </div>
            <div className="m">
              <b>{p.ticket_name || ""}</b> · 座位 <b>{p.seat_label || ""}</b> · NT$
              {(Number(p.price) || 0).toLocaleString()}
            </div>
            {p.changed && (
              <div className="m" style={{ color: "var(--warn)" }}>
                已換位（原：{p.orig_ticket || ""} {p.orig_seat_label || ""}）
              </div>
            )}
            <div className="m" style={{ fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
              票券編號 {p.code}　購票人 {p.buyer || ""}
            </div>
          </div>

          <div className="mp-a">
            <span className={`tag ${p.used ? "used" : p.can_change ? "ok" : "off"}`}>
              {p.used ? "已入場" : p.can_change ? "可換位" : "不可換位"}
            </span>
            {p.can_change ? (
              <button className="add buy-now" onClick={() => startChange(p)} disabled={busy}>
                換位／升級
              </button>
            ) : (
              <small style={{ color: "var(--muted)" }}>{p.reason || ""}</small>
            )}
          </div>
        </div>
      ))}

      {changing && (
        <SeatPicker
          programName={changing.session.name}
          session={changing.session}
          venue={changing.venue}
          change={{
            code: changing.pass.code,
            oldPrice: Number(changing.pass.price) || 0,
            oldSeat: changing.pass.seat,
            oldLabel: changing.pass.seat_label,
            oldTicket: changing.pass.ticket_name,
          }}
          onClose={() => setChanging(null)}
          onChanged={(data, diff) => {
            flash((data && data.msg) || "換位成功");
            if (diff > 0) {
              const ord = data?.diff_order ? "：" + data.diff_order : "";
              window.alert(
                `換位成功！\n\n需補差額 NT$${diff.toLocaleString()}\n` +
                  `已為您建立補款訂單${ord}，客服會與您聯繫完成補款。`
              );
            }
            lookup();
          }}
        />
      )}

      {msg && <div className="toast show">{msg}</div>}
    </>
  );
}
