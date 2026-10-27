/* eslint-disable @next/next/no-img-element -- 디자인 원본의 SVG 아이콘·이미지를 그대로 쓴다. */
// 클라이언트 컴포넌트 전용(React 훅 포함). 서버 컴포넌트에서는 import하지 않는다.
import { useRef, useState, useSyncExternalStore, type MouseEvent } from "react";

/** 디자인 자산은 public/main/에 평탄화해 두었다. */
export const asset = (name: string) => `/main/${name}`;

export function Img({ name, alt = "", className }: { name: string; alt?: string; className?: string }) {
  return <img className={className} src={asset(name)} alt={alt} />;
}

const MOBILE_QUERY = "(max-width: 599px)";

/** 모바일 시안에서만 달라지는 placeholder 등에 쓴다. 서버 렌더링은 데스크톱 기준. */
export function useIsMobile() {
  return useSyncExternalStore(
    (onChange) => {
      const media = matchMedia(MOBILE_QUERY);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => matchMedia(MOBILE_QUERY).matches,
    () => false,
  );
}

export const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const closingDialogs = new WeakMap<HTMLDialogElement, Promise<void>>();

/**
 * 닫힘 애니메이션(login-fade-out)이 끝난 뒤 dialog를 닫는다. minWidth보다 좁거나 동작 줄이기 설정이면 바로 닫는다.
 * 로그인·AI 검색 다이얼로그가 함께 쓴다.
 */
export function closeDialogAnimated(dialog: HTMLDialogElement | null, minWidth: number) {
  if (!dialog?.open) return Promise.resolve();
  const pending = closingDialogs.get(dialog);
  if (pending) return pending;
  if (!matchMedia(`(min-width: ${minWidth}px)`).matches || prefersReducedMotion()) {
    dialog.close();
    return Promise.resolve();
  }
  const closing = new Promise<void>((resolve) => {
    const finish = () => {
      window.clearTimeout(timer);
      dialog.removeEventListener("animationend", onEnd);
      dialog.close();
      dialog.classList.remove("is-closing");
      closingDialogs.delete(dialog);
      resolve();
    };
    const onEnd = (event: AnimationEvent) => {
      if (event.target === dialog && event.animationName === "login-fade-out") finish();
    };
    const timer = window.setTimeout(finish, 260);
    dialog.addEventListener("animationend", onEnd);
    dialog.classList.add("is-closing");
  });
  closingDialogs.set(dialog, closing);
  return closing;
}

/** dialog 바깥(backdrop)을 눌렀을 때만 true. */
export function isBackdropClick(event: MouseEvent<HTMLDialogElement>) {
  if (event.target !== event.currentTarget) return false;
  const r = event.currentTarget.getBoundingClientRect();
  return event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom;
}

export function useToast() {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const timer = useRef<number>(undefined);

  function notify(text: string) {
    setMessage(text);
    setVisible(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setVisible(false), 2500);
  }

  const toast = (
    <div className={`toast${visible ? " visible" : ""}`} role="status" aria-live="polite">
      {message}
    </div>
  );

  return { notify, toast };
}

const DETAIL_PLACEHOLDER = "여행 상품 상세 정보가 연결될 영역입니다.";

type DialogContent = { title: string; body: string; items?: string[] };

/** 안내 다이얼로그. 디자인 원본처럼 열린 상태에서 내용만 바꿔 재사용한다. */
export function useInfoDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const [content, setContent] = useState<DialogContent>({ title: "", body: "" });

  function show(title: string, body = "", items?: string[]) {
    setContent({ title, body, items });
    if (!ref.current?.open) ref.current?.showModal();
  }

  const dialog = (
    <dialog ref={ref} onClick={(event) => isBackdropClick(event) && ref.current?.close()}>
      <button className="dialog-close" type="button" aria-label="닫기" onClick={() => ref.current?.close()}>
        ×
      </button>
      <div>
        <h2 className="dialog-title">{content.title}</h2>
        {content.body && <p className="dialog-body">{content.body}</p>}
        {content.items && (
          <div className="dialog-list">
            {content.items.map((item) => (
              <button key={item} type="button" onClick={() => show(item, DETAIL_PLACEHOLDER)}>
                {item}
              </button>
            ))}
          </div>
        )}
      </div>
    </dialog>
  );

  return { show, dialog };
}
