export default function Loading() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        background: "#FAFBFC",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: "3px solid #E4E8ED",
          borderTopColor: "#0066FF",
          borderRadius: "50%",
          animation: "lr-spin 0.8s linear infinite",
        }}
      />
      <div style={{ fontSize: 13, color: "#A4ACB8" }}>載入中…</div>
      <style>{`@keyframes lr-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
