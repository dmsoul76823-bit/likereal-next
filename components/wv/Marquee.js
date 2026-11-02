export default function Marquee({ text = "" }) {
  const items = String(text || "").split("｜").filter(Boolean);
  if (!items.length) return null;
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
