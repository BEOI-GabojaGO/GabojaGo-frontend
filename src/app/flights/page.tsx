import Link from "next/link";
import { FlightShell } from "@/components/flight/flight-shell";

const FLOWS = [
  {
    href: "/chat",
    title: "대화로 여행 조건 정하기",
    description: "메시지를 주고받으며 항공권 검색 조건을 모아보는 화면 데모입니다.",
    ready: true,
  },
  // 왕복 조건 검색은 단계별(가는편 → 오는편)이 메인이다(2026-10-05 팀 결정).
  // 일괄 조회는 AI 검색 등에서 재사용할 수 있어 보조 조회 방식으로 유지한다.
  {
    href: "/flights/round-trip/step",
    title: "왕복 항공권 조회",
    description: "가는편을 고르고, 이어지는 오는편을 고른 뒤 예약 옵션을 확인합니다.",
    ready: true,
  },
  {
    href: "/flights/round-trip",
    title: "왕복 · 일정 한 번에 조회",
    description: "가는편·오는편 조합을 한 번에 비교합니다. (보조 조회 방식)",
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
