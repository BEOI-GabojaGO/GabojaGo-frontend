import { Noto_Sans_KR } from "next/font/google";
import { ExploreHeader } from "@/components/explore/explore-header";
import { SelectedTripView } from "@/components/flight/selected-trip";
import "../../flights.css";

// 메인 페이지와 같은 설정. 한글 글리프는 unicode-range로 나뉘어 있어 preload 대신 필요한 조각만 받는다.
const notoSansKr = Noto_Sans_KR({ subsets: ["latin"], preload: false, variable: "--font-noto-kr" });

/** AI 검색 카드에서 고른 왕복의 최종 선택 요약. 선택 정보는 sessionStorage로 넘어온다. */
export default function SelectedTripPage() {
  return (
    <div className={`flight-page ${notoSansKr.variable}`}>
      <ExploreHeader hideOnScroll />
      <SelectedTripView />
    </div>
  );
}
