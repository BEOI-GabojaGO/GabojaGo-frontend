import { formatMinutes } from "@/lib/flight-client";
import type { FlightOption } from "@/lib/flight-types";

/** 항공사·편명, 출발→도착 공항과 현지시각, 소요시간 요약. 가격은 문맥마다 의미가 달라 포함하지 않는다. */
export function FlightRouteSummary({
  option,
  label,
}: {
  option: Omit<FlightOption, "id">;
  label?: string;
}) {
  const first = option.segments[0];
  const last = option.segments[option.segments.length - 1];
  const airlines = [...new Set(option.segments.map((segment) => segment.airline).filter(Boolean))];
  const flightNumbers = option.segments.map((segment) => segment.flightNumber).filter(Boolean);

  return (
    <div className="flex min-w-0 items-start gap-4">
      {option.airlineLogo && (
        // 로고는 외부(SerpApi) 이미지라 next/image 원격 설정 없이 그대로 표시한다.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={option.airlineLogo} alt="" className="size-10 shrink-0 object-contain" />
      )}
      <div className="min-w-0 text-sm">
        <p className="font-bold text-slate-900">
          {label && (
            <span className="mr-2 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
              {label}
            </span>
          )}
          {airlines.join(", ") || "항공사 정보 없음"}
          <span className="ml-2 font-medium text-slate-400">{flightNumbers.join(" · ")}</span>
        </p>
        <p className="mt-1 text-slate-700">
          {first?.departure?.code} {first?.departure?.localTime}
          <span className="mx-2 text-slate-400">→</span>
          {last?.arrival?.code} {last?.arrival?.localTime}
        </p>
        <p className="mt-1 text-slate-500">
          소요 {formatMinutes(option.totalDurationMinutes)} · 직항
        </p>
      </div>
    </div>
  );
}
