"use client";

import { useState, type FormEvent } from "react";
import { FormField } from "@/components/auth/form-field";
import { PrimaryButton, SecondaryButton } from "@/components/flight/flow-ui";
import { SelectField } from "@/components/flight/select-field";
import { formatMinutes, formatPrice } from "@/lib/flight-client";
import type {
  RoundTripFilter,
  RoundTripFilterOptions,
  RoundTripSort,
  TimeWindowKey,
} from "@/lib/flight-types";

const SORT_OPTIONS: { value: RoundTripSort; label: string }[] = [
  { value: "PRICE", label: "가격 낮은 순" },
  { value: "DURATION", label: "소요시간 짧은 순" },
  { value: "STAY", label: "체류 긴 순" },
];

const TIME_WINDOWS: { key: TimeWindowKey; label: string }[] = [
  { key: "outboundDepart", label: "가는편 출발" },
  { key: "outboundArrive", label: "가는편 도착" },
  { key: "inboundDepart", label: "오는편 출발" },
  { key: "inboundArrive", label: "오는편 도착" },
];

const MINUTES_PER_DAY = 24 * 60;

export const EMPTY_ROUND_TRIP_FILTER: RoundTripFilter = {
  sort: "PRICE",
  minStayDays: "",
  timeWindows: {
    outboundDepart: { from: "", to: "" },
    outboundArrive: { from: "", to: "" },
    inboundDepart: { from: "", to: "" },
    inboundArrive: { from: "", to: "" },
  },
  includeAirlines: [],
  excludeAirlines: [],
};

/** 필터 폼 상태를 백엔드 필터 조회 쿼리스트링으로 바꾼다. 빈 조건은 보내지 않는다. */
export function toRoundTripQuery(filter: RoundTripFilter, page: number, size: number) {
  const params = new URLSearchParams();
  const days = Number(filter.minStayDays);

  if (filter.minStayDays.trim() !== "" && Number.isFinite(days) && days > 0) {
    params.set("minStayMinutes", String(Math.round(days * MINUTES_PER_DAY)));
  }

  for (const { key } of TIME_WINDOWS) {
    const { from, to } = filter.timeWindows[key];

    if (from) params.set(`${key}From`, from);
    if (to) params.set(`${key}To`, to);
  }

  if (filter.includeAirlines.length > 0) {
    params.set("includeAirlines", filter.includeAirlines.join(","));
  }
  if (filter.excludeAirlines.length > 0) {
    params.set("excludeAirlines", filter.excludeAirlines.join(","));
  }

  params.set("sort", filter.sort);
  params.set("page", String(page));
  params.set("size", String(size));

  return params.toString();
}

type RoundTripFilterFormProps = {
  filterOptions: RoundTripFilterOptions;
  /** 마지막으로 적용된 필터. 폼은 이 값으로 시작한다. */
  value: RoundTripFilter;
  onApply: (filter: RoundTripFilter) => void;
  pending?: boolean;
};

export function RoundTripFilterForm({
  filterOptions,
  value,
  onApply,
  pending = false,
}: RoundTripFilterFormProps) {
  const [draft, setDraft] = useState<RoundTripFilter>(value);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const days = Number(draft.minStayDays);

    if (draft.minStayDays.trim() !== "" && (!Number.isFinite(days) || days < 0)) {
      setError("최소 체류 일수는 0 이상이어야 합니다.");
      return;
    }

    // HH:mm 문자열은 사전순 비교가 시각 비교와 같다.
    const inverted = TIME_WINDOWS.find(({ key }) => {
      const { from, to } = draft.timeWindows[key];
      return from && to && from > to;
    });

    if (inverted) {
      setError(
        `${inverted.label} 시간대의 시작이 끝보다 늦습니다. 자정을 넘는 시간대는 지원하지 않습니다.`,
      );
      return;
    }

    setError("");
    onApply(draft);
  }

  function reset() {
    setDraft(EMPTY_ROUND_TRIP_FILTER);
    setError("");
    onApply(EMPTY_ROUND_TRIP_FILTER);
  }

  function setTime(key: TimeWindowKey, edge: "from" | "to", time: string) {
    setDraft((current) => ({
      ...current,
      timeWindows: {
        ...current.timeWindows,
        [key]: { ...current.timeWindows[key], [edge]: time },
      },
    }));
  }

  function toggleAirline(field: "includeAirlines" | "excludeAirlines", airline: string) {
    setDraft((current) => ({
      ...current,
      [field]: current[field].includes(airline)
        ? current[field].filter((name) => name !== airline)
        : [...current[field], airline],
    }));
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-5"
    >
      <div>
        <h3 className="font-bold text-slate-900">필터 · 정렬</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          모든 조건은 함께(AND) 적용되고, 시각 경계값은 포함됩니다. 필터 조회는 항공권을 새로
          검색하지 않습니다.
          {filterOptions.minPrice != null &&
            ` 가격 범위 ${formatPrice(filterOptions.minPrice)} ~ ${formatPrice(filterOptions.maxPrice)}.`}
          {filterOptions.minStayMinutes != null &&
            ` 체류 범위 ${formatMinutes(filterOptions.minStayMinutes)} ~ ${formatMinutes(filterOptions.maxStayMinutes)}.`}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="정렬"
          id="sort"
          options={SORT_OPTIONS}
          value={draft.sort}
          onChange={(event) =>
            setDraft((current) => ({ ...current, sort: event.target.value as RoundTripSort }))
          }
        />
        <FormField
          label="최소 현지 체류(일)"
          id="minStayDays"
          type="number"
          min={0}
          step={0.5}
          placeholder="예: 3"
          value={draft.minStayDays}
          onChange={(event) =>
            setDraft((current) => ({ ...current, minStayDays: event.target.value }))
          }
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {TIME_WINDOWS.map(({ key, label }) => (
          <fieldset key={key} className="grid grid-cols-2 gap-3">
            <FormField
              label={`${label} 부터`}
              id={`${key}From`}
              type="time"
              value={draft.timeWindows[key].from}
              onChange={(event) => setTime(key, "from", event.target.value)}
            />
            <FormField
              label="까지"
              id={`${key}To`}
              type="time"
              value={draft.timeWindows[key].to}
              onChange={(event) => setTime(key, "to", event.target.value)}
            />
          </fieldset>
        ))}
      </div>

      {filterOptions.airlines.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2">
          <AirlineCheckboxes
            legend="포함할 항공사"
            airlines={filterOptions.airlines}
            selected={draft.includeAirlines}
            onToggle={(airline) => toggleAirline("includeAirlines", airline)}
          />
          <AirlineCheckboxes
            legend="제외할 항공사 (포함보다 우선)"
            airlines={filterOptions.airlines}
            selected={draft.excludeAirlines}
            onToggle={(airline) => toggleAirline("excludeAirlines", airline)}
          />
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? "적용 중..." : "필터 적용"}
        </PrimaryButton>
        <SecondaryButton onClick={reset} disabled={pending}>
          필터 초기화
        </SecondaryButton>
      </div>
    </form>
  );
}

function AirlineCheckboxes({
  legend,
  airlines,
  selected,
  onToggle,
}: {
  legend: string;
  airlines: string[];
  selected: string[];
  onToggle: (airline: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-slate-700">{legend}</legend>
      <div className="space-y-2">
        {airlines.map((airline) => (
          <label key={airline} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={selected.includes(airline)}
              onChange={() => onToggle(airline)}
              className="size-4 rounded border-slate-300 accent-blue-600"
            />
            {airline}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
