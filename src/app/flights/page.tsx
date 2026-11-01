import { redirect } from "next/navigation";

// 옛 "조회 방식 선택" 메뉴는 메인 검색이 대신한다.
export default function FlightsPage() {
  redirect("/");
}
