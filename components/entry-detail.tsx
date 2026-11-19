// 작성: 2026-11-19 12:08 KST
// 기록 상세: 내용·감정·강도·공감 메시지, 확인 창을 거친 삭제(F7).
// 삭제 404는 이미 없는 것이므로 성공으로 처리한다(lib/client가 맞춰서 돌려준다).
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { EntryBody } from "@/components/entry-body";
import { ErrorBox, LoadingNote, secondaryButtonClass } from "@/components/notices";
import { entriesClient, type ApiFailureKind, type EntriesClient } from "@/lib/client";
import { formatKstDateTime } from "@/lib/client/format";
import type { Entry } from "@/lib/types";

interface Props {
  id: string;
  client?: EntriesClient;
  /** 삭제 뒤 이동. 기본은 /entries. 미리보기에서는 바꿀 수 있다. */
  onDeleted?: () => void;
  onUnauthorized?: () => void;
  /** 목록으로 돌아가는 링크 주소 */
  listHref?: string;
}

export function EntryDetail({ id, client = entriesClient, onDeleted, onUnauthorized, listHref = "/entries" }: Props) {
  const router = useRouter();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ kind: ApiFailureKind; message: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const handleUnauthorized = useCallback(() => {
    if (onUnauthorized) onUnauthorized();
    else router.replace("/login");
  }, [onUnauthorized, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await client.getEntry(id);
    setLoading(false);
    if (!res.ok) {
      if (res.kind === "unauthorized") return handleUnauthorized();
      return setError({ kind: res.kind, message: res.message });
    }
    setEntry(res.data.entry);
  }, [client, id, handleUnauthorized]);

  useEffect(() => {
    // 마운트 직후 한 번 불러온다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // 확인 창은 <dialog>의 모달 기능을 쓴다(초점 가두기, Esc로 닫기, 닫으면 단추로 초점 복귀).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (confirming && !dialog.open) dialog.showModal();
    if (!confirming && dialog.open) dialog.close();
  }, [confirming, entry]);

  async function remove() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    const res = await client.deleteEntry(id);
    setDeleting(false);
    if (res.ok) {
      setConfirming(false);
      if (onDeleted) onDeleted();
      else router.replace("/entries");
      return;
    }
    if (res.kind === "unauthorized") {
      setConfirming(false);
      return handleUnauthorized();
    }
    setDeleteError(res.message);
  }

  if (loading) return <LoadingNote title="일기를 불러오고 있어요" />;

  if (error) {
    if (error.kind === "not_found") {
      return (
        <div className="rounded-paper border border-dashed border-line bg-card p-8 text-center">
          <p className="font-diary text-xl font-bold text-ink">이 일기를 찾을 수 없어요</p>
          <p className="mt-2 text-muted">이미 지워졌거나 없는 일기예요.</p>
          <Link href={listHref} className={`${secondaryButtonClass} mt-5`}>
            지난 기록으로 돌아가기
          </Link>
        </div>
      );
    }
    return (
      <ErrorBox
        title="일기를 불러오지 못했어요"
        action={
          <button type="button" onClick={() => void load()} className={secondaryButtonClass}>
            다시 불러오기
          </button>
        }
      >
        {error.message}
      </ErrorBox>
    );
  }

  if (!entry) return null;

  return (
    <article className="grid gap-5">
      <header className="rounded-paper border border-line bg-card p-5 shadow-paper">
        <p className="text-sm text-muted">{formatKstDateTime(entry.createdAt)}</p>
        <p className="mt-2 font-diary text-xl leading-relaxed text-ink">{entry.content}</p>
      </header>

      <EntryBody entry={entry} headingLevel={2} />

      {entry.analysisStatus === "pending" ? (
        <div>
          <button type="button" onClick={() => void load()} className={secondaryButtonClass}>
            결과 다시 확인하기
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <Link href={listHref} className="font-medium text-accent underline underline-offset-4">
          지난 기록으로
        </Link>
        <button
          type="button"
          onClick={() => {
            setDeleteError(null);
            setConfirming(true);
          }}
          className="inline-flex min-h-11 items-center rounded-xl border border-danger px-4 text-sm font-medium text-danger hover:bg-danger-bg"
        >
          이 일기 지우기
        </button>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="delete-title"
        aria-describedby="delete-desc"
        onClose={() => setConfirming(false)}
        className="m-auto w-[min(92vw,26rem)] rounded-paper border border-line bg-card p-6 text-ink shadow-paper backdrop:bg-black/50"
      >
        <h2 id="delete-title" className="font-diary text-xl font-bold">
          이 일기를 지울까요?
        </h2>
        <p id="delete-desc" className="mt-2 text-muted">
          지우면 다시 되돌릴 수 없어요. 일기와 공감 메시지가 모두 사라져요.
        </p>
        {deleteError ? (
          <div className="mt-3">
            <ErrorBox title="지우지 못했어요">{deleteError}</ErrorBox>
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            autoFocus
            onClick={() => setConfirming(false)}
            disabled={deleting}
            className={secondaryButtonClass}
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void remove()}
            disabled={deleting}
            className="inline-flex min-h-11 items-center rounded-xl bg-danger px-4 text-sm font-bold text-paper hover:opacity-90 disabled:opacity-60"
          >
            {deleting ? "지우는 중…" : "지우기"}
          </button>
        </div>
      </dialog>
    </article>
  );
}
