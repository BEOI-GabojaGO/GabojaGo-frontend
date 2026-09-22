import { FlightRouteSummary } from "@/components/flight/flight-option-card";
import { formatMinutes, formatPrice } from "@/lib/flight-client";
import type { RoundTripCombination } from "@/lib/flight-types";

type RoundTripCombinationCardProps = {
  combination: RoundTripCombination;
  onSelect?: () => void;
  disabled?: boolean;
};

export function RoundTripCombinationCard({
  combination,
  onSelect,
  disabled = false,
}: RoundTripCombinationCardProps) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-4">
        <FlightRouteSummary option={combination.outbound} label="가는편" />
        <FlightRouteSummary option={combination.inbound} label="오는편" />
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end">
        <div className="text-right">
          <p className="text-xs text-slate-500">확정 왕복 총액</p>
          <p className="text-lg font-bold text-slate-900">{formatPrice(combination.price)}</p>
          <p className="mt-1 text-xs text-slate-500">
            {combination.stayMinutes == null
              ? "체류 시간 계산 불가(도착·출발 공항 다름)"
              : `현지 체류 ${formatMinutes(combination.stayMinutes)}`}
          </p>
          {combination.sameAirline && (
            <span className="mt-1 inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              같은 항공사
            </span>
          )}
        </div>
        {onSelect && (
          <button
            type="button"
            onClick={onSelect}
            disabled={disabled}
            className="h-10 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            이 조합 선택
          </button>
        )}
      </div>
    </article>
  );
}
