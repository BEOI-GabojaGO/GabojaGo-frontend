"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormField } from "@/components/auth/form-field";
import { readErrorMessage } from "@/lib/auth-client";

export function SignupForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

    if (password !== passwordConfirm) {
      setError("비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    setPending(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password,
          nickname: formData.get("nickname"),
        }),
      });

      if (!response.ok) {
        setError(await readErrorMessage(response));
        return;
      }

      router.push("/login?registered=1");
    } catch {
      setError("서버에 연결할 수 없습니다. 백엔드 서버 상태를 확인해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormField
        label="이메일"
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="example@email.com"
        required
      />
      <FormField
        label="닉네임"
        id="nickname"
        name="nickname"
        type="text"
        autoComplete="nickname"
        placeholder="사용할 닉네임을 입력해 주세요"
        required
      />
      <FormField
        label="비밀번호"
        id="password"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="비밀번호를 입력해 주세요"
        required
      />
      <FormField
        label="비밀번호 확인"
        id="passwordConfirm"
        name="passwordConfirm"
        type="password"
        autoComplete="new-password"
        placeholder="비밀번호를 한 번 더 입력해 주세요"
        required
      />

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-blue-300"
      >
        {pending ? "가입 중..." : "회원가입"}
      </button>
    </form>
  );
}
