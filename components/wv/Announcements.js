"use client";
import { useState } from "react";

export default function Announcements({ items = [] }) {
  const [open, setOpen] = useState(null);
  if (!items.length) return null;

  return (
    <div className="ann">
      {items.map((a) => (
        <div
          key={a.id}
          className={`ann-i${open === a.id ? " open" : ""}`}
          onClick={() => setOpen(open === a.id ? null : a.id)}
        >
          <div className="h">
            <span className="tg">{a.tag}</span>
            <span className="ti">{a.title}</span>
            <span className="dt">{a.date}</span>
          </div>
          {a.body && <div className="bd">{a.body}</div>}
        </div>
      ))}
    </div>
  );
}
