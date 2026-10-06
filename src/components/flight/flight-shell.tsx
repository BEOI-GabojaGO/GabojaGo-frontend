import Link from "next/link";
import type { ReactNode } from "react";

type FlightShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function FlightShell({ title, description, children }: FlightShellProps) {
  return (
    <main className="relative flex min-h-screen justify-center overflow-hidden px-5 py-12">
      <div className="absolute -left-24 top-[-7rem] h-72 w-72 rounded-full bg-blue-200/60 blur-3xl" />
      <div className="absolute -bottom-32 right-[-5rem] h-80 w-80 rounded-full bg-indigo-200/60 blur-3xl" />

      <section className="relative h-fit w-full max-w-3xl rounded-3xl border border-white/80 bg-white/95 p-7 shadow-[0_24px_70px_-30px_rgba(31,72,145,0.45)] sm:p-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            href="/flights"
            className="inline-flex items-center gap-2 text-xl font-black tracking-tight text-blue-700"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-blue-600 text-sm text-white shadow-sm">
              GO
            </span>
            가보자GO
          </Link>
          <nav className="flex items-center gap-4 text-sm font-semibold text-slate-500">
            <Link href="/wishlist" className="hover:text-blue-700 hover:underline">
              위시리스트
            </Link>
            <Link href="/account" className="hover:text-blue-700 hover:underline">
              내 계정
            </Link>
          </nav>
        </div>

        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </header>

        {children}
      </section>
    </main>
  );
}
