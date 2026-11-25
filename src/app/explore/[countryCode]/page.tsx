/* eslint-disable @next/next/no-img-element -- 시안 국기(작은 정적 webp)를 그대로 쓴다. */
import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { notFound } from "next/navigation";
import { CountryExplore } from "@/components/explore/country-explore";
import { ExploreHeader } from "@/components/explore/explore-header";
import { HeroSlides } from "@/components/explore/hero-slides";
import { SiteFooter } from "@/components/main/footer-nav";
import { findCountry, heroImages } from "@/lib/explore";
import "../explore.css";

// 메인 페이지와 같은 설정. 한글 글리프는 unicode-range로 나뉘어 있어 preload 대신 필요한 조각만 받는다.
const notoSansKr = Noto_Sans_KR({ subsets: ["latin"], preload: false, variable: "--font-noto-kr" });

/** 탭 제목 "가보자GO - 일본"(11/23 시안 document.title). */
export async function generateMetadata(props: PageProps<"/explore/[countryCode]">): Promise<Metadata> {
  const country = findCountry((await props.params).countryCode);
  return country ? { title: `가보자GO - ${country.nameKo}` } : {};
}

/** 둘러보기 디자인 1.0(싱가포르 기준)을 모든 나라에 같은 틀로 쓴다. 배너 사진은 싱가포르만 전용, 국기·소개 문구는 9개 나라 모두(11/23 시안). */
export default async function CountryExplorePage(props: PageProps<"/explore/[countryCode]">) {
  const { countryCode } = await props.params;
  const country = findCountry(countryCode);

  if (!country) notFound();

  return (
    <div className={`explore-page ${notoSansKr.variable}`}>
      <ExploreHeader overHero />
      <section className="hero" aria-labelledby="page-title">
        {/* 1111 시안: 사진은 화면에 고정되고 본문이 그 위로 올라온다. */}
        {/* 전용 사진이 없는 나라는 관광명소 사진을 이어 붙인다. */}
        <HeroSlides images={heroImages(country)} placesOf={country.heroes ? undefined : country.code} />
        <div className="hero-shade" />
        <div className="hero-content page-container">
          <div className="hero-title-group">
            <h1 id="page-title">
              <img className="page-country-flag" src={`/explore/flags/${country.flag}`} width={52} height={52} alt={`${country.nameKo} 국기`} />
              <span>{country.nameKo}</span>
            </h1>
            {country.tagline && <p>{country.tagline}</p>}
          </div>
          <a className="primary-button" href="#attractions">
            가보자 GO
          </a>
        </div>
      </section>
      <main className="collections page-container" aria-label={`${country.nameKo} 여행 정보`}>
        <CountryExplore countryCode={country.code} countryName={country.nameKo} />
      </main>
      <SiteFooter />
    </div>
  );
}
