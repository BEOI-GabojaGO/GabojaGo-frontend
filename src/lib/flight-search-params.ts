import { findLocation } from "@/lib/locations";
import type {
  FlightSearchRequest,
  LocationOption,
  OneWaySearchRequest,
  SelectedLocations,
  TravelClass,
} from "@/lib/flight-types";

// 메인 화면 조건 검색 → /flights/* 로 검색 조건을 넘기는 쿼리스트링.
// 출발지·도착지는 도시 코드와 공항 코드가 겹칠 수 있어(FUK, OKA 등) `type:code`로 보낸다.

export type InitialSearch<T> = { request: T; locations: SelectedLocations };

type SearchParams = Record<string, string | string[] | undefined>;

const locationKey = (option: LocationOption) => `${option.type}:${option.code}`;

export function toSearchQuery(request: OneWaySearchRequest | FlightSearchRequest, locations: SelectedLocations) {
  const params = new URLSearchParams(
    Object.entries(request).map(([key, value]) => [key, String(value)]),
  );
  params.set("origin", locationKey(locations.origin));
  params.set("destination", locationKey(locations.destination));
  return params.toString();
}

/** 메인 주소의 search=condition 조건. 오는 날이 있으면 왕복, 없으면 편도. 형식이 맞지 않으면 null(기본 화면). */
export function readConditionSearchParams(
  params: SearchParams,
): InitialSearch<OneWaySearchRequest & { returnDate?: string }> | null {
  if (params.search !== "condition") return null;
  return readRoundTripSearchParams(params) ?? readOneWaySearchParams(params);
}

/** 쿼리가 없거나 형식이 맞지 않으면 null(자동 검색하지 않고 빈 폼을 보여 준다). 값 범위 검증은 백엔드가 한다. */
export function readOneWaySearchParams(params: SearchParams): InitialSearch<OneWaySearchRequest> | null {
  const get = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : "";
  };
  const origin = parseLocation(get("origin"));
  const destination = parseLocation(get("destination"));
  const outboundDate = get("outboundDate");

  if (!origin || !destination || !isDate(outboundDate)) return null;

  const count = (key: string, fallback: number) => {
    const value = Number(get(key) || fallback);
    return Number.isInteger(value) ? value : fallback;
  };

  return {
    request: {
      origin: origin.airportCodes,
      destination: destination.airportCodes,
      outboundDate,
      adults: count("adults", 1),
      children: count("children", 0),
      infantsInSeat: count("infantsInSeat", 0),
      infantsOnLap: count("infantsOnLap", 0),
      travelClass: count("travelClass", 1) as TravelClass,
    },
    locations: { origin, destination },
  };
}

export function readRoundTripSearchParams(params: SearchParams): InitialSearch<FlightSearchRequest> | null {
  const oneWay = readOneWaySearchParams(params);
  const returnDate = params.returnDate;

  if (!oneWay || typeof returnDate !== "string" || !isDate(returnDate)) return null;

  return { request: { ...oneWay.request, returnDate }, locations: oneWay.locations };
}

function parseLocation(value: string) {
  const [type, code] = value.split(":");
  return type === "CITY" || type === "AIRPORT" ? findLocation(type, code ?? "") : null;
}

const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
