"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ZONE_COLORS } from "@/lib/wv-seats";
import { autoAssignSeats, venueSeatCount, ytId } from "@/lib/admin-seats";
import { uploadImage } from "@/lib/upload";

const CATS = ["沉浸場域", "3D 場域", "見面會", "特展", "派對", "工作坊"];

export default function ProgramEditor({ group, art, venues, evlite, flash, onClose, onSaved }) {
  const sessionsOfProgram = useMemo(
    () => evlite.filter((e) => e.name === group.name),
    [evlite, group.name]
  );
  const venueIds = useMemo(
    () => [...new Set(sessionsOfProgram.map((e) => e.venue_id).filter((x) => x != null))],
    [sessionsOfProgram]
  );

  const [name, setName] = useState(group.name);
  const [cat, setCat] = useState(group.cat || CATS[0]);
  const [venueId, setVenueId] = useState(venueIds[0] ?? venues[0]?.id ?? null);
  const [venueText, setVenueText] = useState("");
  const [intro, setIntro] = useState(art.intro || "");
  const [img, setImg] = useState(art.img || "");
  const [isLive, setIsLive] = useState(!!art.is_live);
  const [liveUrl, setLiveUrl] = useState(art.live_url || "");
  const [yt, setYt] = useState(art.yt_id || "");
  const [video, setVideo] = useState(art.video_url || "");
  const [tiers, setTiers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const [sample, setSample] = useState(null);

  // 取一筆同名場次當作票種與顯示名稱的樣本
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("venue,tickets,intro")
        .eq("name", group.name)
        .limit(1)
        .maybeSingle();
      if (!alive || !data) return;
      setSample(data);
      setVenueText(data.venue || "");
      setTiers(JSON.parse(JSON.stringify(data.tickets || [])));
      if (!art.intro && data.intro) setIntro(data.intro);
    })();
    return () => {
      alive = false;
    };
  }, [group.name, art.intro]);

  const venue = venues.find((v) => String(v.id) === String(venueId)) || null;

  function reassign(next) {
    const copy = JSON.parse(JSON.stringify(next));
    if (venue) autoAssignSeats(venue, copy);
    setTiers(copy);
  }

  useEffect(() => {
    if (venue && tiers.length) reassign(tiers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  const assigned = tiers.reduce((s, t) => s + (t.seats || []).length, 0);

  async function pickFile(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setUploading(true);
    setErr("");
    try {
      const url = await uploadImage(f, "program");
      setImg(url);
      flash?.("圖片已上傳");
    } catch (ex) {
      setErr(ex?.message || String(ex));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    const nn = name.trim();
    if (!nn) return setErr("請填寫節目名稱");

    const keep = tiers.filter((t) => String(t.n || "").trim());
    if (!keep.length) return setErr("至少需要一種票種");

    const cap = keep.reduce((s, t) => s + (t.seats || []).length, 0);
    if (!cap) return setErr("票種沒有分配到座位，請確認場地設定");

    setBusy(true);
    setErr("");
    try {
      // 1) 套用到所有同名場次
      const { error: e1 } = await supabase
        .from("events")
        .update({
          name: nn,
          cat,
          intro,
          venue_id: venueId,
          venue: venueText,
          tickets: keep,
          cap,
        })
        .eq("name", group.name);
      if (e1) throw e1;

      // 2) 節目主視覺
      const row = {
        name: nn,
        img: img || null,
        intro,
        video_url: video || null,
        yt_id: ytId(yt) || null,
        live_url: ytId(liveUrl) || null,
        is_live: isLive,
        updated_at: new Date().toISOString(),
      };
      const { error: e2 } = await supabase.from("program_art").upsert(row);
      if (e2) throw e2;

      if (nn !== group.name) {
        await supabase.from("program_art").delete().eq("name", group.name);
      }

      flash?.(`已套用到 ${group.count} 個場次`);
      onSaved?.();
    } catch (ex) {
      setErr("儲存失敗：" + (ex?.message || ex));
    } finally {
      setBusy(false);
    }
  }

  async function removeProgram() {
    const ok = window.confirm(
      `確定要刪除整檔「${group.name}」嗎？\n\n` +
        `會一併刪除 ${group.count} 個場次。已售出 ${group.sold} 張票的場次也會一起消失，無法復原。`
    );
    if (!ok) return;
    if (group.sold > 0) {
      const again = window.confirm(
        `再確認一次：這檔節目已經賣出 ${group.sold} 張票。\n刪除後這些客人的票券會查不到。確定仍要刪除？`
      );
      if (!again) return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.from("events").delete().eq("name", group.name);
      if (error) throw error;
      await supabase.from("program_art").delete().eq("name", group.name);
      flash?.("已刪除整檔節目");
      onSaved?.();
    } catch (ex) {
      setErr("刪除失敗：" + (ex?.message || ex));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mask on" onClick={onClose} />
      <div className="modal on">
        <div className="modal-head">
          <h3>編輯節目 · {group.name}</h3>
          <span className="x" onClick={onClose}>✕</span>
        </div>

        <div className="modal-body">
          <div className="fgrid">
            <div className="fld full">
              <label>節目名稱（修改後會套用到全部 {group.count} 個場次）</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="fld">
              <label>類型</label>
              <select value={cat} onChange={(e) => setCat(e.target.value)}>
                {CATS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="fld">
              <label>場次數</label>
              <input readOnly style={{ opacity: 0.7 }} value={`${group.count} 場（${group.first} ~ ${group.last}）`} />
            </div>

            <div className="fld">
              <label>場地（套用到全部場次）</label>
              <select value={venueId ?? ""} onChange={(e) => setVenueId(Number(e.target.value))}>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}（{venueSeatCount(v)} 席）
                  </option>
                ))}
              </select>
              {venueIds.length > 1 && (
                <small style={{ color: "var(--warn)", fontSize: 11, display: "block", marginTop: 5 }}>
                  ⚠ 此節目目前橫跨 {venueIds.length} 個場地，儲存後會統一為上方選擇的場地
                </small>
              )}
            </div>

            <div className="fld">
              <label>場地顯示名稱（前台）</label>
              <input
                value={venueText}
                onChange={(e) => setVenueText(e.target.value)}
                placeholder="D 廳 · 微風廣場 9F"
              />
            </div>

            <div className="fld tall full">
              <label>節目介紹</label>
              <textarea value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="這段會套用到所有場次" />
            </div>

            <div className="fld full">
              <label>主視覺（此節目所有場次共用）</label>
              <div className="evimg">
                <div
                  className="evimg-pre"
                  style={{ backgroundImage: img ? `url("${img}")` : undefined }}
                >
                  {!img && "尚未設定"}
                </div>
                <div className="evimg-act">
                  <input value={img} onChange={(e) => setImg(e.target.value)} placeholder="貼上圖片網址，或直接上傳" />
                  <div style={{ display: "flex", gap: 8 }}>
                    <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer", flex: 1, textAlign: "center" }}>
                      {uploading ? "上傳中…" : "上傳圖片"}
                      <input type="file" accept="image/*" hidden onChange={pickFile} />
                    </label>
                    <button className="btn btn-danger btn-sm" onClick={() => setImg("")}>
                      清除
                    </button>
                  </div>
                </div>
              </div>
              <div className="spec">
                <b>📐 建議規格</b>尺寸：<code>1200 × 750 px</code>（16:10）· 格式：<code>JPG / WebP</code> · 建議 &lt; 400 KB
                <br />
                上傳的圖會存成真正的圖檔（Supabase Storage），不會塞進資料庫。
              </div>
            </div>

            <div className="fld full">
              <div className={`live-box ${isLive ? "on" : ""}`}>
                <label className="live-sw">
                  <input type="checkbox" checked={isLive} onChange={(e) => setIsLive(e.target.checked)} />
                  <span className="dot" />
                  <div>
                    <b>直播中</b>
                    <small>開啟後前台會顯示紅色 LIVE 標記，並出現在直播大廳</small>
                  </div>
                </label>
              </div>
            </div>

            <div className="fld full">
              <label>直播連結（YouTube 直播 ID 或完整網址）</label>
              <input value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="jfKfPfyJRdk 或完整網址" />
            </div>
            <div className="fld">
              <label>YouTube 影片 ID（預告／精華）</label>
              <input value={yt} onChange={(e) => setYt(e.target.value)} placeholder="LXb3EKWsInQ" />
            </div>
            <div className="fld">
              <label>影片檔網址（mp4 / webm）</label>
              <input value={video} onChange={(e) => setVideo(e.target.value)} placeholder="https://.../teaser.mp4" />
            </div>

            <div className="fld full">
              <label style={{ fontSize: 14, color: "var(--brand3)", fontWeight: 700 }}>
                🎟️ 票種與票價（套用到全部 {group.count} 個場次）
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1.5fr .9fr .9fr auto auto",
                  gap: 9, fontSize: 11, color: "var(--muted)", margin: "8px 2px 4px",
                }}
              >
                <span />
                <span>票種名稱</span>
                <span>票價</span>
                <span>販售方式</span>
                <span style={{ textAlign: "center" }}>席次</span>
                <span />
              </div>

              <div>
                {tiers.map((t, i) => (
                  <div className="tk-row" key={i}>
                    <div
                      className="sw"
                      style={{ background: ZONE_COLORS[i % ZONE_COLORS.length], borderColor: "transparent" }}
                    />
                    <input
                      placeholder="票種名稱"
                      value={t.n || ""}
                      onChange={(e) => {
                        const next = [...tiers];
                        next[i] = { ...next[i], n: e.target.value };
                        setTiers(next);
                      }}
                    />
                    <input
                      type="number"
                      placeholder="票價"
                      value={t.p ?? 0}
                      onChange={(e) => {
                        const next = [...tiers];
                        next[i] = { ...next[i], p: Number(e.target.value) || 0 };
                        setTiers(next);
                      }}
                    />
                    <select
                      value={t.unit === "box" ? "box" : "seat"}
                      onChange={(e) => {
                        const next = [...tiers];
                        next[i] = { ...next[i], unit: e.target.value };
                        reassign(next);
                      }}
                    >
                      <option value="seat">每席販售</option>
                      <option value="box">包廂整間</option>
                    </select>
                    <span className="cnt">{(t.seats || []).length} 席</span>
                    <button
                      className="xbtn"
                      onClick={() => reassign(tiers.filter((_, j) => j !== i))}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                場地「{venue?.name || "—"}」共 {venueSeatCount(venue)} 席 · 已分配 {assigned} 席
              </div>

              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 8 }}
                onClick={() => reassign([...tiers, { n: "", p: 0, unit: "seat", seats: [] }])}
              >
                ＋ 新增票種
              </button>

              <div className="spec">
                <b>💡 座位怎麼分配</b>「包廂整間」票種會分到場地的包廂；一般票種依<b>排數由前而後平分</b>
                （第一個票種在最前排）。調整場地或票種後會自動重新分配。
              </div>
            </div>

            <div className="fld full">
              <div className="danger-zone">
                <div>
                  <b>刪除整檔節目</b>
                  <small>
                    會一併刪除這 {group.count} 個場次
                    {group.sold > 0 ? `，含已售出的 ${group.sold} 張票` : ""}，無法復原
                  </small>
                </div>
                <button className="btn btn-danger btn-sm" onClick={removeProgram} disabled={busy}>
                  刪除節目
                </button>
              </div>
            </div>
          </div>

          {err && <div style={{ color: "var(--err)", fontSize: 13, marginTop: 12 }}>{err}</div>}
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
          <button className="btn btn-brand" onClick={save} disabled={busy || !sample}>
            {busy ? "儲存中…" : "儲存"}
          </button>
        </div>
      </div>
    </>
  );
}
