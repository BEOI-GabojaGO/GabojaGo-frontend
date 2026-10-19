/* eslint-disable @next/next/no-img-element -- 메인 디자인의 국가 카드 이미지를 그대로 쓴다(목업). */
import Link from "next/link";
import { FlightShell } from "@/components/flight/flight-shell";
import { COUNTRIES } from "@/lib/explore";

export default function ExplorePage() {
  return (
    <FlightShell title="아시아 국가 둘러보기" description="궁금한 나라를 고르면 관광명소와 음식을 함께 보여 드려요.">
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {COUNTRIES.map((country) => (
          <li key={country.code}>
            <Link
              href={`/explore/${country.code}`}
              className="block overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-blue-300 hover:shadow-sm"
            >
              {country.image ? (
                <img src={`/main/${country.image}`} alt={`${country.nameKo} 풍경`} className="aspect-[4/3] w-full object-cover" />
              ) : (
                <span className="grid aspect-[4/3] place-items-center bg-slate-100 text-sm text-slate-400">사진 준비 중</span>
              )}
              <span className="block p-3">
                <strong className="block text-slate-900">{country.nameKo}</strong>
                <small className="text-slate-500">{country.nameEn}</small>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </FlightShell>
  );
}
