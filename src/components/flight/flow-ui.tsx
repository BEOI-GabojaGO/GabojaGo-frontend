import { useEffect, useRef, type ReactNode } from "react";
import type { InitialSearch } from "@/lib/flight-search-params";
import type { SelectedLocations } from "@/lib/flight-types";

// 항공권 목록 흐름의 자동 검색과, 아직 디자인이 없는 화면(위시리스트)이 쓰는 작은 UI 조각.

/**
 * 메인 화면에서 넘어온 조건이 있으면 한 번만 자동 검색한다.
 * 개발 모드 StrictMode의 이중 실행과 새로고침 재검색으로 SerpApi를 또 부르지 않도록
 * ref로 한 번만 실행하고 주소의 쿼리를 지운다.
 */
export function useAutoSearchOnce<T>(
  initial: InitialSearch<T> | null | undefined,
  search: (request: T, locations: SelectedLocations) => Promise<void>,
) {
  const started = useRef(false);
  const searchRef = useRef(search);

  useEffect(() => {
    searchRef.current = search;
  });

  useEffect(() => {
    if (!initial || started.current) return;
    started.current = true;
    window.history.replaceState(null, "", window.location.pathname);
    void searchRef.current(initial.request, initial.locations);
  }, [initial]);
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

export function EmptyMessage({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">{children}</p>
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
