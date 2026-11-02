"use client";
import { useState } from "react";
import { ANNOUNCEMENTS } from "@/lib/wv-cms";

export default function Announcements() {
  const [open, setOpen] = useState(null);
  if (!ANNOUNCEMENTS.length) return null;

  return (
    <div className="ann">
      {ANNOUNCEMENTS.map((a) => (
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
