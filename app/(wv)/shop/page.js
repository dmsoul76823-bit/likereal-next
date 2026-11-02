import { getProducts } from "@/lib/wv";
import ProductCard from "@/components/wv/ProductCard";

export const revalidate = 300;

export const metadata = {
  title: "裸視 3D 精選",
  description: "裸視 3D 手機膜、平板膜與 3D 眼鏡等沉浸觀看裝備，不用戴眼鏡也能看出立體感。",
};

export default async function ShopPage() {
  const products = await getProducts();

  return (
    <section>
      <div className="wrap">
        <div className="sec-head">
          <div>
            <span className="tag">3D GEAR · 沉浸觀看裝備</span>
            <h2 className="serif">裸視 3D 精選</h2>
          </div>
        </div>

        {products.length ? (
          <div className="grid g4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div style={{ color: "var(--muted)", fontSize: 14 }}>目前沒有上架中的商品。</div>
        )}
      </div>
    </section>
  );
}
