"use client";

import { useInfoDialog } from "@/components/main/main-ui";

const LINKS = ["이용약관", "개인정보처리방침", "고객센터"];

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
