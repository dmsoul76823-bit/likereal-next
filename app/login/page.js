import LoginClient from "./LoginClient";
import "../wv.css";

export const metadata = {
  title: "會員登入 / 註冊",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginClient />;
}
