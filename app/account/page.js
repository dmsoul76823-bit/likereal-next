import AccountClient from "./AccountClient";

export const metadata = {
  title: "會員中心",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return <AccountClient />;
}