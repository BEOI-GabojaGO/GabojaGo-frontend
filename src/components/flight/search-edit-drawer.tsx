"use client";

/* eslint-disable @next/next/no-img-element -- 국기 이미지를 그대로 쓴다. */
import { useEffect, useRef, useState } from "react";
import { conditionFrom, useConditionForm, type InitialCondition } from "@/components/flight/condition-form";
import { FLAGS } from "@/components/flight/flight-list-ui";
import { cityName } from "@/components/flight/search-condition-fields";
import { useToast } from "@/components/main/main-ui";
import type { LocationOption } from "@/lib/flight-types";

/** 서랍이 위로 올라가며 닫히는 시간(시안 transition .5s). */
const CLOSE_MS = 500;

/**
 * 항공권 목록 조건 수정 서랍(1105 시안 #searchEditDrawer). 헤더 아래에서 내려오고, 메인 조건 검색과 같은 선택기·검사를 쓴다
 * (useConditionForm). "가보자 GO"는 같은 조건 검색처럼 왕복·편도 목록 주소로 이동해 다시 검색한다.
 * 처음 값과 "초기화"는 지금 검색 조건이다.
 */
export function SearchEditDrawer({ open, request, locations, onClose }: InitialCondition & { open: boolean; onClose: () => void }) {
  const { notify, toast } = useToast();
  const current = { request, locations };
  const form = useConditionForm(current, { notify, portal: ".flight-page", dateAnchor: "dates" });
  const { state, update, reset, triggerProps, picker, closePicker, pickerPanel, submit, datesText, passengersText, error } = form;
  const drawer = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  // 열 때마다 지금 조건으로 채운다. 닫을 때는 is-closing(태블릿·모바일에서 위로 올라가는 움직임)을 잠깐 붙인다.
  const [prevOpen, setPrevOpen] = useState(open);
  const [closing, setClosing] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      reset(conditionFrom(current));
      setClosing(false);
    } else {
      setClosing(true);
    }
  }
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => setClosing(false), CLOSE_MS);
    return () => clearTimeout(timer);
  }, [closing]);

  // 열린 동안 뒤 페이지 스크롤을 막고, Esc는 선택기가 없을 때만 서랍을 닫는다(선택기는 훅이 먼저 닫는다).
  const pickerRef = useRef(picker);
  useEffect(() => {
    pickerRef.current = picker;
  });
  useEffect(() => {
    if (!open) return;
    document.body.classList.add("search-edit-open");
    drawer.current?.querySelector<HTMLElement>(".search-edit-close")?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pickerRef.current) closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("search-edit-open");
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    if (picker) closePicker();
    onClose();
  }

  const place = (option: LocationOption | null, empty: string) =>
    option ? (
      <span className="edit-field-value">
        {FLAGS[option.countryNameKo] && (
          <span className="edit-country-icon edit-country-icon-generic">
            <img src={`/main/${FLAGS[option.countryNameKo]}`} alt={option.countryNameKo} />
          </span>
        )}
        <strong>
          {cityName(option)} <span className="edit-field-code">({option.code})</span>
        </strong>
      </span>
    ) : (
      <span className="edit-field-value">
        <strong>{empty}</strong>
      </span>
    );

  return (
    <>
      <div className={`search-edit-backdrop${open ? " is-open" : ""}`} aria-hidden="true" onClick={close} />
      <aside
        ref={drawer}
        className={`search-edit-drawer${open ? " is-open" : ""}${closing ? " is-closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-edit-title"
        aria-hidden={!open}
        inert={!open}
      >
        <div className="search-edit-inner">
          <div className="search-edit-head">
            <h2 id="search-edit-title">나에게 맞는 조건으로 탐색하세요</h2>
            <button className="search-edit-close" type="button" aria-label="검색 조건 수정 닫기" onClick={close}>
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path d="M1 1l10 10M11 1 1 11" />
              </svg>
            </button>
          </div>
          <form className="search-edit-form" noValidate onSubmit={submit}>
            <div className="search-edit-topline">
              <div className="search-edit-trip-types" role="radiogroup" aria-label="여행 유형">
                {(
                  [
                    ["round", "왕복"],
                    ["oneway", "편도"],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value}>
                    <input
                      type="radio"
                      name="search-edit-trip-type"
                      value={value}
                      checked={state.trip === value}
                      onChange={() => update(value === "oneway" ? { trip: value, return: null } : { trip: value })}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <button className="search-edit-reset" type="button" onClick={() => reset(conditionFrom(current))}>
                초기화
              </button>
            </div>
            <div className="search-edit-fields">
              <button className={`search-edit-field${picker === "origin" ? " is-focused" : ""}`} data-edit-field="from" {...triggerProps("origin")}>
                <span className="edit-field-label">출발지</span>
                {place(state.origin, "출발지를 선택해 주세요")}
              </button>
              <button
                className="search-edit-swap"
                type="button"
                aria-label="출발지와 도착지 바꾸기"
                onClick={() => update({ origin: state.destination, destination: state.origin })}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 8h14m0 0-3.5-3.5M18 8l-3.5 3.5M20 16H6m0 0 3.5 3.5M6 16l3.5-3.5" />
                </svg>
              </button>
              <button className={`search-edit-field${picker === "destination" ? " is-focused" : ""}`} data-edit-field="to" {...triggerProps("destination")}>
                <span className="edit-field-label">도착지</span>
                {place(state.destination, "도착지를 선택해 주세요")}
              </button>
              <button className={`search-edit-field${picker === "dates" ? " is-focused" : ""}`} data-edit-field="date" {...triggerProps("dates")}>
                <span className="edit-field-label">일정</span>
                <strong>{datesText}</strong>
              </button>
              <button className={`search-edit-field${picker === "passengers" ? " is-focused" : ""}`} data-edit-field="passengers" {...triggerProps("passengers")}>
                <span className="edit-field-label">탑승객 및 좌석</span>
                <strong>{passengersText}</strong>
              </button>
            </div>
            <div className="search-edit-actions">
              {/* 검사 안내(출발지·목적지·일정). 메인 조건 검색과 같은 문구다. */}
              <p className="search-edit-error" role="alert" aria-live="polite">
                {error}
              </p>
              <button className="search-edit-submit" type="submit">
                가보자 GO
              </button>
            </div>
          </form>
        </div>
      </aside>
      {pickerPanel}
      {toast}
    </>
  );
}
