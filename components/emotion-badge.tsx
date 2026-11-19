// 작성: 2026-11-19 11:51 KST
// 감정 표시. 색만으로 전달하지 않도록 감정 이름 글자와 강도 말(조금/꽤/많이), 채운 점 개수를 함께 보여준다.
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
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`size-2.5 rounded-full border-2 border-muted ${n <= intensity ? "bg-muted" : "bg-transparent"}`}
          />
        ))}
      </span>
      <span>
        <span className="sr-only">감정의 세기 3단계 중 {intensity}단계, </span>
        {INTENSITY_WORD[intensity]}
      </span>
    </span>
  );
}
