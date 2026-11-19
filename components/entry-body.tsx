// 작성: 2026-11-19 11:54 KST
// 일기 한 편의 결과 표시(쓰기 결과와 기록 상세가 함께 쓴다).
// 규칙: crisis가 참이면 분석 상태와 무관하게 위기 카드를 먼저 보여준다(PRD F5, 8.2절).
import { EmotionBadge, IntensityDots } from "@/components/emotion-badge";
import { CrisisCard } from "@/components/crisis-card";
import { InfoBox } from "@/components/notices";
import type { Entry } from "@/lib/types";

export function EntryBody({ entry, headingLevel = 2 }: { entry: Entry; headingLevel?: 2 | 3 }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      {entry.crisis ? <CrisisCard headingLevel={headingLevel} /> : null}

      {entry.analysisStatus === "done" && entry.emotion && entry.intensity && entry.message ? (
        <section aria-label="AI가 읽은 마음" className="grid gap-3">
          <p className="flex flex-wrap items-center gap-3">
            <EmotionBadge emotion={entry.emotion} />
            <IntensityDots intensity={entry.intensity} />
          </p>
          <p className="whitespace-pre-wrap [overflow-wrap:anywhere] font-diary text-lg leading-loose text-ink">{entry.message}</p>
        </section>
      ) : null}

      {entry.analysisStatus === "failed" ? (
        <InfoBox title="분석을 하지 못했어요. 일기는 저장됐어요">
          지금은 AI가 답을 주지 못했어요. 지난 기록에서 이 일기를 다시 볼 수 있어요.
        </InfoBox>
      ) : null}

      {entry.analysisStatus === "pending" ? (
        <InfoBox title="아직 분석이 끝나지 않았어요. 일기는 저장됐어요">
          조금 뒤에 지난 기록에서 다시 열어 보면 결과가 보일 수 있어요.
        </InfoBox>
      ) : null}
    </div>
  );
}
