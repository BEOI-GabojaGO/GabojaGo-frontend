/* eslint-disable @next/next/no-img-element -- 카드와 같은 사진을 그대로 쓴다(place-card.tsx 참고). */
"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { HeartButton, type HeartProps } from "@/components/explore/place-card";
import type { Place } from "@/lib/explore";

/**
 * 둘러보기 카드 임시 상세 창. 1111 시안의 detail-dialog 틀(540px·흐린 배경)에 사진·이름·설명 전문·해시태그·하트를 채운다.
 * 상세 시안이 나오면 교체한다. 브라우저 <dialog>라 ESC·포커스 가두기는 기본 동작을 쓴다.
 * 창은 최상위 층(top layer)이라 바깥 토스트가 가려진다. 열려 있는 동안 토스트는 children으로 창 안에 둔다.
 */
export function PlaceDetailDialog({
  place,
  onClose,
  children,
  ...heart
}: HeartProps & { place: Place | null; onClose: () => void; children?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (place && !ref.current?.open) ref.current?.showModal();
  }, [place]);

  return (
    <dialog
      ref={ref}
      className="detail-dialog"
      aria-labelledby="detail-dialog-title"
      onClose={onClose}
      // 창 바깥(배경)을 누르면 닫는다. 창 안쪽 클릭은 target이 dialog가 아니다.
      onClick={(event) => event.target === event.currentTarget && ref.current?.close()}
    >
      {place && (
        <div className="detail-inner">
          <button className="detail-close" type="button" aria-label="상세 정보 닫기" onClick={() => ref.current?.close()}>
            ×
          </button>
          <div className="detail-media">
            {place.imageUrl ? (
              <img className="card-photo" src={place.imageUrl} alt={place.name} width={540} height={300} decoding="async" />
            ) : (
              <span className="photo-empty">사진 준비 중</span>
            )}
            <HeartButton name={place.name} {...heart} />
          </div>
          <h2 id="detail-dialog-title">{place.name}</h2>
          {place.description && <p className="detail-description">{place.description}</p>}
          {place.hashtags.length > 0 && (
            <ul className="tags" aria-label="태그">
              {place.hashtags.map((tag) => (
                <li key={tag}># {tag}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {children}
    </dialog>
  );
}
