"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { rowLabel, sid, normStage } from "@/lib/wv-seats";

const SHAPES = [
  ["round", "圓角矩形"],
  ["rect", "矩形"],
  ["ellipse", "橢圓 / 圓形"],
  ["arc", "弧形（前緣圓弧）"],
  ["trap", "梯形"],
];

const cellR = (id) => Number(String(id).split("-")[0]);
const cellC = (id) => Number(String(id).split("-")[1]);

export default function VenueEditor({ venue, flash, onClose, onSaved }) {
  const isNew = !venue.id;

  const [name, setName] = useState(venue.name || "");
  const [rows, setRows] = useState(venue.rows || 12);
  const [cols, setCols] = useState(venue.cols || 20);
  const [off, setOff] = useState(new Set(venue.off || []));
  const [boxes, setBoxes] = useState(JSON.parse(JSON.stringify(venue.boxes || [])));
  const [stage, setStage] = useState(() => normStage({ ...venue, rows: venue.rows || 12, cols: venue.cols || 20 }));

  const [anchor, setAnchor] = useState(null); // 框選起點
  const [hover, setHover] = useState(null);
  const [sel, setSel] = useState([]);         // 已確定的框選範圍
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const boxSeatSet = useMemo(() => {
    const s = new Set();
    boxes.forEach((b) => (b.seats || []).forEach((x) => s.add(x)));
    return s;
  }, [boxes]);

  // 目前正在預覽的矩形範圍
  const preview = useMemo(() => {
    const end = hover || anchor;
    if (!anchor || !end) return [];
    const r0 = Math.min(cellR(anchor), cellR(end));
    const r1 = Math.max(cellR(anchor), cellR(end));
    const c0 = Math.min(cellC(anchor), cellC(end));
    const c1 = Math.max(cellC(anchor), cellC(end));
    const out = [];
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) out.push(sid(r, c));
    return out;
  }, [anchor, hover]);

  const previewSet = useMemo(() => new Set(preview), [preview]);
  const selSet = useMemo(() => new Set(sel), [sel]);

  // Esc 取消框選
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (anchor || sel.length) {
        e.stopPropagation();
        setAnchor(null);
        setHover(null);
        setSel([]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [anchor, sel.length]);

  function clickCell(id) {
    if (!anchor) {
      setAnchor(id);
      setHover(id);
      setSel([]);
      return;
    }
    setSel(preview);
    setAnchor(null);
    setHover(null);
  }

  function resize(nextRows, nextCols) {
    const r = Math.max(1, Math.min(60, Number(nextRows) || 1));
    const c = Math.max(1, Math.min(60, Number(nextCols) || 1));
    setRows(r);
    setCols(c);
    setOff(new Set([...off].filter((x) => cellR(x) < r && cellC(x) < c)));
    setBoxes(
      boxes
        .map((b) => ({ name: b.name, seats: (b.seats || []).filter((x) => cellR(x) < r && cellC(x) < c) }))
        .filter((b) => b.seats.length)
    );
    setSel([]);
    setAnchor(null);
  }

  function act(kind) {
    if (!sel.length) return setErr("請先在座位圖上框選範圍（點一格、移動、再點一下）");
    setErr("");

    if (kind === "off") {
      const next = new Set(off);
      sel.forEach((x) => next.add(x));
      setOff(next);
      setBoxes(boxes.map((b) => ({ name: b.name, seats: b.seats.filter((x) => !next.has(x)) })).filter((b) => b.seats.length));
    }
    if (kind === "on") {
      const next = new Set(off);
      sel.forEach((x) => next.delete(x));
      setOff(next);
    }
    if (kind === "box") {
      const seats = sel.filter((x) => !off.has(x));
      if (!seats.length) return setErr("框選範圍內沒有座位");
      const nm = window.prompt("包廂名稱", `包廂 ${boxes.length + 1}`);
      if (nm === null) return;
      const cleaned = boxes
        .map((b) => ({ name: b.name, seats: b.seats.filter((x) => !seats.includes(x)) }))
        .filter((b) => b.seats.length);
      setBoxes([...cleaned, { name: nm || "包廂", seats }]);
    }
    if (kind === "unbox") {
      setBoxes(boxes.map((b) => ({ name: b.name, seats: b.seats.filter((x) => !sel.includes(x)) })).filter((b) => b.seats.length));
    }
    setSel([]);
  }

  const seatCount = rows * cols - off.size;

  async function save() {
    if (!name.trim()) return setErr("請填寫場地名稱");
    setBusy(true);
    setErr("");
    try {
      const row = {
        name: name.trim(),
        n_rows: rows,
        n_cols: cols,
        off_seats: [...off],
        boxes,
        stage,
        updated_at: new Date().toISOString(),
      };
      if (isNew) {
        const { error } = await supabase.from("venues").insert(row);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("venues").update(row).eq("id", venue.id);
        if (error) throw error;
      }
      flash?.(isNew ? "場地已新增" : "場地已更新");
      onSaved?.();
    } catch (e) {
      setErr("儲存失敗：" + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  const U = 22;
  const CW = U - 4;

  return (
    <>
      <div className="mask on" onClick={onClose} />
      <div className="modal on wide">
        <div className="modal-head">
          <h3>{isNew ? "新增場地" : `編輯場地 · ${venue.name}`}</h3>
          <span className="x" onClick={onClose}>✕</span>
        </div>

        <div className="modal-body">
          <div className="fgrid">
            <div className="fld"><label>場地名稱</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="A 廳" /></div>
            <div className="fld"><label>舞台形狀</label>
              <select value={stage.shape} onChange={(e) => setStage({ ...stage, shape: e.target.value })}>
                {SHAPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></div>
            <div className="fld"><label>舞台顯示文字</label>
              <input value={stage.label} onChange={(e) => setStage({ ...stage, label: e.target.value })} /></div>
            <div className="fld"><label>排數</label>
              <input type="number" min={1} max={60} value={rows} onChange={(e) => resize(e.target.value, cols)} /></div>
            <div className="fld"><label>每排席數</label>
              <input type="number" min={1} max={60} value={cols} onChange={(e) => resize(rows, e.target.value)} /></div>

            <div className="fld full">
              <label>舞台位置與大小（單位＝格）</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {[["x", "左右"], ["y", "上下"], ["w", "寬"], ["h", "高"]].map(([k, l]) => (
                  <div key={k}>
                    <small style={{ color: "var(--muted)", fontSize: 11 }}>{l}</small>
                    <input
                      type="number" step="0.5"
                      value={stage[k]}
                      onChange={(e) => setStage({ ...stage, [k]: Number(e.target.value) || 0 })}
                    />
                  </div>
                ))}
              </div>
              <small style={{ color: "var(--muted)", fontSize: 11, display: "block", marginTop: 6 }}>
                上下設成負數會放在座位區前方（舞台在前）；大於排數則在後方。
              </small>
            </div>

            <div className="fld full">
              <label>
                座位圖 — <b>點一格</b>當起點、移動滑鼠預覽範圍、<b>再點一下</b>確定
              </label>

              <div className="ed-tools">
                <span className="lbl">框選後：</span>
                <button className="btn btn-ghost btn-sm" onClick={() => act("off")}>移除座位（走道 / 空位）</button>
                <button className="btn btn-ghost btn-sm" onClick={() => act("on")}>恢復座位</button>
                <button className="btn btn-ghost btn-sm" onClick={() => act("box")}>設為包廂</button>
                <button className="btn btn-ghost btn-sm" onClick={() => act("unbox")}>取消包廂</button>
                <span className="sel-info">
                  {anchor
                    ? `選取中… ${preview.length} 格（再點一下確定，Esc 取消）`
                    : sel.length
                    ? `已框選 ${sel.length} 格，請按上方動作套用（Esc 取消）`
                    : "尚未框選"}
                </span>
              </div>

              <div style={{ overflow: "auto", maxHeight: "46vh", padding: 8, background: "var(--bg2)", borderRadius: 12 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `${CW}px repeat(${cols}, ${CW}px)`,
                    gap: 4,
                    width: "max-content",
                  }}
                  onMouseLeave={() => anchor && setHover(anchor)}
                >
                  <div />
                  {Array.from({ length: cols }, (_, c) => (
                    <div key={"h" + c} style={{ fontSize: 9, color: "var(--muted)", textAlign: "center" }}>{c + 1}</div>
                  ))}

                  {Array.from({ length: rows }, (_, r) => (
                    <Row
                      key={"r" + r}
                      r={r}
                      cols={cols}
                      CW={CW}
                      off={off}
                      boxSeatSet={boxSeatSet}
                      previewSet={previewSet}
                      selSet={selSet}
                      anchor={anchor}
                      onEnter={setHover}
                      onClick={clickCell}
                    />
                  ))}
                </div>
              </div>

              <div className="legend" style={{ marginTop: 10 }}>
                <span><i style={{ background: "rgba(255,255,255,.14)" }} />座位</span>
                <span><i style={{ background: "transparent", border: "1px dashed var(--line2)" }} />走道 / 無座位</span>
                <span><i style={{ boxShadow: "inset 0 0 0 2px rgba(240,192,106,.75)" }} />包廂</span>
                <span><i style={{ background: "var(--brand)" }} />框選中</span>
              </div>

              <div style={{ marginTop: 12, fontSize: 13, color: "var(--muted)" }}>
                共 <b style={{ color: "var(--brand3)" }}>{seatCount}</b> 個可售座位
                （{rows} 排 × {cols} 席，已移除 {off.size} 格）
              </div>

              {boxes.length > 0 && (
                <div className="box-list" style={{ marginTop: 10 }}>
                  {boxes.map((b, i) => (
                    <span className="box-chip" key={i}>
                      ▣ {b.name} · {b.seats.length} 席
                      <button
                        onClick={() => {
                          const n = window.prompt("包廂名稱", b.name);
                          if (!n) return;
                          const nb = [...boxes];
                          nb[i] = { ...b, name: n };
                          setBoxes(nb);
                        }}
                      >
                        改名
                      </button>
                      <button onClick={() => setBoxes(boxes.filter((_, j) => j !== i))}>✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="fld full">
              <div className="spec">
                <b>💡 使用方式</b>先設排數與每排席數 → 框選中間一整欄按「移除座位」做走道 →
                框選角落幾席按「設為包廂」並命名 → 儲存。之後在節目管理選這個場地就能直接賣票。
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

function Row({ r, cols, CW, off, boxSeatSet, previewSet, selSet, anchor, onEnter, onClick }) {
  return (
    <>
      <div style={{ fontSize: 9, color: "var(--muted)", display: "grid", placeItems: "center" }}>{rowLabel(r)}</div>
      {Array.from({ length: cols }, (_, c) => {
        const id = sid(r, c);
        const isOff = off.has(id);
        const inBox = boxSeatSet.has(id);
        const inPreview = anchor && previewSet.has(id);
        const inSel = selSet.has(id);

        return (
          <div
            key={id}
            title={`${rowLabel(r)}${c + 1}`}
            onMouseEnter={() => anchor && onEnter(id)}
            onClick={() => onClick(id)}
            style={{
              width: CW,
              height: CW,
              borderRadius: 4,
              cursor: "pointer",
              background: inPreview || inSel ? "var(--brand)" : isOff ? "transparent" : "rgba(255,255,255,.14)",
              border: isOff ? "1px dashed var(--line2)" : "1px solid transparent",
              boxShadow: inBox ? "inset 0 0 0 2px rgba(240,192,106,.75)" : undefined,
            }}
          />
        );
      })}
    </>
  );
}
