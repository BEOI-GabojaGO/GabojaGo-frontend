import { Noto_Sans_KR } from "next/font/google";
import { AuthPage } from "@/components/auth/auth-forms";
import "../auth.css";

const notoSansKr = Noto_Sans_KR({ subsets: ["latin"], preload: false, variable: "--font-noto-kr" });

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { next } = await searchParams;

  return (
    <main className={`auth-ui auth-page ${notoSansKr.variable}`}>
      <AuthPage view="signup" next={typeof next === "string" ? next : undefined} />
    </main>
  );
}
