// 작성: 2026-11-19 12:03 KST
// 지난 기록: 날짜별(KST) 목록, 감정 표시, 20건씩 "더 보기", 로딩·빈 기록·오류 상태.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { EmotionPill } from "@/components/emotion-badge";
import { CrisisCard } from "@/components/crisis-card";
import { ErrorBox, LoadingNote, primaryButtonClass, secondaryButtonClass } from "@/components/notices";
import { entriesClient, type ApiFailureKind, type EntriesClient } from "@/lib/client";
import { formatKstTime, groupByKstDay } from "@/lib/client/format";
import type { Entry } from "@/lib/types";

interface Props {
  client?: EntriesClient;
  /** 상세 화면 주소를 만든다. 미리보기에서는 다른 주소로 바꿀 수 있다. */
  hrefFor?: (id: string) => string;
  onUnauthorized?: () => void;
}

type LoadError = { kind: ApiFailureKind; message: string };

export function EntryList({ client = entriesClient, hrefFor = (id) => `/entries/${id}`, onUnauthorized }: Props) {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // 첫 쪽 불러오는 중
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<LoadError | null>(null); // 첫 쪽 오류
  const [moreError, setMoreError] = useState<LoadError | null>(null); // 더 보기 오류(이미 불러온 목록은 유지)
  // 더 보기 뒤 새로 붙은 첫 항목(초점 이동용)
  const [firstNewId, setFirstNewId] = useState<string | null>(null);
  const firstNewRef = useRef<HTMLButtonElement>(null);

  const handleUnauthorized = useCallback(() => {
    if (onUnauthorized) onUnauthorized();
    else router.replace("/login");
  }, [onUnauthorized, router]);

  const loadFirst = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await client.listEntries(null);
    setLoading(false);
    if (!res.ok) {
      if (res.kind === "unauthorized") return handleUnauthorized();
      return setError({ kind: res.kind, message: res.message });
    }
    setEntries(res.data.entries);
    setNextCursor(res.data.nextCursor);
  }, [client, handleUnauthorized]);

  useEffect(() => {
    // 첫 쪽은 마운트 직후 한 번 불러온다(비동기 호출 뒤에 상태가 바뀐다).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFirst();
  }, [loadFirst]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setMoreError(null);
    const res = await client.listEntries(nextCursor);
    setLoadingMore(false);
    if (!res.ok) {
      if (res.kind === "unauthorized") return handleUnauthorized();
      return setMoreError({ kind: res.kind, message: res.message });
    }
    const seen = new Set(entries.map((e) => e.id));
    const added = res.data.entries.filter((e) => !seen.has(e.id)); // 겹쳐 온 일기는 한 번만
    setEntries((prev) => [...prev, ...added]);
    setNextCursor(res.data.nextCursor);
    setFirstNewId(added[0]?.id ?? null);
  }

  // 더 보기 뒤에는 새로 붙은 첫 항목으로 초점을 옮겨 키보드 사용자가 길을 잃지 않게 한다.
  useEffect(() => {
    if (firstNewId) firstNewRef.current?.focus();
  }, [firstNewId]);

  if (loading) {
    return <LoadingNote title="기록을 불러오고 있어요" />;
  }

  if (error) {
    return (
      <ErrorBox
        title="기록을 불러오지 못했어요"
        action={
          <button type="button" onClick={() => void loadFirst()} className={secondaryButtonClass}>
            다시 불러오기
          </button>
        }
      >
        {error.message}
      </ErrorBox>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-paper border border-dashed border-line bg-card p-8 text-center">
        <p className="font-diary text-xl font-bold text-ink">아직 쓴 일기가 없어요</p>
        <p className="mt-2 text-muted">오늘 있었던 일을 한 줄로 적어 보세요. 첫 페이지가 시작돼요.</p>
        <Link href="/" className={`${primaryButtonClass} mt-5`}>
          일기 쓰러 가기
        </Link>
      </div>
    );
  }

  const groups = groupByKstDay(entries);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-8">
      {groups.map((group) => (
        <section key={group.key} className="min-w-0" aria-labelledby={`day-${group.key}`}>
          <h2
            id={`day-${group.key}`}
            className="border-b border-dashed border-line pb-2 font-diary text-lg font-bold text-ink"
          >
            {group.label}
          </h2>
          <ul className="mt-4 grid grid-cols-1 gap-4">
            {group.items.map((entry) => (
              <li key={entry.id} className="min-w-0">
                <EntryRow
                  entry={entry}
                  href={hrefFor(entry.id)}
                  toggleRef={entry.id === firstNewId ? firstNewRef : undefined}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {moreError ? <ErrorBox title="더 불러오지 못했어요">{moreError.message}</ErrorBox> : null}

      {nextCursor ? (
        <div className="flex justify-center">
          <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className={secondaryButtonClass}>
            {loadingMore ? "불러오는 중…" : moreError ? "다시 시도" : "더 보기"}
          </button>
        </div>
      ) : (
        <p className="text-center text-sm text-muted">여기까지가 모든 기록이에요.</p>
      )}
      <p className="sr-only" role="status">
        {loadingMore ? "기록을 더 불러오는 중" : `기록 ${entries.length}건을 보고 있어요`}
      </p>
    </div>
  );
}

/** 일기 카드: 시각 + 감정 알약, 내용, 접고 펼치는 공감 메시지(위기면 위기 카드와 연락처도), 자세히 보기 링크. */
function EntryRow({
  entry,
  href,
  toggleRef,
}: {
  entry: Entry;
  href: string;
  toggleRef?: React.Ref<HTMLButtonElement>;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const label = entry.crisis ? "공감 메시지와 상담 연락처" : "공감 메시지";

  return (
    <article className="min-w-0 rounded-3xl border border-line bg-card p-5 shadow-paper sm:p-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <time dateTime={entry.createdAt} className="text-sm font-medium text-muted">
          {formatKstTime(entry.createdAt)}
        </time>
        {entry.analysisStatus === "done" && entry.emotion ? (
          <EmotionPill emotion={entry.emotion} intensity={entry.intensity} />
        ) : (
          <span className="rounded-full border border-line px-3 py-1 text-sm text-muted">
            {entry.analysisStatus === "failed" ? "분석 못 함" : "분석 전"}
          </span>
        )}
      </div>

      <p
        className={`mt-3 min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere] font-diary text-lg leading-relaxed text-ink ${
          open ? "" : "line-clamp-3"
        }`}
      >
        {entry.content}
      </p>

      <button
        type="button"
        ref={toggleRef}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-medium text-accent hover:underline"
      >
        <span aria-hidden="true" className={`inline-block transition-transform ${open ? "rotate-180" : ""}`}>
          ⌄
        </span>
        {open ? "접기" : `${label} 보기`}
      </button>

      <div id={panelId} hidden={!open} className="min-w-0">
        {open ? (
          <div className="mt-2 grid min-w-0 grid-cols-1 gap-4 border-t border-dashed border-line pt-4">
            {entry.crisis ? <CrisisCard headingLevel={3} /> : null}
            {entry.analysisStatus === "done" && entry.message ? (
              <p className="whitespace-pre-wrap [overflow-wrap:anywhere] font-diary text-base leading-loose text-ink">
                {entry.message}
              </p>
            ) : null}
            {entry.analysisStatus === "failed" ? (
              <p className="text-sm text-muted">분석을 하지 못했어요. 일기는 저장돼 있어요.</p>
            ) : null}
            {entry.analysisStatus === "pending" ? (
              <p className="text-sm text-muted">아직 분석이 끝나지 않았어요. 조금 뒤에 다시 열어 보세요.</p>
            ) : null}
            <p>
              <Link
                href={href}
                aria-label={`${formatKstTime(entry.createdAt)} 일기 자세히 보기(삭제는 여기서)`}
                className="text-sm text-muted underline underline-offset-4 hover:text-ink"
              >
                자세히 보기
              </Link>
            </p>
          </div>
        ) : null}
      </div>
    </article>
  );
}
