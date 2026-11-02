import Link from "next/link";

export default function ProductCard({ product }) {
  const p = product;
  return (
    <Link href={`/shop/${p.id}`} className="card" style={{ cursor: "pointer" }}>
      <div
        className="prod-thumb fitimg"
        style={p.img ? { backgroundImage: `url("${p.img}")` } : undefined}
      >
        {p.badge && <div className="badge">{p.badge}</div>}
      </div>
      <div className="prod-body">
        <h4>{p.name}</h4>
        {p.sub && <div className="sub">{p.sub}</div>}
        <div className="buy">
          <div className="price">
            {p.oldPrice > 0 && <s>NT${p.oldPrice.toLocaleString()}</s>}
            NT${p.price.toLocaleString()}
          </div>
          <span className="add">看商品</span>
        </div>
      </div>
    </Link>
  );
}
