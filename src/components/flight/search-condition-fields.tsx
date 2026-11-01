import type { LocationOption } from "@/lib/flight-types";

export const TRAVEL_CLASS_OPTIONS = [
  // 메인 조건 검색(search-panel CABINS)과 같은 이름. 팀 결정으로 "일반석"으로 통일(2026-10-28).
  { value: 1, label: "일반석" },
  { value: 2, label: "프리미엄 일반석" },
  { value: 3, label: "비즈니스석" },
  { value: 4, label: "일등석" },
];

export function cityName(option: LocationOption) {
  return option.type === "CITY" ? option.nameKo : (option.cityNameKo ?? option.nameKo);
}
