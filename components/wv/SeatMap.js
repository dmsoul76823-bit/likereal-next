"use client";
import { Fragment, useEffect, useState } from "react";
import {
  ZONE_COLORS,
  rowLabel,
  sid,
  seatLabelOf,
  boxOf,
  normStage,
} from "@/lib/wv-seats";

const MARGIN = 4; // 四周留白格數

export default function SeatMap({ venue, zm, sold, sel, activeTier, tickets, onPick }) {
  const [u, setU] = useState(24); // 格子單位（手機放大）

  useEffect(() => {
    const calc = () => setU(window.innerWidth < 640 ? 28 : 24);
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  if (!venue || !venue.rows || !venue.cols) {
    return (
      <div style={{ color: "var(--muted)", fontSize: 14, padding: "20px 0" }}>
        這個場次還沒有設定座位圖。
      </div>
    );
  }

  const CW = u - 4;
  const only =
    activeTier === undefined || activeTier === null || activeTier < 0 ? null : activeTier;
  const off = new Set(venue.off || []);

  const rows = [];
  for (let r = 0; r < venue.rows; r++) {
    const cells = [];
    for (let c = 0; c < venue.cols; c++) {
      const id = sid(r, c);

      if (off.has(id)) {
        cells.push(<div key={id} className="cell off" />);
        continue;
      }
      const z = zm[id];
      if (!z) {
        cells.push(<div key={id} className="cell na" title="不販售" />);
        continue;
      }

      const bx = boxOf(venue, id);
      let cls = "cell";
      if (bx) cls += " box";
      if (only !== null && z.i !== only) cls += " dim";
      if (sold.has(id)) cls += " sold";
      else if (sel.has(id)) cls += " sel";

      const clickable = !sold.has(id) && !(only !== null && z.i !== only);

      cells.push(
        <div
          key={id}
          className={cls}
          style={{ "--zc": z.col }}
          title={`${z.t?.n || ""} ${seatLabelOf(id)}${bx ? " · " + bx.name : ""}`}
          onClick={clickable ? () => onPick(id) : undefined}
        />
      );
    }
    rows.push(
      <Fragment key={"r" + r}>
        <div className="rl2">{rowLabel(r)}</div>
        {cells}
      </Fragment>
    );
  }

  const st = normStage(venue);
  const ox = MARGIN * u + 24;
  const oy = MARGIN * u + 24;
  const W = (venue.cols + 2 * MARGIN) * u + 24;
  const H = (venue.rows + 2 * MARGIN) * u + 24;

  return (
    <div className="seatmap" style={{ "--cw": CW + "px" }}>
      <div className="scroll-hint">← 可左右滑動查看完整座位圖 →</div>

      <div className="map-area" style={{ width: W, height: H }}>
        <div
          className="sgrid"
          style={{
            left: MARGIN * u,
            top: MARGIN * u,
            gridTemplateColumns: `${CW}px repeat(${venue.cols}, ${CW}px)`,
          }}
        >
          <div />
          {Array.from({ length: venue.cols }, (_, c) => (
            <div key={"c" + c} className="cl">
              {c + 1}
            </div>
          ))}
          {rows}
        </div>

        <div
          className={`stage-el shape-${st.shape}`}
          style={{
            left: ox + st.x * u,
            top: oy + st.y * u,
            width: Math.max(u, st.w * u),
            height: Math.max(u, st.h * u),
          }}
        >
          <div className="stage-shape">{st.label}</div>
        </div>
      </div>

      <div className="legend">
        {(tickets || []).map((t, i) => (
          <span key={i}>
            <i style={{ background: ZONE_COLORS[i % ZONE_COLORS.length] }} />
            {t.n} NT${(Number(t.p) || 0).toLocaleString()}
            {t.unit === "box" ? "／整間" : ""}
          </span>
        ))}
        <span>
          <i style={{ background: "#2a2438", opacity: 0.6 }} />
          已售
        </span>
        <span>
          <i style={{ background: "linear-gradient(135deg,var(--brand),var(--rose))" }} />
          已選
        </span>
        <span>
          <i style={{ boxShadow: "inset 0 0 0 2px rgba(240,192,106,.75)" }} />
          包廂
        </span>
      </div>
    </div>
  );
}
