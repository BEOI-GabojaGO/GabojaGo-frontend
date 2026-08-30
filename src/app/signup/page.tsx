import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <AuthShell
      title="여행을 시작해 볼까요?"
      description="간단한 정보만 입력하면 가보자GO를 시작할 수 있어요."
      footerText="이미 계정이 있나요?"
      footerHref="/login"
      footerLinkText="로그인"
    >
      <SignupForm />
    </AuthShell>
  );
}
