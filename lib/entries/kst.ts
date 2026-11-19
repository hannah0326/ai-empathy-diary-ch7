// 작성: 2026-11-19 13:05 KST
// "하루"의 기준은 한국 시간(KST, UTC+9, 서머타임 없음) 날짜다.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 주어진 시각이 속한 KST 날짜의 시작(00:00 KST)을 돌려준다. */
export function startOfKstDay(now: Date): Date {
  const kstMs = now.getTime() + KST_OFFSET_MS;
  return new Date(Math.floor(kstMs / DAY_MS) * DAY_MS - KST_OFFSET_MS);
}
