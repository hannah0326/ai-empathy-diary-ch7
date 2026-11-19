// 작성: 2026-11-19 11:50 KST
// 위기 안내 카드. entry.crisis가 참이면 분석 상태(done/failed/pending)와 상관없이 항상 보여준다.
// 문구와 연락처는 lib/contacts.ts의 고정 데이터만 쓴다(AI가 만든 내용이 아니다).
import { CONTACTS, CRISIS_DISCLAIMER, CRISIS_MESSAGE } from "@/lib/contacts";

export function CrisisCard({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section
      aria-labelledby="crisis-card-title"
      className="rounded-paper border-2 border-crisis-border bg-crisis-bg p-5 shadow-paper"
    >
      <Heading id="crisis-card-title" className="font-diary text-xl font-bold text-ink">
        도움을 받을 수 있는 곳
      </Heading>
      <p className="mt-3 text-base leading-relaxed text-ink">{CRISIS_MESSAGE}</p>

      <ul className="mt-4 grid gap-3">
        {CONTACTS.map((c) => (
          <li key={c.tel} className="rounded-2xl border border-line bg-card p-4">
            <p className="text-sm font-medium text-ink">{c.name}</p>
            <a
              href={`tel:${c.tel}`}
              aria-label={`${c.name} ${c.display}번으로 전화 걸기`}
              className="mt-1 inline-flex min-h-12 items-center rounded-xl bg-accent px-5 text-2xl font-bold tracking-wide text-on-accent hover:bg-accent-hover"
            >
              {c.display}
            </a>
            <p className="mt-1 text-sm text-muted">{c.description}</p>
            {c.note ? <p className="mt-1 text-sm font-medium text-ink">{c.note}</p> : null}
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm text-muted">{CRISIS_DISCLAIMER}</p>
    </section>
  );
}
