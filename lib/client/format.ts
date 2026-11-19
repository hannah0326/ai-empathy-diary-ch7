// 작성: 2026-11-19 11:46 KST
// 날짜·감정 표시 도우미. 시각은 항상 KST(Asia/Seoul)로 계산해서 서버·브라우저 결과가 같다(PRD 7.1절).
import type { Emotion, Intensity } from "@/lib/types";

const KST = "Asia/Seoul";

const dayFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: KST,
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
});
const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: KST,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const keyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: KST,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 같은 날(KST)인지 묶는 키. 예: 2026-11-19 */
export function kstDayKey(iso: string): string {
  return keyFormatter.format(new Date(iso));
}

/** 예: 2026년 11월 19일 목요일 */
export function formatKstDay(iso: string): string {
  return dayFormatter.format(new Date(iso));
}

/** 예: 오전 10:31 */
export function formatKstTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

/** 날짜와 시각을 함께. 예: 2026년 11월 19일 목요일 오전 10:31 */
export function formatKstDateTime(iso: string): string {
  return `${formatKstDay(iso)} ${formatKstTime(iso)}`;
}

/** 일기 목록을 KST 날짜별로 묶는다(입력 순서 유지). */
export function groupByKstDay<T extends { createdAt: string }>(items: T[]) {
  const groups: { key: string; label: string; items: T[] }[] = [];
  for (const item of items) {
    const key = kstDayKey(item.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, label: formatKstDay(item.createdAt), items: [item] });
  }
  return groups;
}

/** 감정 이름 → CSS 클래스(app/globals.css의 .emo-*) */
export const EMOTION_CLASS: Record<Emotion, string> = {
  기쁨: "emo-joy",
  설렘: "emo-flutter",
  평온: "emo-calm",
  슬픔: "emo-sad",
  외로움: "emo-lonely",
  불안: "emo-anxious",
  화남: "emo-angry",
  지침: "emo-tired",
};

/** 강도 → 말(5단계: 1 매우 약함 ~ 5 매우 강함) */
export const INTENSITY_WORD: Record<Intensity, string> = {
  1: "매우 약함",
  2: "약함",
  3: "보통",
  4: "강함",
  5: "매우 강함",
};
