// 백엔드 flight DTO(`GabojaGoBack/.../flight/dto`)를 그대로 옮긴 타입.

/** 1 일반석 / 2 프리미엄 일반석 / 3 비즈니스석 / 4 일등석(화면 표기) */
export type TravelClass = 1 | 2 | 3 | 4;

export type FlightSearchRequest = {
  origin: string;
  destination: string;
  outboundDate: string;
  returnDate: string;
  adults: number;
  children: number;
  infantsInSeat: number;
  infantsOnLap: number;
  travelClass: TravelClass;
};

/** 편도 검색 요청. 왕복 요청에서 오는 날만 빠진다. */
export type OneWaySearchRequest = Omit<FlightSearchRequest, "returnDate">;

/** 출발지·도착지 후보. 백엔드 `GET /api/v1/locations` 응답(`LocationResponse`)과 같은 형태다. */
export type LocationOption = {
  type: "CITY" | "AIRPORT";
  /** CITY면 IATA 도시 코드, AIRPORT면 공항 코드. 표시용이다. */
  code: string;
  nameKo: string;
  nameEn: string;
  countryNameKo: string;
  /** AIRPORT만 채운다. */
  cityNameKo: string | null;
  /** 검색 요청 origin/destination에 그대로 넣는 공항 코드 목록(쉼표 구분). */
  airportCodes: string;
  /** CITY만 채운다. */
  airports: { code: string; nameKo: string }[] | null;
};

export type SelectedLocations = { origin: LocationOption; destination: LocationOption };

export type OneWaySearchResponse = {
  searchId: string;
  totalFlights: number;
  /** 노선에 직항이 없어 결과가 빈 경우 true. 오류가 아니다. */
  noNonstopFlight: boolean;
  /** price는 왕복 총액이 아니라 편도 요금이다. */
  flights: FlightOption[];
  priceInsights: PriceInsights | null;
};

export type RoundTripSort = "PRICE" | "DURATION" | "STAY";

export type RoundTripCombination = {
  outboundId: string;
  /** 가는편마다 새로 매겨져 outboundId와 짝으로만 유일하다. */
  returnId: string;
  /** 확정 왕복 총액 */
  price: number | null;
  /** 현지 체류 시간(분). 도착 공항과 오는편 출발 공항이 다르면 null. */
  stayMinutes: number | null;
  /** 같은 항공사인지. 단일 발권 여부가 아니다(예약 옵션의 separateTickets가 확정값). */
  sameAirline: boolean;
  outbound: FlightOption;
  inbound: FlightOption;
};

/** 필터 UI 선택지. 필터 적용 전 원본 기준이라 필터를 바꿔도 변하지 않는다. */
export type RoundTripFilterOptions = {
  airlines: string[];
  minPrice: number | null;
  maxPrice: number | null;
  minStayMinutes: number | null;
  maxStayMinutes: number | null;
};

export type RoundTripSearchResponse = {
  searchId: string;
  totalOutbounds: number;
  expandedOutbounds: number;
  noNonstopFlight: boolean;
  /** 축소·필터 전 원본 조합 수 */
  totalCombinations: number;
  combinations: RoundTripCombination[];
  filterOptions: RoundTripFilterOptions;
  /** 필터 조회 응답에서는 항상 null이다. */
  priceInsights: PriceInsights | null;
};

export type TimeWindowKey =
  | "outboundDepart"
  | "outboundArrive"
  | "inboundDepart"
  | "inboundArrive";

/** 필터 폼 상태. 쿼리 변환은 `toRoundTripQuery`가 담당한다. */
export type RoundTripFilter = {
  sort: RoundTripSort;
  /** 입력값 그대로(일 단위). 빈 문자열이면 미적용. */
  minStayDays: string;
  /** `HH:mm` 문자열. 빈 문자열이면 미적용. */
  timeWindows: Record<TimeWindowKey, { from: string; to: string }>;
  includeAirlines: string[];
  excludeAirlines: string[];
};

export type Airport = {
  name: string | null;
  code: string | null;
  /** 공항 현지 시각 `yyyy-MM-dd HH:mm`. 타임존 정보가 없다. */
  localTime: string | null;
};

export type Segment = {
  airline: string | null;
  airlineLogo: string | null;
  flightNumber: string | null;
  airplane: string | null;
  travelClass: string | null;
  legroom: string | null;
  departure: Airport | null;
  arrival: Airport | null;
  durationMinutes: number | null;
  overnight: boolean | null;
  oftenDelayed: boolean | null;
  extensions: string[];
};

export type Layover = {
  airportName: string | null;
  airportCode: string | null;
  durationMinutes: number | null;
  overnight: boolean | null;
};

export type FlightOption = {
  id: string;
  /** 문맥에 따라 의미가 다르다. 가는편 목록은 최저 가능 왕복 총액, 오는편 목록은 왕복 총액. */
  price: number | null;
  totalDurationMinutes: number | null;
  airlineLogo: string | null;
  stops: number;
  segments: Segment[];
  layovers: Layover[];
};

export type PriceInsights = {
  lowestPrice: number | null;
  priceLevel: string | null;
  typicalPriceLow: number | null;
  typicalPriceHigh: number | null;
};

export type FlightSearchResponse = {
  searchId: string;
  outbounds: FlightOption[];
  priceInsights: PriceInsights | null;
};

export type ReturnsResponse = {
  returns: FlightOption[];
};

export type ItineraryRequest = {
  searchId: string;
  outboundId: string;
  /** 편도면 비운다. */
  returnId?: string;
};

export type HandoffLeg = "TOGETHER" | "DEPARTING" | "RETURNING";

export type BookingOption = {
  optionIndex: number;
  leg: HandoffLeg;
  sellerName: string | null;
  airline: string | null;
  airlineLogos: string[];
  marketedAs: string[];
  price: number | null;
  optionTitle: string | null;
  extensions: string[];
  baggagePrices: string[];
  bookable: boolean;
  bookingPhone: string | null;
  estimatedPhoneServiceFee: number | null;
};

export type ItineraryResponse = {
  separateTickets: boolean;
  bookingOptions: BookingOption[];
  baggagePrices: string[] | null;
};

export type HandoffRequest = ItineraryRequest & {
  optionIndex: number;
  leg: HandoffLeg;
};

type Passengers = Pick<
  FlightSearchRequest,
  "adults" | "children" | "infantsInSeat" | "infantsOnLap" | "travelClass"
>;

/** 위시리스트 저장 요청. 화면의 항공편을 그대로 보낸다. 편도면 inbound를 생략한다. */
export type FlightWishlistRequest = Passengers & {
  /** 왕복은 오는편 price(확정 왕복 총액), 편도는 항공편 price. 가는편 price(최저 가능가)는 쓰지 않는다. */
  price: number;
  stayMinutes?: number | null;
  sameAirline?: boolean | null;
  outbound: FlightOption;
  inbound?: FlightOption;
};

/** 위시리스트 항목. 담을 당시의 스냅샷이며 실시간으로 갱신되지 않는다. */
export type FlightWishlistItem = Passengers & {
  wishlistId: number;
  tripType: "ROUND_TRIP" | "ONE_WAY";
  savedPrice: number;
  currency: string;
  stayMinutes: number | null;
  sameAirline: boolean | null;
  /** 검색 세션 한정 id는 저장하지 않아 항상 null이다. */
  outbound: Omit<FlightOption, "id">;
  inbound: Omit<FlightOption, "id"> | null;
};

export type HandoffResponse = {
  handoffId: string;
  sellerName: string | null;
  price: number | null;
};
