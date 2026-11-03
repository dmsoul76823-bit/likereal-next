"use client";

export default function Placeholder({ tab }) {
  return (
    <div className="panel">
      <h3>{tab?.t}</h3>
      <div className="hint">{tab?.d}</div>
      <p style={{ color: "var(--muted)", marginTop: 18, lineHeight: 1.9 }}>
        這一頁還在搬。目前請先用舊後台（<code>lireal_admin.html</code>）操作這個功能，
        兩邊連的是同一個資料庫，改了哪邊都會生效。
      </p>
    </div>
  );
}
