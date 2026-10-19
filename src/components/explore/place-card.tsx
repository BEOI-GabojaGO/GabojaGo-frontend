/* eslint-disable @next/next/no-img-element -- CloudFront·디자인 사진을 그대로 쓴다. next/image는 remotePatterns 설정이 필요해 아직 쓰지 않는다. */
import type { Place } from "@/lib/explore";

/** 둘러보기 디자인 카드(표시 전용). 하트 상태와 담기·빼기는 usePlaceWishlist가 맡는다. */
export function PlaceCard({
  place,
  saved,
  pending,
  onToggle,
}: {
  place: Place;
  saved: boolean;
  pending: boolean;
  onToggle: () => void;
}) {
  const image = place.imageUrl;

  return (
    <article className="card">
      <div className="card-media">
        {image ? (
          <img className="card-photo" src={image} alt={place.name} width={342} height={200} loading="lazy" decoding="async" />
        ) : (
          <span className="photo-empty">사진 준비 중</span>
        )}
        <button
          className="favorite"
          type="button"
          aria-label={`${place.name} ${saved ? "찜 해제" : "찜하기"}`}
          aria-pressed={saved}
          disabled={pending}
          onClick={onToggle}
        >
          <img className="heart-outline" src="/explore/heart-outline.svg" width={20} height={20} alt="" />
          <img className="heart-filled" src="/explore/heart-filled.svg" width={20} height={20} alt="" />
        </button>
      </div>
      <div className="card-body">
        <h3>{place.name}</h3>
        <p className="description" title={place.description}>
          {place.description}
        </p>
        <ul className="tags" aria-label="태그">
          {place.hashtags.map((tag) => (
            <li key={tag}># {tag}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}
