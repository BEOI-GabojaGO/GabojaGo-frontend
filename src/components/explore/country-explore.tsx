"use client";

import { useEffect, useState } from "react";
import { Carousel } from "@/components/explore/carousel";
import { PlaceCard } from "@/components/explore/place-card";
import { usePlaceWishlist } from "@/components/explore/use-place-wishlist";
import { useToast } from "@/components/main/main-ui";
import { requestJson } from "@/lib/flight-client";
import type { CountryAttractions, CountryFoods, Place, PlaceKind } from "@/lib/explore";

type Data = { attractions: CountryAttractions; foods: CountryFoods };

/**
 * 나라 페이지 본문(서비스 플로우 · 둘러보기). 팀 결정(2026-10-11)으로 음식(나라 단위 한 목록)이 첫 줄이고,
 * 관광명소는 그 아래에 둔다. 일본은 도시별 여러 줄, 나머지 나라는 "{나라} 관광명소" 한 줄이다.
 */
export function CountryExplore({ countryCode, countryName }: { countryCode: string; countryName: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const { notify, toast } = useToast();
  const wishlist = usePlaceWishlist(notify);

  useEffect(() => {
    const controller = new AbortController();
    const base = `/api/v1/countries/${countryCode}`;

    Promise.all([
      requestJson<CountryAttractions>(`${base}/attractions`, { signal: controller.signal }),
      requestJson<CountryFoods>(`${base}/foods`, { signal: controller.signal }),
    ])
      .then(([attractions, foods]) => {
        if (attractions.ok && foods.ok) setData({ attractions: attractions.data, foods: foods.data });
        else setError((!attractions.ok && attractions.message) || (!foods.ok && foods.message) || "");
      })
      .catch(() => {
        // 언마운트로 취소된 요청
      });

    return () => controller.abort();
  }, [countryCode]);

  if (!data) {
    return (
      <p className="status" role={error ? "alert" : "status"}>
        {error || "둘러보기 정보를 불러오는 중..."}
      </p>
    );
  }

  const card = (kind: PlaceKind, place: Place) => (
    <PlaceCard
      key={place.id}
      place={place}
      saved={wishlist.isSaved(kind, place.id)}
      pending={wishlist.isPending(kind, place.id)}
      onToggle={() => void wishlist.toggle(kind, place)}
    />
  );
  const { cities } = data.attractions;
  const { foods } = data.foods;
  // 팀 결정: 관광명소는 일본만 도시별로 나누고, 나머지 나라는 나라 단위 한 줄로 묶는다.
  // 묶을 때는 id 순(= 데이터셋 문서 순서, V9 시드)으로 정렬한다. 도시 순서대로 이으면 문서 순서와 달라진다.
  const groups =
    countryCode === "JP"
      ? cities.map((city) => ({
          id: `attractions-${city.cityCode}`,
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
      {/* 히어로의 "가보자 GO" 버튼이 첫 줄(#foods)로 이동한다. */}
      {foods.length === 0 ? (
        <p className="status" id="foods">
          아직 등록된 음식이 없습니다.
        </p>
      ) : (
        <Carousel id="foods" title={`${countryName} 대표음식`}>
          {foods.map((place) => card("food", place))}
        </Carousel>
      )}

      {groups.length === 0 && <p className="status">아직 등록된 관광명소가 없습니다.</p>}
      {groups.map((group) => (
        <Carousel key={group.id} id={group.id} title={group.title}>
          {group.places.map((place) => card("attraction", place))}
        </Carousel>
      ))}

      {toast}
    </>
  );
}
