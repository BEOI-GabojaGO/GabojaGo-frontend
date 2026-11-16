"use client";

import Link from "next/link";
import { useInfoDialog } from "@/components/main/main-ui";

const LINKS = ["이용약관", "개인정보처리방침", "고객센터"];

/** 메인·둘러보기 상세 공용 푸터(로고 · © · 서비스 안내). 스타일은 각 화면 CSS(main.css, explore.css)가 맡는다. */
export function SiteFooter({ brandHref = "/" }: { brandHref?: string }) {
  return (
    <footer>
      <div className="footer-inner">
        <Link className="brand" href={brandHref}>
          가보자 <span>GO</span>
        </Link>
        <p>© 2026 가보자GO. All rights reserved.</p>
        <FooterNav />
      </div>
    </footer>
  );
}

export function FooterNav() {
  const { show, dialog } = useInfoDialog();

  return (
    <>
      <nav aria-label="서비스 안내">
      {LINKS.map((label) => (
        <button
          key={label}
          type="button"
          onClick={() => show(label, "서비스 안내 콘텐츠가 연결될 영역입니다. 현재는 Figma 시안을 구현한 퍼블리싱 데모입니다.")}
        >
          {label}
        </button>
      ))}
      </nav>
      {/* nav 밖에 둬야 `.footer-inner nav button` 스타일이 다이얼로그 버튼에 번지지 않는다. */}
      {dialog}
    </>
  );
}
