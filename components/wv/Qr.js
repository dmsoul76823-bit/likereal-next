"use client";
import { useEffect, useState } from "react";

/**
 * 真的可以掃的 QR Code。
 * 用 qrcode 套件在瀏覽器端畫成圖片；若套件載入失敗就退回顯示文字票號，
 * 不會整頁壞掉。
 */
export default function Qr({ value, size = 256 }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const url = await QRCode.toDataURL(String(value), {
          width: size,
          margin: 1,
          errorCorrectionLevel: "M",
          color: { dark: "#0c0a12", light: "#ffffff" },
        });
        if (alive) setSrc(url);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [value, size]);

  if (src) return <img src={src} alt={`票號 ${value} 的 QR Code`} />;
  if (failed) return <div className="fallback">{value}</div>;
  return null;
}
