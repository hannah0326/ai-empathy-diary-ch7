// 작성: 2026-11-19 13:05 KST
// 위기 키워드 검사. AI가 실패해도 항상 실행한다(PLAN 꼭 지킬 규칙).
import { CRISIS_KEYWORDS, IDIOM_EXCLUSIONS } from "./keywords";

/** 공백·제로폭 문자를 모두 지우고 소문자로 맞춘다. "죽 고 싶다" 같은 띄어쓰기 변형도 잡는다. */
function normalize(text: string): string {
  return text.normalize("NFC").replace(/[\s​-‍﻿]+/g, "").toLowerCase();
}

/** 관용 표현을 지운 뒤 위기 키워드가 하나라도 있으면 true. */
export function detectCrisisKeyword(text: string): boolean {
  let normalized = normalize(text);
  for (const idiom of IDIOM_EXCLUSIONS) {
    normalized = normalized.split(idiom).join("");
  }
  return CRISIS_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

/** 최종 위기 여부 = 키워드 결과 OR AI 결과. AI가 실패하면(aiCrisis가 null) 키워드 결과만 쓴다. */
export function mergeCrisis(keywordCrisis: boolean, aiCrisis: boolean | null): boolean {
  return keywordCrisis || aiCrisis === true;
}
