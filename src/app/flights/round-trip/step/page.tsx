import { Noto_Sans_KR } from "next/font/google";
import { redirect } from "next/navigation";
import { ExploreHeader } from "@/components/explore/explore-header";
import { RoundTripStepFlow } from "@/components/flight/round-trip-step-flow";
import { readRoundTripSearchParams } from "@/lib/flight-search-params";
import "../../flights.css";
// 조건 수정 서랍의 선택기(메인 조건 검색과 공용).
import "../../../condition-picker.css";

// 메인 페이지와 같은 설정. 한글 글리프는 unicode-range로 나뉘어 있어 preload 대신 필요한 조각만 받는다.
const notoSansKr = Noto_Sans_KR({ subsets: ["latin"], preload: false, variable: "--font-noto-kr" });

export default async function RoundTripStepPage({ searchParams }: PageProps<"/flights/round-trip/step">) {
  // 메인 화면 조건 검색에서 넘어오면 조건을 채우고 한 번 자동 검색한다.
  const initial = readRoundTripSearchParams(await searchParams);
  // 조건 없이 주소로 들어오거나 새로고침하면(자동 검색 후 주소의 조건을 지움) 메인 조건 검색 탭으로 보낸다.
  if (!initial) redirect("/?search=condition");

  return (
    <div className={`flight-page ${notoSansKr.variable}`}>
      <ExploreHeader hideOnScroll />
      {/* 서랍에서 같은 화면으로 새 조건을 넘기면 흐름을 새로 만들어 다시 검색한다(자동 검색은 한 번만 돈다). */}
      <RoundTripStepFlow key={JSON.stringify(initial)} initial={initial} />
    </div>
  );
}
