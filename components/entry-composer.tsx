// 작성: 2026-11-19 11:58 KST
// 일기 쓰기: 한 줄 입력(200자, 줄바꿈 막기), 남은 글자 수, 보내는 동안 대기 표시, 결과와 오류 상태.
// 로그인이 만료되면(401) 쓰던 글을 sessionStorage에 보관하고 /login으로 보낸다. 다시 돌아오면 복원한다.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EntryBody } from "@/components/entry-body";
import { ErrorBox, LoadingNote, primaryButtonClass } from "@/components/notices";
import { entriesClient, type ApiFailureKind, type EntriesClient } from "@/lib/client";
import { formatKstDateTime } from "@/lib/client/format";
import { MAX_CONTENT_LENGTH, type Entry } from "@/lib/types";

const DRAFT_KEY = "diary:draft";
/** 이 시간이 지나도 답이 없으면 "조금 더 걸려요" 안내를 덧붙인다 */
const SLOW_HINT_MS = 12_000;

interface Props {
  /** 기본은 lib/client의 스위치로 정해진 클라이언트. 미리보기에서는 가짜 클라이언트를 직접 넘긴다. */
  client?: EntriesClient;
  /** 로그인 만료 시 동작을 바꿀 때만 넘긴다(미리보기). 기본은 글을 보관하고 /login으로 이동. */
  onUnauthorized?: (draft: string) => void;
}

const chars = (s: string) => Array.from(s);
/** 줄바꿈은 공백으로 바꾸고, 글자(코드 포인트) 기준 200자로 자른다. */
const normalize = (s: string) => chars(s.replace(/[\r\n]+/g, " ")).slice(0, MAX_CONTENT_LENGTH).join("");

