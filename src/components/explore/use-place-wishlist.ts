"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  // 비로그인(401)·오류면 빈 상태로 둔다. 하트만 비어 보이고 화면은 그대로 쓴다.
  return new Map(result.ok ? result.data.map((item) => [placeOf(item).id, item.wishlistId]) : []);
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

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([loadSaved("attraction", controller.signal), loadSaved("food", controller.signal)])
      .then(([attraction, food]) => setSaved({ attraction, food }))
      .catch(() => {
        // 언마운트로 취소된 요청
      });
    return () => controller.abort();
  }, []);

  function update(kind: PlaceKind, change: (map: Map<number, number>) => void) {
    setSaved((current) => {
      const map = new Map(current[kind]);
      change(map);
      return { ...current, [kind]: map };
    });
  }

  function goLogin() {
    notify("로그인이 필요해요. 로그인 화면으로 이동합니다.");
    router.push(loginHref(pathname));
  }

  async function toggle(kind: PlaceKind, place: Place) {
    const k = key(kind, place.id);
    if (pending.has(k)) return;
    setPending((current) => new Set(current).add(k));

    const wishlistId = saved[kind].get(place.id);

    if (wishlistId === undefined) {
      const result = await postJson<PlaceWishlistItem>(WISHLIST_URL[kind], wishlistBody(kind, place.id));
      if (result.ok) {
        update(kind, (map) => map.set(place.id, result.data.wishlistId));
        notify(`${place.name}을(를) 위시리스트에 담았어요.`);
      } else if (result.code === "DUPLICATE_WISHLIST") {
        // 다른 탭 등에서 이미 담겼다. 뺄 수 있게 wishlistId를 다시 맞춘다.
        const fresh = await loadSaved(kind);
        update(kind, (map) => {
          map.clear();
          fresh.forEach((value, id) => map.set(id, value));
        });
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
        update(kind, (map) => map.delete(place.id));
        notify(`${place.name}을(를) 위시리스트에서 뺐어요.`);
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
  }

  return {
    isSaved: (kind: PlaceKind, id: number) => saved[kind].has(id),
    isPending: (kind: PlaceKind, id: number) => pending.has(key(kind, id)),
    toggle,
  };
}
