// 작성: 2026-11-19 11:51 KST
// 감정 표시. 색만으로 전달하지 않도록 감정 이름 글자와 강도 글자 라벨(매우 약함~매우 강함), 채운 점 개수를 함께 보여준다.
import { EMOTION_CLASS, INTENSITY_WORD } from "@/lib/client/format";
import type { Emotion, Intensity } from "@/lib/types";

export function EmotionBadge({ emotion }: { emotion: Emotion }) {
  return (
    <span
      className={`${EMOTION_CLASS[emotion]} inline-flex items-center gap-2 rounded-full bg-(--emo-bg) px-3 py-1 text-sm font-medium text-ink`}
    >
      <span aria-hidden="true" className="size-2.5 rounded-full bg-(--emo-dot)" />
      {emotion}
    </span>
  );
}

export function IntensityDots({ intensity }: { intensity: Intensity }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted">
      <span aria-hidden="true" className="inline-flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={`size-2.5 rounded-full border-2 border-muted ${n <= intensity ? "bg-muted" : "bg-transparent"}`}
          />
        ))}
      </span>
      <span>
        <span className="sr-only">감정의 세기 5단계 중 {intensity}단계, </span>
        {INTENSITY_WORD[intensity]}
      </span>
    </span>
  );
}

/**
 * 기록 카드용 알약 배지: 감정 이름 + 강도 점 5개(채운 점 수 = 강도) + "강도 N/5" 글자.
 * 점은 장식이고, 정보는 글자("강도 N/5")와 낭독기용 말(매우 약함~매우 강함)로도 전한다.
 */
export function EmotionPill({ emotion, intensity }: { emotion: Emotion; intensity: Intensity | null }) {
  return (
    <span
      className={`${EMOTION_CLASS[emotion]} inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-full bg-(--emo-bg) px-3 py-1 text-sm text-ink`}
    >
      <span className="font-bold">{emotion}</span>
      {intensity ? (
        <>
          <span aria-hidden="true" className="inline-flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className={`size-2 rounded-full border border-(--emo-dot) ${n <= intensity ? "bg-(--emo-dot)" : "bg-transparent"}`}
              />
            ))}
          </span>
          <span>
            강도 {intensity}/5<span className="sr-only">, {INTENSITY_WORD[intensity]}</span>
          </span>
        </>
      ) : null}
    </span>
  );
}
