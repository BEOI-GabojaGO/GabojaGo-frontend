/* eslint-disable @next/next/no-img-element -- 디자인 원본 배너 사진을 그대로 쓴다. */
import { Noto_Sans_KR } from "next/font/google";
import { notFound } from "next/navigation";
import { CountryExplore } from "@/components/explore/country-explore";
import { ExploreHeader } from "@/components/explore/explore-header";
import { findCountry } from "@/lib/explore";
import "../explore.css";

// 메인 페이지와 같은 설정. 한글 글리프는 unicode-range로 나뉘어 있어 preload 대신 필요한 조각만 받는다.
const notoSansKr = Noto_Sans_KR({ subsets: ["latin"], preload: false, variable: "--font-noto-kr" });

/** 둘러보기 디자인 1.0(싱가포르 기준)을 모든 나라에 같은 틀로 쓴다. 배너 사진·소개 문구는 디자인이 나온 나라만 있다. */
export default async function CountryExplorePage(props: PageProps<"/explore/[countryCode]">) {
  const { countryCode } = await props.params;
  const country = findCountry(countryCode);

  if (!country) notFound();

  return (
    <div className={`explore-page ${notoSansKr.variable}`}>
      <ExploreHeader />
      <section className="hero" aria-labelledby="page-title">
        {country.hero && (
          <img className="hero-photo" src={country.hero.src} alt={country.hero.alt} width={1920} height={520} fetchPriority="high" decoding="async" />
        )}
        <div className="hero-shade" />
        <div className="hero-content page-container">
          <div className="hero-title-group">
            <h1 id="page-title">{country.nameKo}</h1>
            {country.tagline && <p>{country.tagline}</p>}
          </div>
          <a className="primary-button" href="#foods">
            가보자 GO
          </a>
        </div>
      </section>
      <main className="collections page-container" aria-label={`${country.nameKo} 여행 정보`}>
        <CountryExplore countryCode={country.code} countryName={country.nameKo} />
      </main>
    </div>
  );
}
