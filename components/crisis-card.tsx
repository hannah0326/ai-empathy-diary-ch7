// 작성: 2026-11-19 11:50 KST (촘촘한 목록으로 축소: 2026-11-19 KST)
// 위기 안내 카드. entry.crisis가 참이면 분석 상태(done/failed/pending)와 상관없이 항상 보여준다.
// 문구와 연락처는 lib/contacts.ts의 고정 데이터만 쓴다(AI가 만든 내용이 아니다).
import { useId } from "react";
import { CONTACTS, CRISIS_DISCLAIMER, CRISIS_MESSAGE } from "@/lib/contacts";

export function CrisisCard({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  // 목록에 위기 카드가 여러 장 생길 수 있어 id를 카드마다 따로 만든다.
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="min-w-0 rounded-2xl border-2 border-crisis-border bg-crisis-bg p-3 shadow-paper"
    >
      <Heading id={titleId} className="font-diary text-lg font-bold text-ink">
        도움을 받을 수 있는 곳
      </Heading>
      <p className="mt-1 text-sm leading-snug text-ink">{CRISIS_MESSAGE}</p>

      {/* 연락처: 이름·설명은 왼쪽, 전화 링크는 오른쪽(터치 영역 44px). 칸마다 카드 대신 구분선만 쓴다. */}
      <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-card">
        {CONTACTS.map((c) => (
          <li key={c.tel} className="flex items-center justify-between gap-3 px-3 py-1.5">
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight text-ink">{c.name}</p>
              <p className="text-xs leading-tight text-muted">{c.description}</p>
              {c.note ? <p className="text-xs font-medium leading-tight text-ink">{c.note}</p> : null}
            </div>
            <a
              href={`tel:${c.tel}`}
              aria-label={`${c.name} ${c.display}번으로 전화 걸기`}
              className="inline-flex min-h-11 shrink-0 items-center rounded-lg bg-accent px-3 text-base font-bold tracking-wide text-on-accent hover:bg-accent-hover"
            >
              {c.display}
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-2 text-xs text-muted">{CRISIS_DISCLAIMER}</p>
    </section>
  );
}
