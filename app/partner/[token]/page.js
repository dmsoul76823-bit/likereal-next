import PartnerClient from "./PartnerClient";

export const metadata = {
  title: "推廣成效",
  robots: { index: false, follow: false },
};

export default async function PartnerPage({ params }) {
  const { token } = await params;
  return <PartnerClient token={token} />;
}
