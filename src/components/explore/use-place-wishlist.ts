"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { loginHref } from "@/lib/auth-client";
import { postJson, requestJson } from "@/lib/flight-client";
import {
  WISHLIST_URL,
  placeOf,
  wishlistBody,
  type Place,
  type PlaceKind,
  type PlaceWishlistItem,
} from "@/lib/explore";

type Saved = Record<PlaceKind, Map<number, number>>;

const key = (kind: PlaceKind, id: number) => `${kind}:${id}`;

async function loadSaved(kind: PlaceKind, signal?: AbortSignal) {
  const result = await requestJson<PlaceWishlistItem[]>(WISHLIST_URL[kind], { signal });
  // 비로그인(401)·오류면 null. 처음에는 빈 하트로 두고, 409 뒤 다시 부를 때는 지금 상태를 그대로 둔다.
  return result.ok ? new Map(result.data.map((item) => [placeOf(item).id, item.wishlistId])) : null;
}

/** 처음 불러온 값으로 채우되, 그 전에 사용자가 바꾼 항목(touched)은 지금 값을 유지한다. */
function keepTouched(fetched: Map<number, number>, current: Map<number, number>, touched: Set<number>) {
  const next = new Map(fetched);
  touched.forEach((id) => {
    const value = current.get(id);
    if (value === undefined) next.delete(id);
    else next.set(id, value);
  });
  return next;
}

/**
 * 둘러보기 하트 상태. 처음에 내 위시리스트를 불러와 이미 담은 하트를 채우고,
 * 누르면 담기(POST)·빼기(DELETE)를 오간다. 401이면 로그인 화면으로 보냈다가 이 페이지로 돌아오게 한다.
 */
export function usePlaceWishlist(notify: (message: string) => void) {
  const router = useRouter();
  const pathname = usePathname();
  const [saved, setSaved] = useState<Saved>({ attraction: new Map(), food: new Map() });
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const touched = useRef<Record<PlaceKind, Set<number>>>({ attraction: new Set(), food: new Set() });

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([loadSaved("attraction", controller.signal), loadSaved("food", controller.signal)])
      .then(([attraction, food]) =>
        setSaved((current) => ({
          attraction: keepTouched(attraction ?? new Map(), current.attraction, touched.current.attraction),
          food: keepTouched(food ?? new Map(), current.food, touched.current.food),
        })),
      )
      .catch(() => {
        // 언마운트로 취소된 요청
      });
    return () => controller.abort();
  }, []);

  function update(kind: PlaceKind, id: number, change: (map: Map<number, number>) => void) {
    touched.current[kind].add(id);
    setSaved((current) => {
      const map = new Map(current[kind]);
      change(map);
      return { ...current, [kind]: map };
    });
  }

  function goLogin() {
    notify("로그인이 필요해요. 로그인 화면으로 이동합니다.");
    // 토스트를 읽을 틈을 두고 이동한다.
    window.setTimeout(() => router.push(loginHref(pathname)), 1000);
  }

  /** 담기·빼기. 끝난 뒤 하트가 누른 대로 바뀌었으면 true(하트 움직임을 마칠지 정한다). */
  async function toggle(kind: PlaceKind, place: Place) {
    const k = key(kind, place.id);
    if (pending.has(k)) return false;
    let done = false;
    setPending((current) => new Set(current).add(k));

    const wishlistId = saved[kind].get(place.id);

    if (wishlistId === undefined) {
      const result = await postJson<PlaceWishlistItem>(WISHLIST_URL[kind], wishlistBody(kind, place.id));
      if (result.ok) {
        update(kind, place.id, (map) => map.set(place.id, result.data.wishlistId));
        notify(`${place.name}을(를) 위시리스트에 담았어요.`);
        done = true;
      } else if (result.code === "DUPLICATE_WISHLIST") {
        // 다른 탭 등에서 이미 담겼다. 뺄 수 있게 wishlistId를 다시 맞춘다.
        // 다시 불러오기가 실패하면 지금 상태를 그대로 둔다.
        const fresh = await loadSaved(kind);
        if (fresh) {
          update(kind, place.id, (map) => {
            map.clear();
            fresh.forEach((value, id) => map.set(id, value));
          });
          done = fresh.has(place.id);
        }
        notify(`${place.name}은(는) 이미 위시리스트에 있어요.`);
      } else if (result.status === 401) {
        goLogin();
      } else {
        notify(result.message);
      }
    } else {
      const result = await requestJson<void>(`${WISHLIST_URL[kind]}/${wishlistId}`, { method: "DELETE" });
      // 404는 이미 지워진 항목이라 성공과 같이 처리한다(위시리스트 화면과 같은 규칙).
      if (result.ok || result.status === 404) {
        update(kind, place.id, (map) => map.delete(place.id));
        notify(`${place.name}을(를) 위시리스트에서 뺐어요.`);
        done = true;
      } else if (result.status === 401) {
        goLogin();
      } else {
        notify(result.message);
      }
    }

    setPending((current) => {
      const next = new Set(current);
      next.delete(k);
      return next;
    });
    return done;
  }

  return {
    isSaved: (kind: PlaceKind, id: number) => saved[kind].has(id),
    isPending: (kind: PlaceKind, id: number) => pending.has(key(kind, id)),
    toggle,
  };
}
