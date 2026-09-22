import Link from "next/link";
import { FlightShell } from "@/components/flight/flight-shell";

const FLOWS = [
  {
    href: "/flights/round-trip/step",
    title: "왕복 · 단계별 조회",
    description: "가는편을 고르고, 이어지는 오는편을 고른 뒤 예약 옵션을 확인합니다.",
    ready: true,
  },
  {
    href: "/flights/round-trip",
    title: "왕복 · 일정 한 번에 조회",
    description: "왕복 일정을 한 번에 입력하고 가는편·오는편 조합을 비교합니다.",
    ready: true,
  },
  {
    href: "/flights/one-way",
    title: "편도 조회",
    description: "편도 항공편을 찾고 바로 예약 옵션을 확인합니다.",
    ready: true,
  },
];

export default function FlightsPage() {
  return (
    <FlightShell
      title="항공권 찾기"
      description="조회 방식을 선택해 주세요."
    >
      <ul className="space-y-3">
        {FLOWS.map((flow) => (
          <li key={flow.href}>
            {flow.ready ? (
              <Link
                href={flow.href}
                className="block rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-400 hover:bg-blue-50/40"
              >
                <p className="font-bold text-slate-900">{flow.title}</p>
                <p className="mt-1 text-sm text-slate-500">{flow.description}</p>
              </Link>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5">
                <p className="font-bold text-slate-400">
                  {flow.title}
                  <span className="ml-2 text-xs font-semibold">준비 중</span>
                </p>
                <p className="mt-1 text-sm text-slate-400">{flow.description}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </FlightShell>
  );
}
