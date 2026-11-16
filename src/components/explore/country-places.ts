import { requestJson } from "@/lib/flight-client";
import type { CountryAttractions, CountryFoods } from "@/lib/explore";

export type CountryPlaces = { attractions: CountryAttractions; foods: CountryFoods };
type Result = { ok: true; data: CountryPlaces } | { ok: false; message: string };

const requests = new Map<string, Promise<Result>>();

/**
 * 나라의 관광명소·음식을 한 번만 불러 목록(CountryExplore)과 히어로 슬라이드(HeroSlides)가 같이 쓴다.
 * 실패하면 기억하지 않아 다음에 다시 부른다.
 */
export function loadCountryPlaces(countryCode: string) {
  let request = requests.get(countryCode);
  if (!request) {
    const base = `/api/v1/countries/${countryCode}`;
    request = Promise.all([requestJson<CountryAttractions>(`${base}/attractions`), requestJson<CountryFoods>(`${base}/foods`)]).then(
      ([attractions, foods]): Result => {
        if (attractions.ok && foods.ok) return { ok: true, data: { attractions: attractions.data, foods: foods.data } };
        requests.delete(countryCode);
        return { ok: false, message: (!attractions.ok && attractions.message) || (!foods.ok && foods.message) || "" };
      },
      () => {
        requests.delete(countryCode);
        return { ok: false, message: "" };
      },
    );
    requests.set(countryCode, request);
  }
  return request;
}
