import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "가보자GO",
  description: "조건에 맞는 항공권을 한 번에 찾아보세요.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
