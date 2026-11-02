"use client";
import { useEffect, useRef, useState } from "react";

/**
 * 手機陀螺儀傾斜 3D 效果
 * 移植自 lireal_platform.html，沿用同一組契約：
 *   - html.tilt-on 開啟
 *   - CSS 變數 --tiltx / --tilty
 *   - localStorage 'LIREAL_TILT' 記住使用者已授權
 * iOS 需要使用者手勢授權，所以會顯示一顆提示鈕。
 */
export default function Tilt() {
  const [needBtn, setNeedBtn] = useState(false);
  const stateRef = useRef({ base: null, raf: 0, running: false });
  const askRef = useRef(null);

  useEffect(() => {
    const root = document.documentElement;
    const st = stateRef.current;
    const clamp = (v, m) => (v < -m ? -m : v > m ? m : v);

    function onOri(e) {
      const g = e.gamma;
      const b = e.beta;
      if (g == null && b == null) return;
      if (!st.base) st.base = { g: g || 0, b: b || 0 };
      // 基準緩慢跟隨，使用者換姿勢後畫面會自動回正
      st.base.g += ((g || 0) - st.base.g) * 0.015;
      st.base.b += ((b || 0) - st.base.b) * 0.015;
      const tx = clamp(((g || 0) - st.base.g) * 0.5, 7);
      const ty = clamp(((b || 0) - st.base.b) * 0.5, 7);
      if (!st.raf) {
        st.raf = requestAnimationFrame(() => {
          st.raf = 0;
          root.style.setProperty("--tiltx", tx.toFixed(2));
          root.style.setProperty("--tilty", ty.toFixed(2));
        });
      }
    }

    function start() {
      if (st.running) return;
      st.running = true;
      window.addEventListener("deviceorientation", onOri, true);
      root.classList.add("tilt-on");
      setNeedBtn(false);
      try {
        localStorage.setItem("LIREAL_TILT", "1");
      } catch (e) {}
    }

    const DOE = typeof window !== "undefined" ? window.DeviceOrientationEvent : undefined;
    const needPerm = typeof DOE !== "undefined" && typeof DOE?.requestPermission === "function";

    if (!needPerm) {
      // Android 與一般瀏覽器可直接啟用
      if (typeof DOE !== "undefined") start();
      return cleanup;
    }

    // iOS：需要手勢授權
    setNeedBtn(true);
    let granted = false;
    try {
      granted = localStorage.getItem("LIREAL_TILT") === "1";
    } catch (e) {}

    const ask = async () => {
      try {
        const res = await DOE.requestPermission();
        if (res === "granted") start();
        else setNeedBtn(false);
      } catch (e) {
        setNeedBtn(false);
      }
    };
    askRef.current = ask;

    // 之前已允許過：第一次觸碰畫面時再要一次（iOS 會安靜通過）
    if (granted) {
      const once = () => {
        document.removeEventListener("touchend", once);
        ask();
      };
      document.addEventListener("touchend", once, { once: true, passive: true });
    }

    function cleanup() {
      window.removeEventListener("deviceorientation", onOri, true);
      if (st.raf) cancelAnimationFrame(st.raf);
      root.classList.remove("tilt-on");
      st.running = false;
    }
    return cleanup;
  }, []);

  if (!needBtn) return null;
  return (
    <button
      type="button"
      className="tilt-btn on"
      onClick={() => askRef.current?.()}
      aria-label="開啟 3D 傾斜效果"
    >
      ◈ 開啟 3D 傾斜
    </button>
  );
}
