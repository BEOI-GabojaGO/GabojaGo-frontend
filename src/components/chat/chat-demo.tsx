"use client";

import Link from "next/link";
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { isDemoReady, type DemoConditions, updateDemoConditions } from "@/lib/chat-demo";

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
};

const INITIAL_MESSAGE: ChatMessage = {
  id: 1,
  role: "assistant",
  text: "어떤 여행을 계획 중이신가요? 목적지와 여행 가능한 달부터 편하게 말씀해 주세요.",
};

const EXAMPLES = [
  "10월에 오사카로 가고 싶어",
  "인천에서 3박 4일, 50만 원 이하",
  "주말이 포함되면 좋겠어",
];

function ConditionValue({ value }: { value?: string }) {
  return value ? (
    <span className="font-semibold text-slate-900">{value}</span>
  ) : (
    <span className="text-slate-400">아직 정하지 않았어요</span>
  );
}

export function ChatDemo() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [conditions, setConditions] = useState<DemoConditions>({});
  const [draft, setDraft] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const nextId = useRef(2);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ready = isDemoReady(conditions);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function appendMessage(role: ChatMessage["role"], text: string) {
    const id = nextId.current++;
    setMessages((previous) => [...previous, { id, role, text }]);
  }

  function sendMessage(raw: string) {
    const message = raw.trim();
    if (!message) return;

    const result = updateDemoConditions(conditions, message);
    setConditions(result.conditions);
    setConfirmed(false);
    setDraft("");
    const userId = nextId.current++;
    const assistantId = nextId.current++;
    setMessages((previous) => [
      ...previous,
      { id: userId, role: "user", text: message },
      { id: assistantId, role: "assistant", text: result.reply },
    ]);
    textareaRef.current?.focus();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(draft);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      sendMessage(draft);
    }
  }

  function resetChat() {
    setMessages([INITIAL_MESSAGE]);
    setConditions({});
    setDraft("");
    setConfirmed(false);
    textareaRef.current?.focus();
  }

  function confirmConditions() {
    if (!ready || confirmed) return;
    setConfirmed(true);
    appendMessage(
      "assistant",
      "조건 확인 화면까지 준비됐어요. 실제 항공권 검색은 백엔드 연결 후 사용할 수 있어요.",
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-4 pb-10 pt-5 text-slate-800 sm:px-6 sm:pt-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-3 font-black tracking-tight text-blue-700">
            <span className="grid size-10 place-items-center rounded-2xl bg-blue-600 text-sm text-white shadow-sm">GO</span>
            <span className="text-xl">가보자GO</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/" className="font-semibold text-slate-500 hover:text-blue-700">항공권 찾기</Link>
            <Link href="/account" className="font-semibold text-slate-500 hover:text-blue-700">내 계정</Link>
          </div>
        </header>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold tracking-[0.18em] text-blue-600">FLIGHT SEARCH CHAT</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">말로 찾는 항공권</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">여행 계획을 말하면 필요한 조건을 하나씩 모아볼게요.</p>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
            화면 데모 · AI/검색 미연결
          </span>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)] lg:items-start">
          <section aria-label="항공권 채팅 데모" className="flex min-h-[620px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_-38px_rgba(25,54,103,0.36)] lg:h-[calc(100vh-200px)] lg:min-h-[620px]">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-blue-50 text-sm font-black text-blue-600">AI</span>
                <div>
                  <p className="text-sm font-bold text-slate-900">여행 조건 도우미</p>
                  <p className="text-xs text-slate-400">현재는 예시 응답으로 동작해요</p>
                </div>
              </div>
              <button type="button" onClick={resetChat} className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                대화 초기화
              </button>
            </div>

            <div role="log" aria-live="polite" aria-relevant="additions text" className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-[radial-gradient(circle_at_top_left,#eff6ff,transparent_55%)] px-5 py-6 sm:px-6">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[75%] ${message.role === "user" ? "rounded-br-md bg-blue-600 text-white" : "rounded-bl-md border border-slate-100 bg-white text-slate-700"}`}>
                    {message.text}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            <div className="border-t border-slate-100 bg-white px-4 py-4 sm:px-6">
              <p className="mb-3 text-xs font-semibold text-slate-400">이런 말부터 시작해 보세요</p>
              <div className="mb-4 flex flex-wrap gap-2">
                {EXAMPLES.map((example) => (
                  <button key={example} type="button" onClick={() => sendMessage(example)} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-100">
                    {example}
                  </button>
                ))}
              </div>
              <form onSubmit={handleSubmit} className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                <label htmlFor="chat-message" className="sr-only">여행 조건 메시지</label>
                <textarea id="chat-message" ref={textareaRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} rows={2} maxLength={500} placeholder="예: 10월에 오사카로 3박 4일 가고 싶어" className="min-h-12 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400" />
                <button type="submit" disabled={!draft.trim()} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                  보내기
                </button>
              </form>
              <p className="mt-2 text-xs text-slate-400">Enter 전송 · Shift+Enter 줄바꿈 · 입력 내용은 서버에 저장되지 않아요</p>
            </div>
          </section>

          <aside aria-label="현재 검색 조건" className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-38px_rgba(25,54,103,0.36)]">
            <div className="mb-5 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold tracking-wider text-blue-600">YOUR TRIP</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">현재 여행 조건</h2>
              </div>
              <span className={`size-2.5 rounded-full ${ready ? "bg-emerald-500" : "bg-amber-400"}`} aria-hidden="true" />
            </div>
            <p className="mb-5 rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
              대화에서 찾은 조건을 임시로 표시합니다. 아직 AI 분석 결과나 실제 항공권 정보가 아니에요.
            </p>
            <dl className="divide-y divide-slate-100">
              <div className="flex justify-between gap-4 py-3 text-sm"><dt className="text-slate-500">출발지</dt><dd className="text-right"><ConditionValue value={conditions.origin} /></dd></div>
              <div className="flex justify-between gap-4 py-3 text-sm"><dt className="text-slate-500">목적지</dt><dd className="text-right"><ConditionValue value={conditions.destination} /></dd></div>
              <div className="flex justify-between gap-4 py-3 text-sm"><dt className="text-slate-500">여행 가능 기간</dt><dd className="text-right"><ConditionValue value={conditions.travelWindow} /></dd></div>
              <div className="flex justify-between gap-4 py-3 text-sm"><dt className="text-slate-500">일정</dt><dd className="text-right"><ConditionValue value={conditions.nights ? `${conditions.nights}박 ${conditions.nights + 1}일` : undefined} /></dd></div>
              <div className="flex justify-between gap-4 py-3 text-sm"><dt className="text-slate-500">최대 예산</dt><dd className="text-right"><ConditionValue value={conditions.maxBudgetKrw ? `${conditions.maxBudgetKrw.toLocaleString("ko-KR")}원` : undefined} /></dd></div>
              <div className="flex justify-between gap-4 py-3 text-sm"><dt className="text-slate-500">주말</dt><dd className="text-right"><ConditionValue value={conditions.weekendIncluded ? "포함 희망" : undefined} /></dd></div>
            </dl>
            <div className="mt-6 border-t border-slate-100 pt-5">
              <button type="button" disabled={!ready || confirmed} onClick={confirmConditions} className="w-full rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">
                {confirmed ? "조건 확인 완료" : "조건 확인하기"}
              </button>
              <p className="mt-3 text-center text-xs leading-5 text-slate-400">
                {ready ? "확인 버튼은 화면 데모이며 실제 검색을 실행하지 않아요." : "출발지·목적지·기간·일정을 알려주면 확인할 수 있어요."}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
