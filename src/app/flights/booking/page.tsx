import { Noto_Sans_KR } from "next/font/google";
import { ExploreHeader } from "@/components/explore/explore-header";
import { BookingView } from "@/components/flight/booking-page";
import "../booking.css";

// 메인 페이지와 같은 설정. 한글 글리프는 unicode-range로 나뉘어 있어 preload 대신 필요한 조각만 받는다.
const notoSansKr = Noto_Sans_KR({ subsets: ["latin"], preload: false, variable: "--font-noto-kr" });

/** 시안 예약하기. 고른 항공권은 sessionStorage(gabojago.booking)로 넘어온다. */
export default function BookingPage() {
  return (
    <div className={`booking-page ${notoSansKr.variable}`}>
      <ExploreHeader />
      <BookingView />
    </div>
  );
}
