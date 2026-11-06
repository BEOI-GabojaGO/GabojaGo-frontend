"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, type FormEvent, type RefObject } from "react";
import { Img } from "@/components/main/main-ui";

/**
 * 메인 AI·사주 검색 입력창(1105 시안). 여러 줄 textarea로, 내용에 맞춰 높이가 늘고(데스크톱 160px·모바일 126px까지)
 * 넘치면 안에서 스크롤한다. 기본 스크롤바는 숨기고 스크롤하는 동안만 분홍 막대(.prompt-scrollbar)를 그린다.
 * 모바일은 placeholder를 따로 그려(.prompt-placeholder) 칸보다 길면 좌우로 흐르게 한다.
 * Enter는 전송, Shift+Enter는 줄바꿈. 한글 조합 중 Enter는 무시한다(마지막 글자가 두 번 전송되는 것을 막는다).
 */
export function PromptForm({
  value,
  onChange,
  placeholder,
  onSubmit,
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onSubmit: (event: FormEvent) => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const form = useRef<HTMLFormElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  const holder = useRef<HTMLSpanElement>(null);
  const holderText = useRef<HTMLSpanElement>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const updateScrollbar = useCallback(() => {
    const input = inputRef.current;
    if (!input || !form.current || !bar.current || !thumb.current) return;
    const scrollable = input.scrollHeight > input.clientHeight + 1;
    form.current.classList.toggle("has-scrollbar", scrollable);
    if (!scrollable) {
      thumb.current.style.height = "0px";
      thumb.current.style.transform = "translateY(0)";
      return;
    }
    const track = bar.current.clientHeight;
    const height = Math.max(18, track * (input.clientHeight / input.scrollHeight));
    const range = input.scrollHeight - input.clientHeight;
    thumb.current.style.height = `${height}px`;
    thumb.current.style.transform = `translateY(${range ? (input.scrollTop / range) * Math.max(0, track - height) : 0}px)`;
  }, [inputRef]);

  // 시안 resizePromptInput: 높이를 내용에 맞추고(최대 높이까지) 한 줄을 넘으면 is-multiline.
  const resize = useCallback(
    (instant = false) => {
      const input = inputRef.current;
      if (!input) return;
      const style = getComputedStyle(input);
      const lineHeight = parseFloat(style.lineHeight) || 24;
      const maxHeight = matchMedia("(max-width: 599px)").matches ? 126 : parseFloat(style.maxHeight) || 160;
      if (instant) input.style.transition = "none";
      const previousMax = input.style.maxHeight;
      input.style.maxHeight = "none";
      input.style.height = "auto";
      const content = input.scrollHeight;
      input.style.maxHeight = previousMax;
      const target = Math.min(Math.max(content, lineHeight), maxHeight);
      input.style.height = `${target}px`;
      const scrollable = input.scrollHeight > input.clientHeight + 1;
      input.style.overflowY = scrollable ? "auto" : "hidden";
      form.current?.classList.toggle("is-multiline", target > lineHeight + 1);
      requestAnimationFrame(updateScrollbar);
      if (!scrollable) form.current?.classList.remove("is-scrolling");
      if (instant) requestAnimationFrame(() => input.style.removeProperty("transition"));
    },
    [inputRef, updateScrollbar],
  );

  // 모바일 placeholder: 비어 있을 때만 보이고, 칸보다 길면 넘친 만큼(--prompt-placeholder-distance) 좌우로 흐른다.
  const syncPlaceholder = useCallback(() => {
    const f = form.current;
    if (!f || !holder.current || !holderText.current) return;
    const empty = !inputRef.current?.value;
    f.classList.toggle("has-custom-placeholder", empty);
    f.classList.remove("placeholder-overflow");
    requestAnimationFrame(() => {
      if (!empty || !holder.current || !holderText.current) return;
      const distance = Math.max(0, holderText.current.scrollWidth - holder.current.clientWidth);
      f.style.setProperty("--prompt-placeholder-distance", `${distance}px`);
      if (distance > 1) f.classList.add("placeholder-overflow");
    });
  }, [inputRef]);

  // 값이 바뀌면(입력·추천 검색어·탭 전환 placeholder) 높이와 placeholder를 다시 맞춘다.
  useLayoutEffect(() => {
    resize();
    syncPlaceholder();
  }, [value, placeholder, resize, syncPlaceholder]);

  useEffect(() => {
    const onResize = () => {
      syncPlaceholder();
      resize(true);
    };
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(scrollTimer.current);
    };
  }, [resize, syncPlaceholder]);

  function onScroll() {
    const input = inputRef.current;
    if (!input || !form.current) return;
    if (input.scrollHeight <= input.clientHeight + 1) {
      form.current.classList.remove("is-scrolling");
      updateScrollbar();
      return;
    }
    updateScrollbar();
    form.current.classList.add("is-scrolling");
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => form.current?.classList.remove("is-scrolling"), 600);
  }

  return (
    <form ref={form} className="prompt-form" onSubmit={onSubmit}>
      <Img name="imgSparkleIcon.svg" />
      <label className="sr-only" htmlFor="travel-prompt">여행 조건</label>
      <textarea
        ref={inputRef}
        id="travel-prompt"
        name="prompt"
        rows={1}
        placeholder={placeholder}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onScroll={onScroll}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing || event.key !== "Enter" || event.shiftKey) return;
          event.preventDefault();
          form.current?.requestSubmit();
        }}
      />
      <span ref={holder} className="prompt-placeholder" aria-hidden="true">
        <span ref={holderText} className="prompt-placeholder-text">
          {placeholder}
        </span>
      </span>
      <button className="send" type="submit" aria-label="여행 검색">
        <Img name="imgSendIcon.svg" />
      </button>
      <span ref={bar} className="prompt-scrollbar" aria-hidden="true">
        <span ref={thumb} className="prompt-scrollbar-thumb" />
      </span>
    </form>
  );
}
