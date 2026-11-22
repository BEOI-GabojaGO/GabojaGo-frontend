"use client";

import { useEffect, useState } from "react";
import { Carousel } from "@/components/explore/carousel";
import { loadCountryPlaces, type CountryPlaces } from "@/components/explore/country-places";
import { PlaceCard } from "@/components/explore/place-card";
import { PlaceDetailDialog } from "@/components/explore/place-detail-dialog";
import { usePlaceWishlist } from "@/components/explore/use-place-wishlist";
import { useToast } from "@/components/main/main-ui";
import type { Place, PlaceKind } from "@/lib/explore";

/**
 * 나라 페이지 본문(서비스 플로우 · 둘러보기). 팀 결정(2026-10-11)으로 음식(나라 단위 한 목록)이 첫 줄이고,
 * 관광명소는 그 아래에 둔다. 일본은 도시별 여러 줄, 나머지 나라는 "{나라} 관광명소" 한 줄이다.
 */
export function CountryExplore({ countryCode, countryName }: { countryCode: string; countryName: string }) {
  const [data, setData] = useState<CountryPlaces | null>(null);
  const [error, setError] = useState("");
  // 상세 창에 띄운 카드(임시 상세 창, 시안 나오면 교체).
  const [detail, setDetail] = useState<{ kind: PlaceKind; place: Place } | null>(null);
  const { notify, toast } = useToast();
  const wishlist = usePlaceWishlist(notify);

  // 히어로 슬라이드와 같은 요청을 함께 쓴다(loadCountryPlaces).
  useEffect(() => {
    let alive = true;
    void loadCountryPlaces(countryCode).then((result) => {
      if (!alive) return;
      if (result.ok) setData(result.data);
      else setError(result.message);
    });
    return () => {
      alive = false;
    };
  }, [countryCode]);

  if (!data) {
    return (
      <p className={error ? "status" : "status is-loading"} role={error ? "alert" : "status"}>
        {error || "둘러보기 정보를 불러오는 중..."}
      </p>
    );
  }

  const heart = (kind: PlaceKind, place: Place) => ({
    saved: wishlist.isSaved(kind, place.id),
    pending: wishlist.isPending(kind, place.id),
    onToggle: () => wishlist.toggle(kind, place),
  });
  const card = (kind: PlaceKind, place: Place) => (
    <PlaceCard key={place.id} place={place} onOpen={() => setDetail({ kind, place })} {...heart(kind, place)} />
  );
  // 관광명소가 없는 도시는 뺀다(빈 줄이 생기지 않고, "가보자 GO"가 내용 있는 첫 줄로 간다).
  const cities = data.attractions.cities.filter((city) => city.attractions.length > 0);
  const { foods } = data.foods;
  // 팀 결정: 관광명소는 일본만 도시별로 나누고, 나머지 나라는 나라 단위 한 줄로 묶는다.
  // 묶을 때는 id 순(= 데이터셋 문서 순서, V9 시드)으로 정렬한다. 도시 순서대로 이으면 문서 순서와 달라진다.
  const groups =
    countryCode === "JP"
      ? cities.map((city, index) => ({
          // 히어로 "가보자 GO"(#attractions)가 첫 도시 줄로 오게 첫 줄만 id를 attractions로 둔다.
          id: index === 0 ? "attractions" : `attractions-${city.cityCode}`,
          title: `${cities.length === 1 ? countryName : city.cityNameKo} 관광명소`,
          places: city.attractions,
        }))
      : [
          {
            id: "attractions",
            title: `${countryName} 관광명소`,
            places: cities.flatMap((city) => city.attractions).sort((a, b) => a.id - b.id),
          },
        ].filter((group) => group.places.length > 0);

  return (
    <>
      {/* 히어로의 "가보자 GO" 버튼은 관광명소(#attractions)로 이동한다(1111 시안). */}
      {foods.length === 0 ? (
        <p className="status" id="foods">
          아직 등록된 음식이 없습니다.
        </p>
      ) : (
        <Carousel id="foods" title={`${countryName} 대표음식`}>
          {foods.map((place) => card("food", place))}
        </Carousel>
      )}

      {groups.length === 0 && (
        <p className="status" id="attractions">
          아직 등록된 관광명소가 없습니다.
        </p>
      )}
      {groups.map((group) => (
        <Carousel key={group.id} id={group.id} title={group.title}>
          {group.places.map((place) => card("attraction", place))}
        </Carousel>
      ))}

      <PlaceDetailDialog
        place={detail?.place ?? null}
        onClose={() => setDetail(null)}
        {...(detail ? heart(detail.kind, detail.place) : { saved: false, pending: false, onToggle: async () => false })}
      >
        {detail && toast}
      </PlaceDetailDialog>
      {!detail && toast}
    </>
  );
}
