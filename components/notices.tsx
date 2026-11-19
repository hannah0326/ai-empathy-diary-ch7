// 작성: 2026-11-19 11:53 KST
// 로딩·오류·안내 상자. 상태는 색뿐 아니라 제목 글자로도 알 수 있게 한다.
import type { ReactNode } from "react";

/** 기다림 표시(점 세 개가 깜빡임). 화면 낭독기에는 글로 읽힌다. */
export function LoadingNote({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div role="status" className="flex items-start gap-3 rounded-2xl border border-line bg-card p-4">
      <span aria-hidden="true" className="mt-2 inline-flex shrink-0 gap-1">
        {[0, 1, 2].map((n) => (
          <span
            key={n}
            className="size-2 rounded-full bg-accent"
            style={{ animation: `diary-pulse 1.2s ${n * 0.2}s infinite ease-in-out` }}
          />
        ))}
      </span>
      <div>
        <p className="font-medium text-ink">{title}</p>
        {children ? <p className="mt-1 text-sm text-muted">{children}</p> : null}
      </div>
    </div>
  );
}

/** 오류 상자. role="alert"라 나타나는 즉시 읽힌다. */
export function ErrorBox({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div role="alert" className="rounded-2xl border border-danger bg-danger-bg p-4">
      <p className="font-bold text-danger">{title}</p>
      {children ? <div className="mt-1 text-sm text-ink">{children}</div> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

/** 일반 안내 상자(오류가 아닌 상태: 분석 실패·대기 등) */
export function InfoBox({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-info-bg p-4">
      <p className="font-bold text-ink">{title}</p>
      {children ? <div className="mt-1 text-sm text-muted">{children}</div> : null}
    </div>
  );
}

/** 보조 단추 모양(테두리) 공통 클래스 */
export const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-card px-4 text-sm font-medium text-ink hover:bg-soft disabled:opacity-60";

/** 주요 단추 모양 공통 클래스 */
export const primaryButtonClass =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-6 text-base font-bold text-on-accent hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50";
