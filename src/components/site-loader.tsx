/* eslint-disable @next/next/no-img-element -- 장식용 아이콘 */

/**
 * 공통 로딩 화면. busy가 없으면 CSS로 잠깐 보였다 사라지고(페이지 진입),
 * busy면 렌더되는 동안 계속 떠 있다(SerpApi를 부르는 항공권 검색 등).
 */
export function SiteLoader({ label, busy = false }: { label: string; busy?: boolean }) {
  return (
    <div className={`site-loader${busy ? " is-busy" : ""}`} role="status" aria-label={label}>
      <div className="site-loader-route" aria-hidden="true">
        <span className="site-loader-start" />
        <svg className="site-loader-line" viewBox="0 0 150 30" preserveAspectRatio="none">
          <path d="M 16 15 C 45 -3 105 -3 134 15" />
        </svg>
        <img className="site-loader-plane" src="/flight/airplane.svg" alt="" />
        <span className="site-loader-end" />
      </div>
      <strong className="site-loader-brand">
        가보자 <span>GO</span>
      </strong>
    </div>
  );
}
