import { Noto_Sans_KR } from "next/font/google";
import { ExploreHeader } from "@/components/explore/explore-header";
import { OneWayFlow } from "@/components/flight/one-way-flow";
import { readOneWaySearchParams } from "@/lib/flight-search-params";
import "../flights.css";

// 메인 페이지와 같은 설정. 한글 글리프는 unicode-range로 나뉘어 있어 preload 대신 필요한 조각만 받는다.
const notoSansKr = Noto_Sans_KR({ subsets: ["latin"], preload: false, variable: "--font-noto-kr" });

export default async function OneWayPage({ searchParams }: PageProps<"/flights/one-way">) {
  // 메인 화면 조건 검색에서 넘어오면 조건을 채우고 한 번 자동 검색한다.
  const initial = readOneWaySearchParams(await searchParams);

  return (
    <div className={`flight-page ${notoSansKr.variable}`}>
      <ExploreHeader />
      <OneWayFlow initial={initial} />
    </div>
  );
}
