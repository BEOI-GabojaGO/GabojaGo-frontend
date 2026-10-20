import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "가보자GO",
  description: "조건에 맞는 항공권을 한 번에 찾아보세요.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">
        {/* 새로고침·첫 접속 때만 보인다. 레이아웃은 클라이언트 이동 때 다시 그려지지 않는다. */}
        <div className="site-loader" role="status" aria-label="가보자GO 페이지를 불러오는 중">
          <div className="site-loader-route" aria-hidden="true">
            <span className="site-loader-start" />
            <svg className="site-loader-line" viewBox="0 0 150 30" preserveAspectRatio="none">
              <path d="M 16 15 C 45 -3 105 -3 134 15" />
            </svg>
            {/* eslint-disable-next-line @next/next/no-img-element -- 장식용 아이콘 */}
            <img className="site-loader-plane" src="/flight/airplane.svg" alt="" />
            <span className="site-loader-end" />
          </div>
          <strong className="site-loader-brand">
            가보자 <span>GO</span>
          </strong>
        </div>
        {children}
      </body>
    </html>
  );
}
