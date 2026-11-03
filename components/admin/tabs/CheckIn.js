"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { tpeTime } from "@/lib/admin";

/** 掃到的字串可能是純票號，也可能像 WONDERV|xxx，取最後一段 */
function normalize(text) {
  const t = String(text || "").trim();
  if (!t) return "";
  const parts = t.split("|");
  return (parts[parts.length - 1] || "").trim();
}

const STATE_TAG = {
  ok: ["ok", "✓ 驗票成功"],
  used: ["warn", "⚠ 已入場過"],
  unpaid: ["err", "✕ 未付款"],
  notfound: ["err", "✕ 查無票券"],
  error: ["err", "✕ 發生錯誤"],
};

export default function CheckIn({ flash }) {
  const [scanning, setScanning] = useState(false);
  const [camErr, setCamErr] = useState("");
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(null);
  const [log, setLog] = useState([]);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const lockRef = useRef(false); // 同一張票別連掃好幾次
  const seenRef = useRef(new Map());

  const submit = useCallback(
    async (raw) => {
      const code = normalize(raw);
      if (!code || busy) return;

      // 3 秒內掃到同一張就略過
      const now = Date.now();
      const prev = seenRef.current.get(code);
      if (prev && now - prev < 3000) return;
      seenRef.current.set(code, now);

      setBusy(true);
      try {
        const { data, error } = await supabase.rpc("check_in", { p_code: code });
        if (error) throw error;

        const res = { ...data, code, at: new Date().toISOString() };
        setLast(res);
        setLog((l) => [res, ...l].slice(0, 20));

        // 成功震一下，失敗震三下
        if (navigator.vibrate) navigator.vibrate(data?.ok ? 120 : [80, 60, 80, 60, 80]);
      } catch (e) {
        const res = {
          ok: false,
          state: "error",
          msg: e?.message || String(e),
          code,
          at: new Date().toISOString(),
        };
        setLast(res);
        setLog((l) => [res, ...l].slice(0, 20));
      } finally {
        setBusy(false);
        setManual("");
      }
    },
    [busy]
  );

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const start = useCallback(async () => {
    setCamErr("");
    try {
      const jsQR = (await import("jsqr")).default;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;

      const v = videoRef.current;
      v.srcObject = stream;
      v.setAttribute("playsinline", "true");
      await v.play();
      setScanning(true);

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      const tick = () => {
        if (!streamRef.current) return;
        if (v.readyState === v.HAVE_ENOUGH_DATA) {
          const w = (canvas.width = v.videoWidth);
          const h = (canvas.height = v.videoHeight);
          if (w && h) {
            ctx.drawImage(v, 0, 0, w, h);
            const img = ctx.getImageData(0, 0, w, h);
            const hit = jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
            if (hit?.data && !lockRef.current) {
              lockRef.current = true;
              submit(hit.data).finally(() => {
                setTimeout(() => {
                  lockRef.current = false;
                }, 1200);
              });
            }
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      const m = e?.name === "NotAllowedError"
        ? "瀏覽器拒絕了相機權限。請在網址列左邊的鎖頭圖示把相機改成「允許」，再按一次開始掃描。"
        : e?.name === "NotFoundError"
        ? "找不到相機。"
        : `無法開啟相機：${e?.message || e}`;
      setCamErr(m);
      setScanning(false);
    }
  }, [submit]);

  useEffect(() => () => stop(), [stop]);

  const tag = STATE_TAG[last?.state] || STATE_TAG.error;

  return (
    <>
      <div className="panel">
        <h3>掃描入場</h3>
        <div className="hint">
          用手機鏡頭對準電子票券上的 QR Code。需要 HTTPS 或 localhost 才能開啟相機。
        </div>

        <div style={{ display: "flex", gap: 12, margin: "16px 0", flexWrap: "wrap" }}>
          {!scanning ? (
            <button className="btn btn-brand" onClick={start}>📷 開始掃描</button>
          ) : (
            <button className="btn btn-ghost" onClick={stop}>停止掃描</button>
          )}
        </div>

        {camErr && (
          <div style={{ color: "var(--err)", fontSize: 13, marginBottom: 14, lineHeight: 1.8 }}>
            {camErr}
          </div>
        )}

        <div
          style={{
            position: "relative",
            display: scanning ? "block" : "none",
            maxWidth: 480,
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid var(--line)",
            background: "#000",
          }}
        >
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} style={{ width: "100%", display: "block" }} muted playsInline />
          <div
            style={{
              position: "absolute",
              inset: "16%",
              border: "2px solid rgba(201,182,240,.85)",
              borderRadius: 14,
              boxShadow: "0 0 0 100vmax rgba(0,0,0,.28)",
              pointerEvents: "none",
            }}
          />
        </div>
        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div style={{ marginTop: 18 }}>
          <div className="hint" style={{ marginBottom: 8 }}>
            掃不到或沒有相機時，直接輸入票券編號：
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit(manual)}
              placeholder="WV-2026-1004-1-3814"
              style={{
                flex: 1, minWidth: 240, background: "var(--bg2)",
                border: "1px solid var(--line2)", borderRadius: 11,
                padding: "11px 14px", color: "var(--text)", fontSize: 14,
                outline: "none", fontFamily: "ui-monospace, monospace",
              }}
            />
            <button className="btn btn-brand" onClick={() => submit(manual)} disabled={busy}>
              {busy ? "驗票中…" : "驗票"}
            </button>
          </div>
        </div>
      </div>

      {last && (
        <div
          className="panel"
          style={{
            borderColor: last.ok ? "rgba(61,220,132,.5)" : "rgba(255,107,129,.5)",
            background: last.ok ? "rgba(61,220,132,.07)" : "rgba(255,107,129,.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <span className={`tag ${tag[0]}`} style={{ fontSize: 14, padding: "6px 14px" }}>
              {tag[1]}
            </span>
            <code style={{ color: "var(--brand3)" }}>{last.code}</code>
          </div>

          <div style={{ fontSize: 15, marginBottom: 12 }}>{last.msg}</div>

          {last.pass && (
            <div style={{ display: "grid", gap: 4 }}>
              <div className="kv"><span>節目</span><b>{last.pass.event_name}</b></div>
              <div className="kv"><span>票種</span><b>{last.pass.ticket_name}</b></div>
              <div className="kv"><span>座位</span><b>{last.pass.seat_label}</b></div>
              <div className="kv"><span>購票人</span><b>{last.buyer || "—"}</b></div>
              <div className="kv"><span>訂單</span><b>{last.pass.order_id}</b></div>
            </div>
          )}
        </div>
      )}

      {log.length > 0 && (
        <div className="panel">
          <h3>本次驗票紀錄</h3>
          <div className="hint">只存在這個畫面，重新整理就清空</div>
          <table>
            <thead>
              <tr>
                <th>時間</th>
                <th>票號</th>
                <th>結果</th>
                <th>座位</th>
              </tr>
            </thead>
            <tbody>
              {log.map((r, i) => {
                const t = STATE_TAG[r.state] || STATE_TAG.error;
                return (
                  <tr key={`${r.code}-${i}`}>
                    <td style={{ color: "var(--muted)" }}>{tpeTime(r.at)}</td>
                    <td><code style={{ fontSize: 12 }}>{r.code}</code></td>
                    <td><span className={`tag ${t[0]}`}>{t[1]}</span></td>
                    <td>{r.pass?.seat_label || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
