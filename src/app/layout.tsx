import type { Metadata } from "next";
import { SiteLoader } from "@/components/site-loader";
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
        <SiteLoader label="가보자GO 페이지를 불러오는 중" />
        {children}
      </body>
    </html>
  );
}
