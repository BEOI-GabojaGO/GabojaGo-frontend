import type { ReactNode } from "react";
import { formatLocation, formatPrice } from "@/lib/flight-client";
import type { PriceInsights, SelectedLocations } from "@/lib/flight-types";

// 항공권 조회 흐름(왕복 단계별·왕복 일괄·편도)이 함께 쓰는 작은 UI 조각.

export function StepIndicator({ current, labels }: { current: number; labels: string[] }) {
  return (
    <ol
      className={`grid grid-cols-2 gap-2 text-xs font-semibold ${
        labels.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4"
      }`}
    >
      {labels.map((label, index) => {
        const step = index + 1;

        return (
          <li
            key={label}
            aria-current={step === current ? "step" : undefined}
            className={`rounded-xl px-3 py-2 text-center ${
              step === current
                ? "bg-blue-600 text-white"
                : step < current
                  ? "bg-blue-50 text-blue-700"
                  : "bg-slate-100 text-slate-400"
            }`}
          >
            {step}. {label}
          </li>
        );
      })}
    </ol>
  );
}

type SummaryRequest = {
  outboundDate: string;
  returnDate?: string;
  adults: number;
  children: number;
  infantsInSeat: number;
  infantsOnLap: number;
};

export function SearchSummary({
  request,
  locations,
  onEdit,
}: {
  request: SummaryRequest;
  locations: SelectedLocations;
  onEdit: () => void;
}) {
  const travelers =
    request.adults + request.children + request.infantsInSeat + request.infantsOnLap;

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-5 text-sm">
      <p className="text-slate-700">
        <span className="font-bold text-slate-900">
          {formatLocation(locations.origin)} {request.returnDate ? "⇄" : "→"}{" "}
          {formatLocation(locations.destination)}
        </span>
        <span className="mx-2 text-slate-300">|</span>
        {request.returnDate
          ? `${request.outboundDate} ~ ${request.returnDate}`
          : request.outboundDate}
        <span className="mx-2 text-slate-300">|</span>
        {travelers}명
      </p>
      <SecondaryButton onClick={onEdit}>조건 변경</SecondaryButton>
    </div>
  );
}

export function SecondaryButton({
  onClick,
  disabled = false,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-10 shrink-0 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:text-slate-300"
    >
      {children}
    </button>
  );
}

export function PrimaryButton({
  type = "button",
  onClick,
  disabled = false,
  children,
}: {
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="h-12 w-full rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-blue-300"
    >
      {children}
    </button>
  );
}

export function EmptyMessage({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">{children}</p>
  );
}

export function PriceInsightsNote({ insights }: { insights: PriceInsights | null }) {
  if (!insights) return null;

  return (
    <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
      최저가 {formatPrice(insights.lowestPrice)} · 보통 {formatPrice(insights.typicalPriceLow)} ~{" "}
      {formatPrice(insights.typicalPriceHigh)}
      {insights.priceLevel && ` · 가격 수준 ${insights.priceLevel}`}
    </p>
  );
}

/** 오류 문구. 검색 세션이 만료됐으면 처음부터 다시 검색하는 버튼을 함께 보여 준다. */
export function ErrorAlert({
  message,
  expired = false,
  onRetry,
}: {
  message: string;
  expired?: boolean;
  onRetry?: () => void;
}) {
  if (!message) return null;

  return (
    <div className="space-y-3">
      <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
        {message}
      </p>
      {expired && onRetry && <SecondaryButton onClick={onRetry}>다시 검색하기</SecondaryButton>}
    </div>
  );
}
