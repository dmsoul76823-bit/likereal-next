import TicketClient from "./TicketClient";

export const metadata = {
  title: "電子票券",
  robots: { index: false, follow: false },
};

export default async function TicketPage({ params }) {
  const { orderId } = await params;
  return <TicketClient orderId={orderId} />;
}
