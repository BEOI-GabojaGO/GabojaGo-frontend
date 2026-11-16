"use client";

/* eslint-disable @next/next/no-img-element -- 디자인 원본 배너 사진을 그대로 쓴다. */
import { useEffect, useState } from "react";
import { prefersReducedMotion } from "@/components/main/main-ui";

/**
 * 둘러보기 상세 히어로 슬라이드(1111 시안): 6.5초마다 다음 사진으로 1.5초 동안 겹쳐 바뀐다(전환은 CSS opacity transition).
 * 사진이 한 장이면 정지 화면이다. 다음 사진을 다 받은 뒤 바꾸고, 탭이 안 보이거나 움직임 줄이기면 넘기지 않는다.
 */
export function HeroSlides({ images }: { images: { src: string; alt: string }[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    let timer: ReturnType<typeof setTimeout>;
    const next = async () => {
      if (!document.hidden && !prefersReducedMotion()) {
        const upcoming = new Image();
        upcoming.src = images[(active + 1) % images.length].src;
        await upcoming.decode().catch(() => {});
        setActive((current) => (current + 1) % images.length);
      } else timer = setTimeout(next, 6500);
    };
    timer = setTimeout(next, 6500);
    return () => clearTimeout(timer);
  }, [active, images]);

  return (
    <div className="hero-slides" aria-hidden="true">
      {images.map((image, index) => (
        <img
          key={image.src}
          className={`hero-photo${index === active ? " is-active" : ""}`}
          src={image.src}
          alt=""
          width={1920}
          height={1280}
          fetchPriority={index === 0 ? "high" : "low"}
          decoding="async"
        />
      ))}
    </div>
  );
}
