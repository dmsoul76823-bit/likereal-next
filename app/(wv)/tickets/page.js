import { getSessionCards } from "@/lib/wv";
import TicketGrid from "@/components/wv/TicketGrid";

export const revalidate = 300;

export const metadata = {
  alternates: { canonical: "/tickets" },
  title: "場域售票",
  description: "Wonder V 沉浸式場域的所有開放場次，依日期排序，可直接選位購票。",
};

export default async function TicketsPage() {
  const sessions = await getSessionCards();

  return (
    <section>
      <div className="wrap">
        <div className="sec-head">
          <div>
            <span className="tag">VENUE · 場域售票</span>
            <h2 className="serif">現場沉浸門票</h2>
          </div>
        </div>

        <p style={{ color: "var(--muted)", margin: "-14px 0 24px", fontSize: "var(--fs-base)" }}>
          最近的 {sessions.length.toLocaleString()} 個場次，依日期排序。點卡片進入節目頁即可選位購票；
          更遠的日期可以到<a href="/programs" style={{ color: "var(--brand3)" }}>節目總覽</a>裡查看該節目的全部場次。
        </p>

        <TicketGrid sessions={sessions} />
      </div>
    </section>
  );
}
