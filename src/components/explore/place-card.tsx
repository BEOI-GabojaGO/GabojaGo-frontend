/* eslint-disable @next/next/no-img-element -- CloudFront·디자인 사진을 그대로 쓴다. next/image는 remotePatterns 설정이 필요해 아직 쓰지 않는다. */
import type { Place } from "@/lib/explore";

/** 하트를 누를 때 튀고(담기는 터짐까지) 끝나면 클래스를 지운다(1111 시안 is-activating·is-deactivating). */
function playHeart(button: HTMLButtonElement, saving: boolean) {
  button.classList.remove("is-activating", "is-deactivating");
  void button.offsetWidth;
  button.classList.add(saving ? "is-activating" : "is-deactivating");
  setTimeout(() => button.classList.remove("is-activating", "is-deactivating"), 560);
}

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
          <img className="card-photo" src={image} alt={place.name} width={342} height={220} loading="lazy" decoding="async" />
        ) : (
          <span className="photo-empty">사진 준비 중</span>
        )}
        <button
          className="favorite"
          type="button"
          aria-label={`${place.name} ${saved ? "찜 해제" : "찜하기"}`}
          aria-pressed={saved}
          disabled={pending}
          onClick={(event) => {
            playHeart(event.currentTarget, !saved);
            onToggle();
          }}
        >
          <span className="heart-burst" aria-hidden="true" />
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
