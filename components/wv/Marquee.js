import { MARQUEE } from "@/lib/wv-cms";

export default function Marquee() {
  if (!MARQUEE) return null;
  const items = MARQUEE.split("｜").filter(Boolean);
  // CSS 的 @keyframes mq 位移 -50%，所以內容要剛好兩份才會無縫循環
  const doubled = [...items, ...items];
  return (
    <div className="marquee">
      <div className="mq-track">
        {doubled.map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>
    </div>
  );
}
