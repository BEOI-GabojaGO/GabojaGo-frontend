/** 둘러보기 API 응답 타입 (백엔드 AttractionResponse·FoodResponse 기준). */
export type Place = {
  id: number;
  name: string;
  /** S3(CloudFront) 사진 절대 URL. 사진이 없으면 null. */
  imageUrl: string | null;
  description: string;
  /** `#` 없이 온다. 화면에서 붙인다. */
  hashtags: string[];
};

export type CountryAttractions = {
  countryCode: string;
  countryNameKo: string | null;
  cities: { cityCode: string; cityNameKo: string; attractions: Place[] }[];
};

export type CountryFoods = {
  countryCode: string;
  countryNameKo: string | null;
  foods: Place[];
};

export type PlaceKind = "attraction" | "food";

/** 위시리스트 응답(백엔드 AttractionWishlistResponse·FoodWishlistResponse). 음식에는 도시가 없다. */
export type PlaceWishlistItem = {
  wishlistId: number;
  countryCode: string;
  countryNameKo: string | null;
  cityNameKo?: string;
} & ({ attraction: Place } | { food: Place });

export const WISHLIST_URL: Record<PlaceKind, string> = {
  attraction: "/api/v1/users/me/attraction-wishlists",
  food: "/api/v1/users/me/food-wishlists",
};

export const wishlistBody = (kind: PlaceKind, id: number) =>
  kind === "attraction" ? { attractionId: id } : { foodId: id };

export const placeOf = (item: PlaceWishlistItem) => ("attraction" in item ? item.attraction : item.food);

export type Country = {
  code: string;
  nameKo: string;
  nameEn: string;
  /** 메인 국가 카드 사진(public/main). */
  image: string;
  /** 둘러보기 나라 페이지 상단 배너 슬라이드(1111 시안). 없으면 메인 국가 카드 사진 한 장(heroImages). */
  heroes?: { src: string; alt: string }[];
  /** 히어로 소개 문구(11/23 시안 countryDescriptions, 9개 나라 모두). */
  tagline?: string;
  /** 제목 옆 국기(public/explore/flags, 11/23 시안). */
  flag: string;
};

/**
 * 둘러보기 나라 목록. 백엔드 V9 시드에 관광명소·음식이 있는 나라와 같다.
 * 9개 고정값이고 마이그레이션으로만 바뀌어 API 대신 정적 목록으로 둔다(locations.ts와 같은 방식).
 * image는 메인 디자인의 국가 카드 사진(public/main)이다. 순서는 메인 디자인 캐러셀 순서를 따른다.
 */
export const COUNTRIES: readonly Country[] = [
  { code: "JP", nameKo: "일본", nameEn: "Japan", image: "imgCountryCard.webp", flag: "flag-japan.webp", tagline: "전통과 현대가 공존하는 매력적인 나라" },
  { code: "VN", nameKo: "베트남", nameEn: "Vietnam", image: "imgCountryCard1.webp", flag: "flag-vietnam.webp", tagline: "유구한 역사와 푸른 자연, 활기 넘치는 미식의 나라" },
  { code: "ID", nameKo: "인도네시아", nameEn: "Indonesia", image: "imgCountryCard2.webp", flag: "flag-indonesia.webp", tagline: "신들의 섬 발리부터 화산과 고대 사원까지" },
  {
    code: "SG",
    nameKo: "싱가포르",
    nameEn: "Singapore",
    image: "imgCountryCard3.webp",
    flag: "flag-singapore.webp",
    heroes: [
      { src: "/explore/sg/singapore-hero.webp", alt: "싱가포르 마리나 베이의 도심과 수변 야경" },
      { src: "/explore/sg/singapore-marina.webp", alt: "싱가포르 마리나 베이 샌즈와 수변" },
      { src: "/explore/sg/singapore-skyline.webp", alt: "싱가포르 도심 스카이라인" },
      { src: "/explore/sg/singapore-gardens-night.webp", alt: "싱가포르 가든스 바이 더 베이 야경" },
    ],
    tagline: "아시아의 허브, 다채로운 문화와 미래 도시",
  },
  { code: "PH", nameKo: "필리핀", nameEn: "Philippines", image: "imgCountryCard4.webp", flag: "flag-philippines.webp", tagline: "다이빙과 액티비티를 즐기는 가까운 휴양지" },
  { code: "MY", nameKo: "말레이시아", nameEn: "Malaysia", image: "imgCountryCard5.webp", flag: "flag-malaysia.webp", tagline: "열대의 자연과 전통·문화·미식이 어우러진 다문화" },
  { code: "TH", nameKo: "태국", nameEn: "Thailand", image: "imgCountryCard7.webp", flag: "flag-thailand.webp", tagline: "사원과 야시장, 해변이 어우러진 여행의 정석" },
  { code: "TW", nameKo: "대만", nameEn: "Taiwan", image: "imgCountryCard8.webp", flag: "flag-taiwan.webp", tagline: "온천, 차 문화, 자연을 짧은 일정에 담은 여행지" },
  { code: "HK", nameKo: "홍콩", nameEn: "Hong Kong", image: "imgCountryCard9.webp", flag: "flag-hong-kong.webp", tagline: "동서양이 만난 화려한 야경과 미식의 도시" },
];

/** 히어로 슬라이드 사진. 전용 사진이 없는 나라는 메인 국가 카드 사진(public/main)을 다시 쓴다(2026-11-12 사용자 결정). */
export const heroImages = (country: Country) => country.heroes ?? [{ src: `/main/${country.image}`, alt: `${country.nameKo} 풍경` }];

export function findCountry(code: string) {
  return COUNTRIES.find((country) => country.code === code.toUpperCase());
}
