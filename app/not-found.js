import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        background: "#FAFBFC",
        padding: 20,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 48, fontWeight: 200, color: "#0A0E14" }}>404</div>
      <div style={{ fontSize: 15, color: "#697485" }}>
        找不到這個頁面
      </div>
      <Link
        href="/"
        style={{
          marginTop: 8,
          padding: "10px 24px",
          background: "#0A0E14",
          color: "#fff",
          borderRadius: 3,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        回到首頁
      </Link>
    </div>
  );
}
