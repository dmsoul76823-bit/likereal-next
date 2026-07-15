"use client";
import Link from "next/link";

export default function Error({ reset }) {
  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        background: "#FAFBFC",
        padding: 20,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: "#0A0E14" }}>
        發生了一點問題
      </div>
      <div style={{ fontSize: 13, color: "#697485" }}>
        頁面載入時出現錯誤，請稍後再試。
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button
          onClick={reset}
          style={{
            padding: "10px 24px",
            background: "#0A0E14",
            color: "#fff",
            border: "none",
            borderRadius: 3,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          重試
        </button>
        <Link
          href="/"
          style={{
            padding: "10px 24px",
            background: "#fff",
            border: "1px solid #E4E8ED",
            borderRadius: 3,
            fontSize: 14,
            color: "#0A0E14",
          }}
        >
          回首頁
        </Link>
      </div>
    </div>
  );
}
