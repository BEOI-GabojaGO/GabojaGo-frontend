import type { LocationOption, OneWaySearchResponse, RoundTripCombination, RoundTripSearchResponse } from "@/lib/flight-types";

// 채팅 API 타입. 백엔드 chat/dto, ai/dto/FlightSearchConditions와 docs/CHAT-FRONTEND-HANDOFF.md 기준.

export type ChatState = "IDLE" | "COLLECTING" | "AWAITING_CONFIRMATION" | "SEARCHING" | "RESULTS";

/** 누적된 전체 조건. 값이 없는 필드는 응답에서 빠진다. 지명은 표시 문자열(IATA 아님). */
export type ChatTripType = "ONE_WAY" | "ROUND_TRIP";

export type ChatConditions = {
  /** 백엔드가 비어 있으면 오는 날·박수로 왕복을 추론한다. 그래도 모르면 missingFields에 tripType이 들어간다. */
  tripType?: ChatTripType;
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
  /** TRAVEL_CHAT: 검색 조건 없는 여행 대화. 서버는 조건·상태·버전을 그대로 두고 누락·모호 항목은 빈 배열로 준다. */
  intent: "FLIGHT_SEARCH" | "TRAVEL_CHAT" | "CONFIRM" | "CANCEL" | "UNSUPPORTED";
  reply: string;
  conditions: ChatConditions | null;
  missingFields: string[];
  ambiguousFields: string[];
  /** 출발지·목적지를 서버 기준 데이터로 해석한 결과. 이 필드가 없던 배포본도 있어 선택 항목으로 둔다. */
  locationResolutions?: ChatLocationResolution[];
  conditionVersion: number;
};

/**
 * 백엔드 chat/dto/ChatLocationResolution. 후보(candidates)는 GET /locations와 같은 LocationResponse다.
 * AMBIGUOUS면 후보 중 하나를 다음 메시지로 고른다(선택 API 없음). 주변 공항 거리는 직선거리라 이동 시간이 아니다.
 */
export type ChatLocationResolution = {
  field: "origin" | "destination";
  expression: string;
  status: "RESOLVED" | "AMBIGUOUS" | "NOT_FOUND";
  airportCodes: string | null;
  candidates: LocationOption[];
  distanceBasis: "STRAIGHT_LINE_KM" | null;
  nearbyAirportCandidates: { location: LocationOption; straightLineDistanceKm: number }[];
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
/** EXACT 왕복은 RoundTripSearchResponse, EXACT 편도는 OneWaySearchResponse, FLEXIBLE(왕복만)은 FlexibleFlightSearchResponse. */
export type ChatSearchResult = RoundTripSearchResponse | OneWaySearchResponse | FlexibleFlightSearchResponse;

/** FLEXIBLE 검색 POST는 202로 작업만 접수한다. 결과는 GET .../search(statusUrl)로 받는다. */
export type ChatSearchAccepted = {
  searchJobId: string;
  chatSessionId: string;
  dateMode: "FLEXIBLE";
  statusUrl: string;
};

/** GET .../search. 결과는 result에 한 단계 더 감싸진다. */
export type ChatSearchStatus = {
  searchJobId: string;
  chatSessionId: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  dateMode: "EXACT" | "FLEXIBLE" | null;
  tripType: ChatTripType | null;
  conditionVersion: number;
  result: ChatSearchResult | null;
  failureCode: string | null;
};