export function EntryComposer({ client = entriesClient, onUnauthorized }: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [slow, setSlow] = useState(false);
  const [result, setResult] = useState<Entry | null>(null);
  const [error, setError] = useState<{ kind: ApiFailureKind; message: string } | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // 로그인 만료로 보관해 둔 글이 있으면 되돌린다.
  useEffect(() => {
    try {
      const draft = sessionStorage.getItem(DRAFT_KEY);
      if (draft) {
        sessionStorage.removeItem(DRAFT_KEY);
        // 브라우저 저장소는 마운트 뒤에만 읽을 수 있어서(서버 렌더와 어긋남 방지) 효과 안에서 채운다.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setText(normalize(draft));
      }
    } catch {
      // 저장소를 쓸 수 없는 환경이면 복원만 건너뛴다.
    }
  }, []);

  // 보내는 동안 오래 걸리면 안내를 덧붙인다.
  useEffect(() => {
    if (!sending) return;
    const timer = setTimeout(() => setSlow(true), SLOW_HINT_MS);
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [sending]);

  const count = chars(text).length;
  const remaining = MAX_CONTENT_LENGTH - count;
  const empty = text.trim().length === 0;
  // 낭독기에는 끝이 가까울 때만 알린다(매 글자마다 읽히면 방해가 된다).
  const countAnnouncement = remaining <= 20 && (remaining % 5 === 0 || remaining < 5) ? `${remaining}자 남았어요` : "";

  async function submit() {
    if (sending || empty) return;
    const content = text.trim();
    setSending(true);
    setError(null);
    setResult(null);

    const res = await client.createEntry(content);
    setSending(false);

    if (res.ok) {
      setResult(res.data.entry);
      setText("");
      // 결과 제목으로 초점을 옮겨 낭독기와 키보드 사용자가 결과를 바로 알게 한다.
      requestAnimationFrame(() => resultHeadingRef.current?.focus());
      return;
    }

    if (res.kind === "unauthorized") {
      // 쓰던 글을 지키고 로그인 화면으로 보낸다.
      try {
        sessionStorage.setItem(DRAFT_KEY, content);
      } catch {
        // 보관할 수 없어도 이동은 한다.
      }
      if (onUnauthorized) onUnauthorized(content);
      else router.replace("/login");
      setError({ kind: res.kind, message: res.message });
      return;
    }

    // 그 밖의 오류: 쓴 글은 그대로 두고 이유를 보여준다.
    setError({ kind: res.kind, message: res.message });
  }

  return (
    <div className="grid gap-6">
      <form
        ref={formRef}
        aria-busy={sending}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="rounded-paper border border-line bg-card p-5 shadow-paper"
      >
        <label htmlFor="diary-text" className="font-diary text-xl font-bold text-ink">
          오늘 있었던 일을 한 줄로 적어 보세요
        </label>
        <textarea
          id="diary-text"
          name="content"
          rows={3}
          value={text}
          readOnly={sending}
          maxLength={MAX_CONTENT_LENGTH}
          placeholder="예: 오늘 발표를 무사히 마쳤다"
          aria-describedby="diary-count diary-help"
          onChange={(e) => setText(normalize(e.target.value))}
          onKeyDown={(e) => {
            // 한 줄만 쓰는 일기라 Enter는 줄바꿈 대신 보내기. 한글 조합 중(isComposing)인 Enter는 그대로 둔다.
            if (e.key === "Enter") {
              if (e.nativeEvent.isComposing) return;
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
          className="mt-3 block w-full resize-none rounded-2xl border border-line bg-paper px-4 py-3 font-diary text-lg leading-relaxed text-ink placeholder:text-muted read-only:opacity-70"
        />
        <div className="mt-2 flex items-start justify-between gap-3 text-sm">
          <p id="diary-help" className="text-muted">
            줄바꿈 없이 {MAX_CONTENT_LENGTH}자까지 쓸 수 있어요.
          </p>
          <p id="diary-count" className={remaining <= 20 ? "shrink-0 font-bold text-danger" : "shrink-0 text-muted"}>
            {remaining}자 남음
          </p>
        </div>
        <p className="sr-only" aria-live="polite">
          {countAnnouncement}
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="submit" disabled={sending || empty} className={`${primaryButtonClass} w-full sm:w-auto`}>
            {sending ? "마음을 읽는 중…" : "일기 보내기"}
          </button>
          {empty && !sending ? <p className="text-sm text-muted">내용을 적으면 보낼 수 있어요.</p> : null}
        </div>
      </form>

      {sending ? (
        <LoadingNote title="마음을 읽고 있어요">
          AI가 답을 쓰는 데 최대 45초쯤 걸릴 수 있어요. 이 화면을 그대로 두세요.
          {slow ? " 조금 더 걸리고 있어요. 곧 답이 올 거예요." : ""}
        </LoadingNote>
      ) : null}

      {error && error.kind !== "unauthorized" ? <ComposerError kind={error.kind} message={error.message} /> : null}
      {error && error.kind === "unauthorized" ? (
        <ErrorBox
          title="로그인이 만료됐어요"
          action={
            <Link href="/login" className="font-medium text-accent underline underline-offset-4">
              다시 로그인하러 가기
            </Link>
          }
        >
          쓰던 글은 보관해 두었어요. 다시 로그인하면 이 자리에 돌아와요.
        </ErrorBox>
      ) : null}

      {result ? (
        <section aria-labelledby="result-title" className="rounded-paper border border-line bg-card p-5 shadow-paper">
          <h2
            id="result-title"
            ref={resultHeadingRef}
            tabIndex={-1}
            className="font-diary text-xl font-bold text-ink focus:outline-none"
          >
            오늘의 일기
          </h2>
          <p className="mt-1 text-sm text-muted">{formatKstDateTime(result.createdAt)}</p>
          <blockquote className="my-4 border-l-4 border-accent pl-4 font-diary text-lg leading-relaxed text-ink">
            {result.content}
          </blockquote>
          <EntryBody entry={result} headingLevel={3} />
          <p className="mt-5">
            <Link href="/entries" className="font-medium text-accent underline underline-offset-4">
              지난 기록 보기
            </Link>
          </p>
        </section>
      ) : null}
    </div>
  );
}

/** 보내기 실패 안내. 종류마다 다음에 할 일을 알려 준다. */
function ComposerError({ kind, message }: { kind: ApiFailureKind; message: string }) {
  switch (kind) {
    case "daily_limit":
      return (
        <ErrorBox title="오늘은 여기까지예요">
          {message} 쓴 글은 그대로 남겨 두었어요.
        </ErrorBox>
      );
    case "validation":
      return <ErrorBox title="보낼 수 없어요">{message}</ErrorBox>;
    case "network":
    case "timeout":
      return (
        <ErrorBox
          title="답을 받지 못했어요"
          action={
            <Link href="/entries" className="font-medium text-accent underline underline-offset-4">
              지난 기록에서 확인하기
            </Link>
          }
        >
          {message} 일기는 이미 저장됐을 수 있어요. 지난 기록에서 확인해 보세요. 쓴 글은 그대로 남겨 두었어요.
        </ErrorBox>
      );
    default:
      return (
        <ErrorBox title="문제가 생겼어요">
          {message} 쓴 글은 그대로 남겨 두었으니 잠시 뒤 다시 보내 보세요.
        </ErrorBox>
      );
  }
}
