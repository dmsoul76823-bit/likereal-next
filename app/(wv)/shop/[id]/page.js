import Link from "next/link";
import { notFound } from "next/navigation";
import { getProducts } from "@/lib/wv";
import MediaHero from "@/components/wv/MediaHero";

export const revalidate = 300;

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ id: String(p.id) }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const products = await getProducts();
  const p = products.find((x) => String(x.id) === String(id));
  if (!p) return { title: "找不到商品" };
  return {
    title: p.name,
    description: p.intro || p.sub || `${p.name}｜Wonder V 裸視 3D 精選`,
    alternates: { canonical: `/shop/${id}` },
  };
}

export default async function ProductDetail({ params }) {
  const { id } = await params;
  const products = await getProducts();
  const p = products.find((x) => String(x.id) === String(id));
  if (!p) notFound();

  const soldOut = p.stock != null && p.stock <= 0;

  return (
    <section>
      <div className="wrap">
        <Link className="backlink" href="/shop">
          ← 回 3D 精選
        </Link>

        <MediaHero img={p.img} ytId={p.ytId} title={p.name} />

        <div className="ev-grid">
          <div>
            <div className="panel">
              <h3 className="ph">商品介紹</h3>
              <p style={{ color: "var(--muted)", lineHeight: 1.9 }}>
                {p.intro || p.sub || "詳細介紹稍後補上。"}
              </p>
            </div>

            {p.spec && (
              <div className="panel">
                <h3 className="ph">規格</h3>
                <p style={{ color: "var(--muted)", lineHeight: 1.9, whiteSpace: "pre-line" }}>
                  {p.spec}
                </p>
              </div>
            )}

            <div className="panel">
              <h3 className="ph">購買須知</h3>
              <ul className="rules">
                <li>商品均為原廠正貨，出貨前逐片檢查。</li>
                <li>下單後 2 個工作天內出貨，離島與偏遠地區另計。</li>
                <li>包膜類商品一經拆封恕不退換，瑕疵品可於到貨 7 日內換新。</li>
                <li>如需現場安裝，可於場域服務台預約。</li>
              </ul>
            </div>
          </div>

          <aside>
            <div className="panel">
              <h3 className="ph">商品資訊</h3>
              <dl className="ev-info">
                <dt>商品</dt>
                <dd>{p.name}</dd>
                <dt>售價</dt>
                <dd>
                  {p.oldPrice > 0 && (
                    <s style={{ color: "var(--muted)", marginRight: 8 }}>
                      NT${p.oldPrice.toLocaleString()}
                    </s>
                  )}
                  NT${p.price.toLocaleString()}
                </dd>
                {p.badge && (
                  <>
                    <dt>標籤</dt>
                    <dd>{p.badge}</dd>
                  </>
                )}
                <dt>庫存</dt>
                <dd>{p.stock == null ? "供應中" : soldOut ? "已售完" : `${p.stock} 件`}</dd>
              </dl>
            </div>

            <div className="panel">
              <h3 className="ph">購買方式</h3>
              <p style={{ color: "var(--muted)", lineHeight: 1.9, fontSize: 14 }}>
                線上購物車與金流串接中。目前可於 Wonder V 場域服務台現場購買，
                或到場域售票現場洽詢。
              </p>
              <Link href="/#sessions" className="btn btn-brand" style={{ width: "100%", textAlign: "center" }}>
                查看場次 →
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
