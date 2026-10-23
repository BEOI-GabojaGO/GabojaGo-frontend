"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ComponentProps, type FormEvent } from "react";
import { Img, isBackdropClick, prefersReducedMotion } from "@/components/main/main-ui";
import { readErrorMessage } from "@/lib/auth-client";

type View = "login" | "signup";
/** 입력칸 id → 그 아래에 보여 줄 오류 문구. */
type FieldErrors = Partial<Record<string, string>>;

const SERVER_DOWN = "서버에 연결할 수 없습니다. 백엔드 서버 상태를 확인해 주세요.";

function postAuth(path: string, body: object) {
  return fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

/** 이메일 형식·빈 값 오류. 브라우저 type="email" 검증을 그대로 쓴다. */
function emailError(input: HTMLInputElement) {
  if (input.validity.valid) return "";
  return input.value.trim() ? "올바른 이메일 주소를 입력해 주세요." : "이메일을 입력해 주세요.";
}

/**
 * 헤더 로그인 버튼 + 로그인·회원가입 다이얼로그(시안 Sign In). 로그인 상태면 위시리스트·내 정보 링크를 보여 준다.
 * 회원가입은 POST /api/auth/signup 성공 후 같은 값으로 로그인까지 한다("회원가입하고 항공권 찾기").
 */
export function LoginDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closing = useRef<Promise<void> | null>(null);
  const [view, setView] = useState<View>("login");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  // 토큰은 HttpOnly 쿠키라 JS에서 볼 수 없으므로 /api/users/me 응답으로 로그인 여부를 판단한다.
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/users/me", { cache: "no-store", signal: controller.signal })
      .then((response) => setLoggedIn(response.ok))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  function showView(next: View, message = "") {
    setView(next);
    setErrors({});
    setFeedback(message);
    const dialog = ref.current;
    if (!dialog) return;
    dialog.scrollTop = 0;
    // 화면이 바뀐 걸 스크린리더가 알 수 있게 제목으로 포커스를 옮긴다.
    if (dialog.open) requestAnimationFrame(() => dialog.querySelector<HTMLElement>(`#${next}-title`)?.focus({ preventScroll: true }));
  }

  function open() {
    showView("login");
    ref.current?.showModal();
    document.body.classList.add("login-open");
  }

  // 데스크톱·태블릿은 닫힘 애니메이션(login-fade-out)이 끝난 뒤 닫는다.
  function close() {
    const dialog = ref.current;
    if (!dialog?.open) return Promise.resolve();
    if (closing.current) return closing.current;
    if (!matchMedia("(min-width: 600px)").matches || prefersReducedMotion()) {
      dialog.close();
      return Promise.resolve();
    }
    closing.current = new Promise<void>((resolve) => {
      const finish = () => {
        window.clearTimeout(timer);
        dialog.removeEventListener("animationend", onEnd);
        dialog.close();
        dialog.classList.remove("is-closing");
        closing.current = null;
        resolve();
      };
      const onEnd = (event: AnimationEvent) => {
        if (event.target === dialog && event.animationName === "login-fade-out") finish();
      };
      const timer = window.setTimeout(finish, 260);
      dialog.addEventListener("animationend", onEnd);
      dialog.classList.add("is-closing");
    });
    return closing.current;
  }

  /** 첫 번째로 틀린 칸에만 오류를 보여 주고 그 칸으로 포커스를 옮긴다(시안). */
  function invalid(input: HTMLInputElement, message: string) {
    setErrors({ [input.id]: message });
    input.focus();
  }

  async function login(email: string, password: string) {
    const response = await postAuth("/api/auth/login", { email, password });
    if (!response.ok) return readErrorMessage(response);
    await close();
    setLoggedIn(true);
    return "";
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = form.elements.namedItem("email") as HTMLInputElement;
    const password = form.elements.namedItem("password") as HTMLInputElement;

    if (emailError(email)) return invalid(email, emailError(email));
    if (!password.value) return invalid(password, "비밀번호를 입력해 주세요.");

    setPending(true);
    setFeedback("");
    try {
      const message = await login(email.value, password.value);
      if (message) setFeedback(message);
      else form.reset();
    } catch {
      setFeedback(SERVER_DOWN);
    } finally {
      setPending(false);
    }
  }

  async function submitSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
    const [email, nickname, password, confirmation] = ["email", "nickname", "password", "passwordConfirm"].map(field);

    if (emailError(email)) return invalid(email, emailError(email));
    if (!nickname.value.trim()) return invalid(nickname, "닉네임을 입력해 주세요.");
    if (!password.value) return invalid(password, "비밀번호를 입력해 주세요.");
    if (!confirmation.value) return invalid(confirmation, "비밀번호를 다시 입력해 주세요.");
    if (confirmation.value !== password.value) return invalid(confirmation, "비밀번호가 일치하지 않습니다.");

    setPending(true);
    setFeedback("");
    try {
      const response = await postAuth("/api/auth/signup", { email: email.value, password: password.value, nickname: nickname.value.trim() });
      if (!response.ok) {
        setFeedback(await readErrorMessage(response));
        return;
      }
      // 가입은 됐는데 자동 로그인만 실패하면 로그인 화면에서 다시 시도하게 한다.
      const message = await login(email.value, password.value);
      if (message) showView("login", "가입이 완료되었습니다. 로그인해 주세요.");
      else form.reset();
    } catch {
      setFeedback(SERVER_DOWN);
    } finally {
      setPending(false);
    }
  }

  function clearError() {
    setErrors({});
    setFeedback("");
  }

  const input = (id: string, props: ComponentProps<"input">) => (
    <>
      <input
        id={id}
        required
        aria-invalid={!!errors[id] || undefined}
        aria-describedby={`${id}-error`}
        onInput={clearError}
        {...props}
      />
      <p id={`${id}-error`} className="field-error" role="alert" aria-live="polite">
        {errors[id]}
      </p>
    </>
  );

  const header = (label: string) => (
    <div className="login-dialog-header">
      <span className="brand">
        가보자 <span>GO</span>
      </span>
      <button className="login-close" type="button" aria-label={`${label} 닫기`} onClick={() => void close()} />
    </div>
  );

  return (
    <>
      {loggedIn ? (
        <nav className="header-links" aria-label="내 계정">
          <Link className="login" href="/wishlist">
            위시리스트
          </Link>
          <Link className="login" href="/account">
            내 정보
          </Link>
        </nav>
      ) : (
        <button ref={trigger} className="login" type="button" aria-haspopup="dialog" aria-controls="login-dialog" onClick={open}>
          <Img name="imgIconLogin.svg" className="mobile-only" />
          로그인
        </button>
      )}

      <dialog
        ref={ref}
        id="login-dialog"
        className={`login-dialog${view === "signup" ? " signup-dialog" : ""}`}
        aria-labelledby={`${view}-title`}
        onCancel={(event) => {
          event.preventDefault();
          void close();
        }}
        onClose={() => {
          document.body.classList.remove("login-open");
          trigger.current?.focus();
        }}
        onClick={(event) => {
          if (isBackdropClick(event) && !matchMedia("(max-width: 599px)").matches) void close();
        }}
      >
        <div className="login-view" hidden={view !== "login"}>
          {header("로그인")}
          <h2 id="login-title" tabIndex={-1}>
            로그인
          </h2>
          <form className="login-form" noValidate onSubmit={submitLogin}>
            <div className="login-field">
              <label htmlFor="login-email">이메일</label>
              {input("login-email", { name: "email", type: "email", autoComplete: "username", inputMode: "email", placeholder: "501ljy@naver.com" })}
            </div>
            <div className="login-field login-password-field">
              <label htmlFor="login-password">비밀번호</label>
              {input("login-password", { name: "password", type: "password", autoComplete: "current-password", placeholder: "비밀번호를 입력해주세요" })}
            </div>
            <button className="login-submit" type="submit" disabled={pending}>
              {pending ? "로그인 중..." : "로그인"}
            </button>
          </form>
          <p className="login-signup">
            계정이 없으신가요?{" "}
            <button className="login-signup-link" type="button" onClick={() => showView("signup")}>
              회원가입
            </button>
          </p>
          <div className="login-social">
            <button className="login-google" type="button" onClick={() => setFeedback("Google 계정 인증 연결이 필요합니다.")}>
              <Img name="google-g.svg" />
              Google로 계속하기
            </button>
            <button className="login-kakao" type="button" onClick={() => setFeedback("카카오 계정 인증 연결이 필요합니다.")}>
              <Img name="kakao-talk.svg" />
              카카오로 계속하기
            </button>
          </div>
          <p className="login-feedback" role="status" aria-live="polite">
            {view === "login" && feedback}
          </p>
        </div>

        <div className="signup-view" hidden={view !== "signup"}>
          {header("회원가입")}
          <h2 id="signup-title" tabIndex={-1}>
            회원가입
          </h2>
          <form className="login-form signup-form" noValidate onSubmit={submitSignup}>
            <div className="signup-fields">
              <div className="signup-field">
                <label htmlFor="signup-email">이메일</label>
                {input("signup-email", { name: "email", type: "email", autoComplete: "email", inputMode: "email", placeholder: "501ljy@naver.com" })}
              </div>
              <div className="signup-field">
                <label htmlFor="signup-nickname">닉네임</label>
                {input("signup-nickname", { name: "nickname", type: "text", autoComplete: "nickname", placeholder: "닉네임을 입력해 주세요." })}
              </div>
              <div className="signup-field">
                <label htmlFor="signup-password">비밀번호</label>
                {input("signup-password", { name: "password", type: "password", autoComplete: "new-password", placeholder: "비밀번호를 입력해 주세요." })}
              </div>
              <div className="signup-field">
                <label htmlFor="signup-password-confirm">비밀번호 확인</label>
                {input("signup-password-confirm", { name: "passwordConfirm", type: "password", autoComplete: "new-password", placeholder: "비밀번호를 한번 더 입력해 주세요." })}
              </div>
            </div>
            <button className="login-submit signup-submit" type="submit" disabled={pending}>
              {pending ? "가입하는 중..." : "회원가입하고 항공권 찾기"}
            </button>
          </form>
          <p className="login-signup signup-login">
            이미 계정이 있으신가요?{" "}
            <button className="login-signup-link signup-login-link" type="button" onClick={() => showView("login")}>
              로그인
            </button>
          </p>
          <p className="signup-feedback" role="status" aria-live="polite">
            {view === "signup" && feedback}
          </p>
        </div>
      </dialog>
    </>
  );
}
