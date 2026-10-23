"use client";

/* eslint-disable @next/next/no-img-element -- 디자인 원본의 소셜 로그인 아이콘을 그대로 쓴다. */
import { useRouter } from "next/navigation";
import { useState, type ComponentProps, type FormEvent } from "react";
import { readErrorMessage, safeNext } from "@/lib/auth-client";

export type AuthView = "login" | "signup";
/** 입력칸 id → 그 아래에 보여 줄 오류 문구. */
type FieldErrors = Partial<Record<string, string>>;

const SERVER_DOWN = "서버에 연결할 수 없습니다. 백엔드 서버 상태를 확인해 주세요.";
const EMAIL_EXAMPLE = "test123@gmail.com";

function postAuth(path: string, body: object) {
  return fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

/** 이메일 형식·빈 값 오류. 브라우저 type="email" 검증을 그대로 쓴다. */
function emailError(input: HTMLInputElement) {
  if (input.validity.valid) return "";
  return input.value.trim() ? "올바른 이메일 주소를 입력해 주세요." : "이메일을 입력해 주세요.";
}

type AuthFormsProps = {
  initialView?: AuthView;
  /** 로그인(가입 후 자동 로그인 포함)에 성공했을 때. */
  onSuccess: () => void | Promise<void>;
  onClose: () => void;
};

/**
 * 로그인·회원가입 화면(시안 Sign In). 메인 다이얼로그와 /login·/signup 페이지가 함께 쓴다.
 * 회원가입은 POST /api/auth/signup 성공 후 같은 값으로 로그인까지 한다("회원가입하고 항공권 찾기").
 * 보이는 화면 하나만 그려서 제목 id(auth-title)를 다이얼로그 aria-labelledby에 그대로 쓴다.
 */
export function AuthForms({ initialView = "login", onSuccess, onClose }: AuthFormsProps) {
  const [view, setView] = useState<AuthView>(initialView);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);

  function showView(next: AuthView, message = "") {
    setView(next);
    setErrors({});
    setFeedback(message);
    // 화면이 바뀐 걸 스크린리더가 알 수 있게 제목으로 포커스를 옮긴다.
    requestAnimationFrame(() => {
      const title = document.getElementById("auth-title");
      title?.closest(".login-dialog")?.scrollTo({ top: 0 });
      title?.focus({ preventScroll: true });
    });
  }

  /** 첫 번째로 틀린 칸에만 오류를 보여 주고 그 칸으로 포커스를 옮긴다(시안). */
  function invalid(input: HTMLInputElement, message: string) {
    setErrors({ [input.id]: message });
    input.focus();
  }

  async function login(email: string, password: string) {
    const response = await postAuth("/api/auth/login", { email, password });
    if (!response.ok) return readErrorMessage(response);
    await onSuccess();
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
      if (await login(email.value, password.value)) showView("login", "가입이 완료되었습니다. 로그인해 주세요.");
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

  const input = (id: string, props: ComponentProps<"input">) => {
    const shown = revealed === id;
    // 비밀번호 칸은 눈 버튼을 누르고 있는 동안만 글자를 보여 준다.
    const field = <input id={id} required aria-invalid={!!errors[id] || undefined} aria-describedby={`${id}-error`} onInput={clearError} {...props} type={shown ? "text" : props.type} />;
    return (
      <>
        {props.type === "password" ? (
          <div className="password-input">
            {field}
            <RevealButton target={id} shown={shown} onChange={(next) => setRevealed(next ? id : null)} />
          </div>
        ) : (
          field
        )}
        <p id={`${id}-error`} className="field-error" role="alert" aria-live="polite">
          {errors[id]}
        </p>
      </>
    );
  };

  const signup = view === "signup";

  return (
    <div className={signup ? "signup-view" : "login-view"}>
      <div className="login-dialog-header">
        <span className="brand">
          가보자 <span>GO</span>
        </span>
        <button className="login-close" type="button" aria-label={`${signup ? "회원가입" : "로그인"} 닫기`} onClick={onClose} />
      </div>
      <h2 id="auth-title" tabIndex={-1}>
        {signup ? "회원가입" : "로그인"}
      </h2>

      {signup ? (
        <form className="login-form signup-form" noValidate onSubmit={submitSignup}>
          <div className="signup-fields">
            <div className="signup-field">
              <label htmlFor="signup-email">이메일</label>
              {input("signup-email", { name: "email", type: "email", autoComplete: "email", inputMode: "email", placeholder: EMAIL_EXAMPLE })}
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
      ) : (
        <form className="login-form" noValidate onSubmit={submitLogin}>
          <div className="login-field">
            <label htmlFor="login-email">이메일</label>
            {input("login-email", { name: "email", type: "email", autoComplete: "username", inputMode: "email", placeholder: EMAIL_EXAMPLE })}
          </div>
          <div className="login-field login-password-field">
            <label htmlFor="login-password">비밀번호</label>
            {input("login-password", { name: "password", type: "password", autoComplete: "current-password", placeholder: "비밀번호를 입력해주세요" })}
          </div>
          <button className="login-submit" type="submit" disabled={pending}>
            {pending ? "로그인 중..." : "로그인"}
          </button>
        </form>
      )}

      {signup ? (
        <p className="login-signup signup-login">
          이미 계정이 있으신가요?{" "}
          <button className="login-signup-link signup-login-link" type="button" onClick={() => showView("login")}>
            로그인
          </button>
        </p>
      ) : (
        <>
          <p className="login-signup">
            계정이 없으신가요?{" "}
            <button className="login-signup-link" type="button" onClick={() => showView("signup")}>
              회원가입
            </button>
          </p>
          <div className="login-social">
            <button className="login-google" type="button" onClick={() => setFeedback("Google 계정 인증 연결이 필요합니다.")}>
              <img src="/main/google-g.svg" alt="" />
              Google로 계속하기
            </button>
            <button className="login-kakao" type="button" onClick={() => setFeedback("카카오 계정 인증 연결이 필요합니다.")}>
              <img src="/main/kakao-talk.svg" alt="" />
              카카오로 계속하기
            </button>
          </div>
        </>
      )}
      <p className={signup ? "signup-feedback" : "login-feedback"} role="status" aria-live="polite">
        {feedback}
      </p>
    </div>
  );
}

/**
 * 비밀번호 보기 버튼. 마우스·터치는 누르고 있는 동안, 키보드는 Space·Enter를 누르고 있는 동안만 보여 준다.
 * pointerdown 기본 동작을 막아 입력칸 포커스와 모바일 길게 누르기 메뉴를 지킨다.
 */
function RevealButton({ target, shown, onChange }: { target: string; shown: boolean; onChange: (shown: boolean) => void }) {
  const hide = () => onChange(false);
  return (
    <button
      className="password-toggle"
      type="button"
      aria-label="비밀번호 보기 (누르고 있는 동안)"
      aria-controls={target}
      aria-pressed={shown}
      onPointerDown={(event) => {
        event.preventDefault();
        onChange(true);
      }}
      onPointerUp={hide}
      onPointerLeave={hide}
      onPointerCancel={hide}
      onKeyDown={(event) => {
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        onChange(true);
      }}
      onKeyUp={hide}
      onBlur={hide}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
        {!shown && <path d="M4 4l16 16" />}
      </svg>
    </button>
  );
}

/** /login·/signup 페이지. 성공하면 next(같은 사이트 경로만) 또는 메인으로 간다. */
export function AuthPage({ view, next }: { view: AuthView; next?: string }) {
  const router = useRouter();
  return (
    <section className="login-dialog" aria-labelledby="auth-title">
      <AuthForms
        initialView={view}
        onSuccess={() => {
          router.replace(safeNext(next) ?? "/");
          router.refresh();
        }}
        // 바로 이 주소로 들어왔으면 돌아갈 곳이 없으니 메인으로 보낸다.
        onClose={() => (history.length > 1 ? router.back() : router.push("/"))}
      />
    </section>
  );
}
