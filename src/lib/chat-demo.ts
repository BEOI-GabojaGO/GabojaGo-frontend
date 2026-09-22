/** 화면 확인 전용 규칙. AI/백엔드 연동 시 이 파일을 API 호출로 교체한다. */
export type DemoConditions = {
  origin?: string;
  destination?: string;
  travelWindow?: string;
  nights?: number;
  maxBudgetKrw?: number;
  weekendIncluded?: boolean;
};

const DESTINATIONS = ["오사카", "도쿄", "후쿠오카", "삿포로", "방콕", "다낭", "타이베이", "홍콩"];
const ORIGINS = ["인천", "김포", "부산", "대구", "제주"];

export function updateDemoConditions(
  current: DemoConditions,
  message: string,
): { conditions: DemoConditions; reply: string } {
  const next = { ...current };
  const destination = DESTINATIONS.find((city) => message.includes(city));
  const origin = ORIGINS.find((city) => message.includes(`${city}에서`));
  const month = message.match(/\b(1[0-2]|[1-9])월/);
  const nights = message.match(/\b(\d+)박(?:\s*\d+일)?/);
  const budgetInTenThousands = message.match(/\b(\d+)\s*만\s*원?/);

  if (destination) next.destination = destination;
  if (origin) next.origin = origin;
  if (month) next.travelWindow = `${Number(month[1])}월 중`;
  if (nights) next.nights = Number(nights[1]);
  if (budgetInTenThousands) {
    next.maxBudgetKrw = Number(budgetInTenThousands[1]) * 10_000;
  }
  if (message.includes("주말")) next.weekendIncluded = true;

  const hasNewCondition = Object.keys(next).some(
    (key) => next[key as keyof DemoConditions] !== current[key as keyof DemoConditions],
  );
  if (!hasNewCondition) {
    return {
      conditions: next,
      reply: "이 화면은 예시 문구로 흐름을 확인하는 데모예요. ‘10월에 오사카’처럼 말씀해 주세요.",
    };
  }

  const missing: string[] = [];
  if (!next.destination) missing.push("목적지");
  if (!next.origin) missing.push("출발지");
  if (!next.travelWindow) missing.push("여행 가능한 달");
  if (!next.nights) missing.push("숙박 일수");

  return {
    conditions: next,
    reply: missing.length
      ? `좋아요. ${missing.join("와 ")}를 더 알려주시면 조건을 정리할 수 있어요.`
      : "조건이 모였어요. 오른쪽 카드에서 확인해 보세요. 실제 항공권 검색은 아직 연결되지 않았어요.",
  };
}

export function isDemoReady(conditions: DemoConditions): boolean {
  return Boolean(
    conditions.origin && conditions.destination && conditions.travelWindow && conditions.nights,
  );
}
