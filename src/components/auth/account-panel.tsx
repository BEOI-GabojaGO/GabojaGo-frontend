"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { readErrorMessage } from "@/lib/auth-client";

type User = {
  id: number;
  email: string;
  nickname: string;
  createdAt: string;
};

export function AccountPanel() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [pendingLogout, setPendingLogout] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadUser() {
      try {
        const response = await fetch("/api/users/me", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          setError(await readErrorMessage(response));
          return;
        }

        setUser((await response.json()) as User);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError("사용자 정보를 불러오지 못했습니다.");
      }
    }

    void loadUser();

    return () => controller.abort();
  }, [router]);

  async function logout() {
    setPendingLogout(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12">
      <div className="absolute -left-24 top-[-7rem] h-72 w-72 rounded-full bg-blue-200/60 blur-3xl" />
      <div className="absolute -bottom-32 right-[-5rem] h-80 w-80 rounded-full bg-indigo-200/60 blur-3xl" />

      <section className="relative w-full max-w-lg rounded-3xl border border-white/80 bg-white/95 p-7 shadow-[0_24px_70px_-30px_rgba(31,72,145,0.45)] sm:p-10">
        <div className="mb-8 flex items-center gap-2 text-xl font-black tracking-tight text-blue-700">
          <span className="grid size-9 place-items-center rounded-xl bg-blue-600 text-sm text-white shadow-sm">
            GO
          </span>
          가보자GO
        </div>

        {!user && !error && (
          <p role="status" className="text-sm text-slate-500">
            로그인 정보를 확인하고 있어요...
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {user && (
          <>
            <header className="mb-8">
              <p className="text-sm font-semibold text-blue-700">로그인 완료</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {user.nickname}님, 반가워요
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                JWT로 인증된 백엔드 사용자 정보를 불러왔습니다.
              </p>
            </header>

            <dl className="space-y-4 rounded-2xl bg-slate-50 p-5 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-slate-500">이메일</dt>
                <dd className="text-right font-semibold text-slate-800">{user.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-slate-500">회원 번호</dt>
                <dd className="font-semibold text-slate-800">{user.id}</dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={logout}
              disabled={pendingLogout}
              className="mt-7 h-12 w-full rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {pendingLogout ? "로그아웃 중..." : "로그아웃"}
            </button>
          </>
        )}
      </section>
    </main>
  );
}
