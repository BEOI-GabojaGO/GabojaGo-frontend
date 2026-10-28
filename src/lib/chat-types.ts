import type { RoundTripCombination, RoundTripSearchResponse } from "@/lib/flight-types";

// 채팅 API 타입. 백엔드 chat/dto, ai/dto/FlightSearchConditions와 docs/CHAT-FRONTEND-HANDOFF.md 기준.

export type ChatState = "IDLE" | "COLLECTING" | "AWAITING_CONFIRMATION" | "SEARCHING" | "RESULTS";

/** 누적된 전체 조건. 값이 없는 필드는 응답에서 빠진다. 지명은 표시 문자열(IATA 아님). */
export type ChatConditions = {
  origin?: string;
  destination?: string;
  dateMode?: "EXACT" | "FLEXIBLE";
  outboundDate?: string;
  returnDate?: string;
  travelWindowStart?: string;
  travelWindowEnd?: string;
  nights?: number;
  weekendRule?: "BOTH_SAT_SUN" | "ANY_WEEKEND_DAY" | "NONE";
  maxBudgetKrw?: number;
  adults?: number;
  children?: number;
  infantsInSeat?: number;
  infantsOnLap?: number;
  /** 1~4 */
  travelClass?: number;
};

export type ChatSessionCreated = {
  chatSessionId: string;
  state: ChatState;
  conditionVersion: number;
};

export type ChatMessageResponse = {
  chatSessionId: string;
  state: ChatState;
  intent: "FLIGHT_SEARCH" | "CONFIRM" | "CANCEL" | "UNSUPPORTED";
  reply: string;
  conditions: ChatConditions | null;
  missingFields: string[];
  ambiguousFields: string[];
  conditionVersion: number;
};

export type ChatSessionState = {
  chatSessionId: string;
  state: ChatState;
  conditions: ChatConditions | null;
  conditionVersion: number;
  approvedConditionVersion: number | null;
  approvedAt: string | null;
  expiresAt: string;
};

export type ChatConfirmation = {
  chatSessionId: string;
  state: ChatState;
  approvedConditionVersion: number;
  approvedAt: string;
  expiresAt: string;
};

export type FlexiblePricedOption = {
  outboundDate: string;
  returnDate: string;
  searchId: string;
  combination: RoundTripCombination;
};

export type FlexibleFlightSearchResponse = {
  results: { outboundDate: string; returnDate: string; searchResponse: RoundTripSearchResponse }[];
  failedDates: { outboundDate: string; returnDate: string }[];
  maxBudgetKrw: number | null;
  estimatedMaxSerpApiCalls: number;
  priceSelection: {
    options: FlexiblePricedOption[];
    cheapest: FlexiblePricedOption | null;
    totalCombinationCount: number;
  };
};

/** 검색 POST의 data. 승인한 조건의 dateMode로 구분한다(EXACT면 RoundTripSearchResponse). */
export type ChatSearchResult = RoundTripSearchResponse | FlexibleFlightSearchResponse;

/** GET .../search. 결과는 result에 한 단계 더 감싸진다. */
/** FLEXIBLE 검색 POST는 202로 작업만 접수한다. 결과는 GET .../search(statusUrl)로 받는다. */
export type ChatSearchAccepted = {
  searchJobId: string;
  chatSessionId: string;
  dateMode: "FLEXIBLE";
  statusUrl: string;
};

export type ChatSearchStatus = {
  searchJobId: string;
  chatSessionId: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  dateMode: "EXACT" | "FLEXIBLE" | null;
  conditionVersion: number;
  result: ChatSearchResult | null;
  failureCode: string | null;
};
