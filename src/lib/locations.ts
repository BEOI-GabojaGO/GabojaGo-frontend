import type { LocationOption } from "@/lib/flight-types";

// ponytail: 백엔드 V4 시드(GabojaGoBack/.../db/migration/V4__seed_asia_locations.sql)의 복사본이다.
// 1단계(프론트 데이터 + 프론트 검색) 비교용. 2단계에서 GET /api/v1/locations로 교체하고 이 파일을 지운다.
// 그 전까지 공항을 추가·수정하면 백엔드 시드도 함께 바꿔야 검색 요청 검증을 통과한다.

type Airport = [code: string, nameKo: string, nameEn: string];
type City = [
  code: string,
  nameKo: string,
  nameEn: string,
  countryNameKo: string,
  sortOrder: number,
  airports: Airport[],
];

const CITIES: City[] = ([
  ["SEL", "서울", "Seoul", "대한민국", 10, [
    ["ICN", "인천국제공항", "Incheon International Airport"],
    ["GMP", "김포국제공항", "Gimpo International Airport"],
  ]],
  ["PUS", "부산", "Busan", "대한민국", 110, [["PUS", "김해국제공항", "Gimhae International Airport"]]],
  ["CJU", "제주", "Jeju", "대한민국", 50, [["CJU", "제주국제공항", "Jeju International Airport"]]],
  ["TAE", "대구", "Daegu", "대한민국", 120, [["TAE", "대구국제공항", "Daegu International Airport"]]],
  ["CJJ", "청주", "Cheongju", "대한민국", 130, [["CJJ", "청주국제공항", "Cheongju International Airport"]]],
  ["MWX", "무안", "Muan", "대한민국", 140, [["MWX", "무안국제공항", "Muan International Airport"]]],
  ["YNY", "양양", "Yangyang", "대한민국", 150, [["YNY", "양양국제공항", "Yangyang International Airport"]]],

  ["TYO", "도쿄", "Tokyo", "일본", 20, [
    ["NRT", "나리타 국제공항", "Narita International Airport"],
    ["HND", "하네다 공항", "Haneda Airport"],
  ]],
  ["OSA", "오사카", "Osaka", "일본", 30, [
    ["KIX", "간사이 국제공항", "Kansai International Airport"],
    ["ITM", "이타미 공항", "Osaka Itami Airport"],
  ]],
  ["FUK", "후쿠오카", "Fukuoka", "일본", 40, [["FUK", "후쿠오카 공항", "Fukuoka Airport"]]],
  ["NGO", "나고야", "Nagoya", "일본", 160, [["NGO", "주부 국제공항", "Chubu Centrair International Airport"]]],
  ["SPK", "삿포로", "Sapporo", "일본", 170, [["CTS", "신치토세 공항", "New Chitose Airport"]]],
  ["OKA", "오키나와", "Okinawa", "일본", 180, [["OKA", "나하 공항", "Naha Airport"]]],

  ["BJS", "베이징", "Beijing", "중국", 190, [
    ["PEK", "베이징 서우두 국제공항", "Beijing Capital International Airport"],
    ["PKX", "베이징 다싱 국제공항", "Beijing Daxing International Airport"],
  ]],
  ["SHA", "상하이", "Shanghai", "중국", 90, [
    ["PVG", "상하이 푸둥 국제공항", "Shanghai Pudong International Airport"],
    ["SHA", "상하이 훙차오 국제공항", "Shanghai Hongqiao International Airport"],
  ]],
  ["TAO", "칭다오", "Qingdao", "중국", 200, [["TAO", "칭다오 자오둥 국제공항", "Qingdao Jiaodong International Airport"]]],
  ["CAN", "광저우", "Guangzhou", "중국", 210, [["CAN", "광저우 바이윈 국제공항", "Guangzhou Baiyun International Airport"]]],
  ["SZX", "선전", "Shenzhen", "중국", 220, [["SZX", "선전 바오안 국제공항", "Shenzhen Bao'an International Airport"]]],
  ["SHE", "선양", "Shenyang", "중국", 230, [["SHE", "선양 타오셴 국제공항", "Shenyang Taoxian International Airport"]]],
  ["DLC", "다롄", "Dalian", "중국", 240, [["DLC", "다롄 저우수이쯔 국제공항", "Dalian Zhoushuizi International Airport"]]],
  ["YNJ", "옌지", "Yanji", "중국", 250, [["YNJ", "옌지 차오양촨 국제공항", "Yanji Chaoyangchuan International Airport"]]],

  ["HKG", "홍콩", "Hong Kong", "홍콩", 100, [["HKG", "홍콩 국제공항", "Hong Kong International Airport"]]],
  ["MFM", "마카오", "Macau", "마카오", 260, [["MFM", "마카오 국제공항", "Macau International Airport"]]],

  ["TPE", "타이베이", "Taipei", "대만", 80, [
    ["TPE", "타이완 타오위안 국제공항", "Taiwan Taoyuan International Airport"],
    ["TSA", "타이베이 쑹산 공항", "Taipei Songshan Airport"],
  ]],
  ["KHH", "가오슝", "Kaohsiung", "대만", 270, [["KHH", "가오슝 국제공항", "Kaohsiung International Airport"]]],
  ["RMQ", "타이중", "Taichung", "대만", 280, [["RMQ", "타이중 국제공항", "Taichung International Airport"]]],

  ["ULN", "울란바토르", "Ulaanbaatar", "몽골", 290, [["UBN", "칭기즈칸 국제공항", "Chinggis Khaan International Airport"]]],

  ["BKK", "방콕", "Bangkok", "태국", 60, [
    ["BKK", "수완나품 국제공항", "Suvarnabhumi Airport"],
    ["DMK", "돈므앙 국제공항", "Don Mueang International Airport"],
  ]],
  ["HKT", "푸껫", "Phuket", "태국", 300, [["HKT", "푸껫 국제공항", "Phuket International Airport"]]],
  ["CNX", "치앙마이", "Chiang Mai", "태국", 310, [["CNX", "치앙마이 국제공항", "Chiang Mai International Airport"]]],

  ["SGN", "호찌민", "Ho Chi Minh City", "베트남", 320, [["SGN", "떤선녓 국제공항", "Tan Son Nhat International Airport"]]],
  ["HAN", "하노이", "Hanoi", "베트남", 330, [["HAN", "노이바이 국제공항", "Noi Bai International Airport"]]],
  ["DAD", "다낭", "Da Nang", "베트남", 70, [["DAD", "다낭 국제공항", "Da Nang International Airport"]]],
  ["NHA", "나트랑", "Nha Trang", "베트남", 340, [["CXR", "깜라인 국제공항", "Cam Ranh International Airport"]]],
  ["PQC", "푸꾸옥", "Phu Quoc", "베트남", 350, [["PQC", "푸꾸옥 국제공항", "Phu Quoc International Airport"]]],

  ["MNL", "마닐라", "Manila", "필리핀", 360, [["MNL", "니노이 아키노 국제공항", "Ninoy Aquino International Airport"]]],
  ["CEB", "세부", "Cebu", "필리핀", 370, [["CEB", "막탄 세부 국제공항", "Mactan-Cebu International Airport"]]],
  ["CRK", "클라크", "Clark", "필리핀", 380, [["CRK", "클라크 국제공항", "Clark International Airport"]]],

  ["SIN", "싱가포르", "Singapore", "싱가포르", 390, [["SIN", "싱가포르 창이 공항", "Singapore Changi Airport"]]],

  ["KUL", "쿠알라룸푸르", "Kuala Lumpur", "말레이시아", 400, [["KUL", "쿠알라룸푸르 국제공항", "Kuala Lumpur International Airport"]]],
  ["BKI", "코타키나발루", "Kota Kinabalu", "말레이시아", 410, [["BKI", "코타키나발루 국제공항", "Kota Kinabalu International Airport"]]],

  ["DPS", "발리", "Bali", "인도네시아", 420, [["DPS", "응우라라이 국제공항", "Ngurah Rai International Airport"]]],
  ["JKT", "자카르타", "Jakarta", "인도네시아", 430, [["CGK", "수카르노하타 국제공항", "Soekarno-Hatta International Airport"]]],

  ["VTE", "비엔티안", "Vientiane", "라오스", 440, [["VTE", "왓따이 국제공항", "Wattay International Airport"]]],

  ["DEL", "델리", "Delhi", "인도", 450, [["DEL", "인디라 간디 국제공항", "Indira Gandhi International Airport"]]],
] satisfies City[]).sort((a, b) => a[4] - b[4]);

