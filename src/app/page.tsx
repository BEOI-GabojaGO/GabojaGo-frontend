/* eslint-disable @next/next/no-img-element -- 디자인 원본의 이미지·아이콘을 그대로 쓴다. */
import { Noto_Sans_KR } from "next/font/google";
import { FooterNav } from "@/components/main/footer-nav";
import { LoginDialog } from "@/components/main/login-dialog";
import { MainCarousels } from "@/components/main/main-carousels";
import { SearchPanel } from "@/components/main/search-panel";
import { readConditionSearchParams } from "@/lib/flight-search-params";
import "./main.css";
// 로그인 다이얼로그 규칙이 main.css의 input:focus-visible 외곽선을 덮어야 하므로 뒤에 둔다.
import "./auth.css";

// 한글 글리프는 unicode-range로 나뉘어 있어 preload 대신 필요한 조각만 받는다.
const notoSansKr = Noto_Sans_KR({ subsets: ["latin"], preload: false, variable: "--font-noto-kr" });

const BENEFITS = [
  { icon: "imgIconAi.svg", text: "AI 맞춤형 항공권 검색" },
  { icon: "imgIconCommunication.svg", text: "자연어 복합 조건 입력" },
  { icon: "imgIconTime.svg", text: "검색 소요 시간 압도적 단축" },
  { icon: "imgIconHear.svg", text: "사용자 고민 경청 및 해소" },
];

const HERO_IMAGES = [
  "/main/imgFrame179.webp",
  ...[1, 2, 3, 4].map((n) => `/main/hero/hero-banner-${n}.webp`),
];

export default async function Home({ searchParams }: PageProps<"/">) {
  // 항공권 목록 "수정하기"에서 오면(?search=condition&…) 조건 검색 탭을 그 조건으로 연다.
  const initialCondition = readConditionSearchParams(await searchParams);

  return (
    <div className={`main-page auth-ui ${notoSansKr.variable}`}>
      <header className="header">
        <div className="header-inner">
          <a className="brand" href="#home">
            가보자 <span>GO</span>
          </a>
          <LoginDialog />
        </div>
      </header>

      <main id="home">
        <section className="hero" aria-labelledby="hero-title">
          {/* 6.5초마다 1.5초 동안 교차 전환한다(CSS만, main.css의 hero-slide). 장식용이라 alt를 비운다. */}
          <div className="hero-background" aria-hidden="true">
            {HERO_IMAGES.map((src, index) => (
              <picture
                key={src}
                className="hero-background-slide"
                style={{ animationDelay: `${index * 6.5 - 1.5}s` }}
              >
                <img src={src} alt="" fetchPriority={index ? "low" : "high"} />
              </picture>
            ))}
          </div>
          <div className="hero-copy">
            <p className="badge">
              <img src="/main/imgSparkleIcon1.svg" alt="" />
              AI가 5초 만에 찾아드려요
            </p>
            <div className="hero-text">
              <h1 id="hero-title">
                아시아 여행
                <br />
                어디로 갈지 고민이라면?
              </h1>
              <p>예산, 일정, 취향만 알려주면 가보자GO에서 숨은 비용 없는 최적의 여행지를 5초 만에 찾아드려요.</p>
            </div>
          </div>
          <SearchPanel initialCondition={initialCondition} />
        </section>

        <div className="content">
          <section className="benefits" aria-labelledby="benefit-title">
            <h2 id="benefit-title">
              가보자GO를
              <span className="mobile-break">
                <br />
              </span>
              <span className="desktop-space"> </span>
              선택해야만 하는 이유
            </h2>
            <div className="benefit-list">
              {BENEFITS.map(({ icon, text }) => (
                <div className="benefit" key={text}>
                  <span className="benefit-icon">
                    <img src={`/main/${icon}`} alt="" />
                  </span>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </section>
          <MainCarousels />
        </div>
      </main>

      <footer>
        <div className="footer-inner">
          <a className="brand" href="#home">
            가보자 <span>GO</span>
          </a>
          <p>© 2026 가보자GO. All rights reserved.</p>
          <FooterNav />
        </div>
      </footer>
    </div>
  );
}
