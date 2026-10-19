"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormField } from "@/components/auth/form-field";
import { readErrorMessage, safeNext } from "@/lib/auth-client";

type LoginFormProps = {
  registered?: boolean;
  /** 로그인 후 돌아갈 경로(?next=). 같은 사이트 경로가 아니면 무시하고 계정 화면으로 간다. */
  next?: string;
};

export function LoginForm({ registered = false, next }: LoginFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });

      if (!response.ok) {
        setError(await readErrorMessage(response));
        return;
      }

      router.replace(safeNext(next) ?? "/account");
      router.refresh();
    } catch {
      setError("서버에 연결할 수 없습니다. 백엔드 서버 상태를 확인해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {registered && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          회원가입이 완료되었습니다. 가입한 계정으로 로그인해 주세요.
        </p>
      )}

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
        label="비밀번호"
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="비밀번호를 입력해 주세요"
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
        {pending ? "로그인 중..." : "로그인"}
      </button>
    </form>
  );
}
