import { PLANS } from "@/lib/wv-cms";
import PlanCard from "@/components/wv/PlanCard";

export const metadata = {
  title: "會員儲值",
  description: "Wonder V 會員儲值方案：沉浸節目畫質、AI 夥伴語音、電商折扣與場域門票優先購。",
};

export default function VipPage() {
  return (
    <section>
      <div className="wrap">
        <div className="sec-head">
          <div>
            <span className="tag">MEMBERSHIP · 會員儲值</span>
            <h2 className="serif">儲值方案</h2>
          </div>
        </div>

        <div className="plans">
          {PLANS.map((p) => (
            <PlanCard key={p.n} plan={p} mode="topup" />
          ))}
        </div>

        <div className="mp-note" style={{ marginTop: 20 }}>
          儲值金流串接中（綠界 ECPay）。方案內容與贈幣比例以實際開通時公告為準，
          已儲值的點數不因方案調整而失效。
        </div>
      </div>
    </section>
  );
}
