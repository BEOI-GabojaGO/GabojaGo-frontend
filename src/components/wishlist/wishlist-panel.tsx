"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FlightRouteSummary } from "@/components/flight/flight-option-card";
import { EmptyMessage, ErrorAlert, SecondaryButton } from "@/components/flight/flow-ui";
import { TRAVEL_CLASS_OPTIONS } from "@/components/flight/search-condition-fields";
import { loginHref } from "@/lib/auth-client";
import { placeOf, WISHLIST_URL, type PlaceKind, type PlaceWishlistItem } from "@/lib/explore";
import { formatPrice, requestJson } from "@/lib/flight-client";
import type { FlightWishlistItem } from "@/lib/flight-types";

const TABS = [
  { id: "flight", label: "항공권" },
  { id: "attraction", label: "관광명소" },
  { id: "food", label: "음식" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function WishlistPanel() {
  const [tab, setTab] = useState<TabId>("flight");

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="위시리스트 종류" className="grid grid-cols-3 gap-2">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => setTab(id)}
            className={`h-10 rounded-xl text-sm font-bold transition ${
              tab === id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "flight" ? (
          <FlightWishlist />
        ) : (
          <PlaceWishlist key={tab} kind={tab} />
        )}
      </div>
    </div>
  );
}

function FlightWishlist() {
  const [items, setItems] = useState<FlightWishlistItem[] | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    requestJson<FlightWishlistItem[]>("/api/v1/users/me/flight-wishlists", {
      signal: controller.signal,
    })
      .then((result) => {
        if (result.ok) setItems(result.data);
        else if (result.status === 401) setNeedsLogin(true);
        else setError(result.message);
      })
      .catch(() => {
        // 언마운트로 취소된 요청
      });

    return () => controller.abort();
  }, []);

  async function remove(wishlistId: number) {
    setDeletingId(wishlistId);
    setError("");

    const result = await requestJson<void>(
      `/api/v1/users/me/flight-wishlists/${wishlistId}`,
      { method: "DELETE" },
    );

    setDeletingId(null);

    // 404는 이미 지워진 항목이라 성공과 같이 목록에서 뺀다.
    if (result.ok || result.status === 404) {
      setItems((current) => current?.filter((item) => item.wishlistId !== wishlistId) ?? null);
    } else if (result.status === 401) {
      setNeedsLogin(true);
    } else {
      setError(result.message);
    }
  }

  if (needsLogin) return <LoginNotice />;

  if (!items) {
    return error ? (
      <ErrorAlert message={error} />
    ) : (
      <p role="status" className="text-sm text-slate-500">
        위시리스트를 불러오는 중...
      </p>
    );
  }

  return (
    <section className="space-y-3">
      <ErrorAlert message={error} />
      {items.length === 0 ? (
        <EmptyMessage>
          아직 담은 항공권이 없습니다.{" "}
          <Link href="/" className="font-bold text-blue-700 underline">
            항공권 검색하기
          </Link>
        </EmptyMessage>
      ) : (
        <p className="text-sm text-slate-500">
          담을 당시의 정보와 가격입니다. 현재 가격과 다를 수 있어요.
        </p>
      )}
      {items.map((item) => (
        <FlightWishlistCard
          key={item.wishlistId}
          item={item}
          deleting={deletingId === item.wishlistId}
          onDelete={() => void remove(item.wishlistId)}
        />
      ))}
    </section>
  );
}

function FlightWishlistCard({
  item,
  deleting,
  onDelete,
}: {
  item: FlightWishlistItem;
  deleting: boolean;
  onDelete: () => void;
}) {
  const roundTrip = item.inbound !== null;
  const travelers = item.adults + item.children + item.infantsInSeat + item.infantsOnLap;
  const travelClass =
    TRAVEL_CLASS_OPTIONS.find((option) => option.value === item.travelClass)?.label ?? "";

  return (
    <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="space-y-3">
        <FlightRouteSummary option={item.outbound} label={roundTrip ? "가는편" : "편도"} />
        {item.inbound && <FlightRouteSummary option={item.inbound} label="오는편" />}
      </div>

      <div className="flex items-end justify-between gap-4 border-t border-slate-100 pt-4">
        <div>
          <p className="text-xs text-slate-500">
            담을 당시 {roundTrip ? "왕복 총액" : "편도 요금"} · {travelers}명 · {travelClass}
          </p>
          <p className="text-lg font-bold text-slate-900">{formatPrice(item.savedPrice)}</p>
        </div>
        <SecondaryButton onClick={onDelete} disabled={deleting}>
          {deleting ? "삭제 중..." : "♥ 삭제"}
        </SecondaryButton>
      </div>
    </article>
  );
}

/** 로그인 후 위시리스트 화면으로 돌아온다. */
function LoginNotice() {
  return (
    <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
      위시리스트는 로그인 후 이용할 수 있습니다.{" "}
      <Link href={loginHref("/wishlist")} className="font-bold underline">
        로그인하기
      </Link>
    </p>
  );
}

const EMPTY_LABEL: Record<PlaceKind, string> = { attraction: "관광명소가", food: "음식이" };

/** 관광명소·음식 위시리스트. 항공권 목록과 같은 규칙으로 불러오고 지운다(404는 이미 삭제된 항목). */
function PlaceWishlist({ kind }: { kind: PlaceKind }) {
  const [items, setItems] = useState<PlaceWishlistItem[] | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    requestJson<PlaceWishlistItem[]>(WISHLIST_URL[kind], { signal: controller.signal })
      .then((result) => {
        if (result.ok) setItems(result.data);
        else if (result.status === 401) setNeedsLogin(true);
        else setError(result.message);
      })
      .catch(() => {
        // 언마운트로 취소된 요청
      });

    return () => controller.abort();
  }, [kind]);

  async function remove(wishlistId: number) {
    setDeletingId(wishlistId);
    setError("");

    const result = await requestJson<void>(`${WISHLIST_URL[kind]}/${wishlistId}`, { method: "DELETE" });

    setDeletingId(null);

    if (result.ok || result.status === 404) {
      setItems((current) => current?.filter((item) => item.wishlistId !== wishlistId) ?? null);
    } else if (result.status === 401) {
      setNeedsLogin(true);
    } else {
      setError(result.message);
    }
  }

  if (needsLogin) return <LoginNotice />;

  if (!items) {
    return error ? (
      <ErrorAlert message={error} />
    ) : (
      <p role="status" className="text-sm text-slate-500">
        위시리스트를 불러오는 중...
      </p>
    );
  }

  return (
    <section className="space-y-3">
      <ErrorAlert message={error} />
      {items.length === 0 && (
        <EmptyMessage>
          아직 담은 {EMPTY_LABEL[kind]} 없습니다.{" "}
          <Link href="/explore" className="font-bold text-blue-700 underline">
            둘러보기
          </Link>
        </EmptyMessage>
      )}
      {items.map((item) => (
        <PlaceWishlistCard
          key={item.wishlistId}
          item={item}
          deleting={deletingId === item.wishlistId}
          onDelete={() => void remove(item.wishlistId)}
        />
      ))}
    </section>
  );
}

function PlaceWishlistCard({
  item,
  deleting,
  onDelete,
}: {
  item: PlaceWishlistItem;
  deleting: boolean;
  onDelete: () => void;
}) {
  const place = placeOf(item);
  const image = place.imageUrl;
  // 싱가포르·홍콩처럼 나라와 도시 이름이 같으면 한 번만 보여 준다.
  const where = [...new Set([item.countryNameKo, item.cityNameKo].filter(Boolean))].join(" · ");

  return (
    <article className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="size-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- CloudFront·디자인 사진을 그대로 쓴다.
          <img src={image} alt={place.name} loading="lazy" className="size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center text-xs text-slate-400">사진 준비 중</span>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-xs text-slate-500">{where}</p>
        <h3 className="font-bold text-slate-900">{place.name}</h3>
        <p className="truncate text-sm text-slate-600">{place.description}</p>
        <p className="flex flex-wrap gap-1">
          {place.hashtags.map((tag) => (
            <span key={tag} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
              #{tag}
            </span>
          ))}
        </p>
        <div className="flex items-center justify-between gap-3 pt-1">
          <Link href={`/explore/${item.countryCode}`} className="text-sm font-semibold text-blue-700 hover:underline">
            나라 페이지 보기
          </Link>
          <SecondaryButton onClick={onDelete} disabled={deleting}>
            {deleting ? "삭제 중..." : "♥ 삭제"}
          </SecondaryButton>
        </div>
      </div>
    </article>
  );
}
