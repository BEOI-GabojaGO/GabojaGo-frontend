import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams: Promise<{ registered?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { registered, next } = await searchParams;

  return (
    <AuthShell
      title="다시 만나 반가워요"
      description="여행 조건을 저장하고 나에게 맞는 항공권을 찾아보세요."
      footerText="아직 계정이 없나요?"
      footerHref="/signup"
      footerLinkText="회원가입"
    >
      <LoginForm registered={registered === "1"} next={next} />
    </AuthShell>
  );
}
