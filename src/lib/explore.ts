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
  /** 둘러보기 나라 페이지 상단 배너. 디자인이 나온 나라만 있다. */
  hero?: { src: string; alt: string };
  tagline?: string;
};

/**
 * 둘러보기 나라 목록. 백엔드 V9 시드에 관광명소·음식이 있는 나라와 같다.
 * 9개 고정값이고 마이그레이션으로만 바뀌어 API 대신 정적 목록으로 둔다(locations.ts와 같은 방식).
 * image는 메인 디자인의 국가 카드 사진(public/main)이다. 순서는 메인 디자인 캐러셀 순서를 따른다.
 */
export const COUNTRIES: readonly Country[] = [
  { code: "JP", nameKo: "일본", nameEn: "Japan", image: "imgCountryCard.webp" },
  { code: "VN", nameKo: "베트남", nameEn: "Vietnam", image: "imgCountryCard1.webp" },
  { code: "ID", nameKo: "인도네시아", nameEn: "Indonesia", image: "imgCountryCard2.webp" },
  {
    code: "SG",
    nameKo: "싱가포르",
    nameEn: "Singapore",
    image: "imgCountryCard3.webp",
    hero: { src: "/explore/sg/singapore-hero.webp", alt: "싱가포르 마리나 베이의 도심과 수변 야경" },
    tagline: "아시아의 허브, 다채로운 문화와 미래 도시",
  },
  { code: "PH", nameKo: "필리핀", nameEn: "Philippines", image: "imgCountryCard4.webp" },
  { code: "MY", nameKo: "말레이시아", nameEn: "Malaysia", image: "imgCountryCard5.webp" },
  { code: "TH", nameKo: "태국", nameEn: "Thailand", image: "imgCountryCard7.webp" },
  { code: "TW", nameKo: "대만", nameEn: "Taiwan", image: "imgCountryCard8.webp" },
  { code: "HK", nameKo: "홍콩", nameEn: "Hong Kong", image: "imgCountryCard9.webp" },
];

export function findCountry(code: string) {
  return COUNTRIES.find((country) => country.code === code.toUpperCase());
}