const MAX_RESULTS = 10;

/**
 * 백엔드 `LocationService.search`와 같은 규칙: 한글명·영문명·국가명 부분 일치, IATA 코드 완전 일치,
 * 공항이 2개 이상인 도시를 먼저 그다음 공항을, 노출 순서(sortOrder)대로 최대 10건.
 */
export function searchLocations(keyword: string): LocationOption[] {
  const query = keyword.trim().toLowerCase();

  if (!query) return [];

  const matches = (code: string, ...names: string[]) =>
    code.toLowerCase() === query || names.some((name) => name.toLowerCase().includes(query));

  const cities = CITIES.filter(
    ([code, nameKo, nameEn, country, , airports]) =>
      airports.length > 1 && matches(code, nameKo, nameEn, country),
  ).map(toCityOption);

  const airports = CITIES.flatMap((city) => {
    const [, cityKo, cityEn, country, , cityAirports] = city;
    return cityAirports
      .filter(([code, nameKo, nameEn]) => matches(code, nameKo, nameEn, cityKo, cityEn, country))
      .map((airport) => toAirportOption(city, airport));
  });

  return [...cities, ...airports].slice(0, MAX_RESULTS);
}

/** 검색어가 없을 때 보여 줄 주요 도시(노출 순서 상위). 공항이 하나뿐인 도시는 공항으로 보여 준다. */
export function popularLocations(): LocationOption[] {
  return CITIES.slice(0, MAX_RESULTS).map((city) =>
    city[5].length > 1 ? toCityOption(city) : toAirportOption(city, city[5][0]),
  );
}

/** 페이지 간에 넘긴 `type:code`(예: `CITY:SEL`, `AIRPORT:ICN`)를 다시 선택지로 바꾼다. */
export function findLocation(type: LocationOption["type"], code: string): LocationOption | null {
  for (const city of CITIES) {
    if (type === "CITY" && city[0] === code) return toCityOption(city);
    const airport = type === "AIRPORT" && city[5].find(([airportCode]) => airportCode === code);
    if (airport) return toAirportOption(city, airport);
  }
  return null;
}

function toCityOption([code, nameKo, nameEn, countryNameKo, , airports]: City): LocationOption {
  return {
    type: "CITY",
    code,
    nameKo,
    nameEn,
    countryNameKo,
    cityNameKo: null,
    airportCodes: airports.map(([airportCode]) => airportCode).join(","),
    airports: airports.map(([airportCode, airportName]) => ({
      code: airportCode,
      nameKo: airportName,
    })),
  };
}

function toAirportOption(
  [, cityNameKo, , countryNameKo]: City,
  [code, nameKo, nameEn]: Airport,
): LocationOption {
  return {
    type: "AIRPORT",
    code,
    nameKo,
    nameEn,
    countryNameKo,
    cityNameKo,
    airportCodes: code,
    airports: null,
  };
}
