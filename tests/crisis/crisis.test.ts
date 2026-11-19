// 작성: 2026-11-19 13:20 KST
// 위기 키워드 검사 시험(PRD 8.1절 범주별 표현과 관용 표현 제외).
import { describe, expect, it } from "vitest";
import { detectCrisisKeyword, mergeCrisis } from "@/lib/crisis";

describe("detectCrisisKeyword: 위기 표현", () => {
  const crisisCases = [
    "요즘 너무 힘들어서 죽고 싶다",
    "죽어버리고 싶다는 생각이 든다",
    "자살을 생각했다",
    "목숨을 끊고 싶다",
    "극단적인 선택을 할 것 같다",
    "죽으려고 약을 모았다",
    "오늘 밤 끝낼 거야",
    "손목을 긋고 싶다",
    "자해를 했다",
    "스스로 해치고 싶다",
    "그냥 사라지고 싶다",
    "없어지고 싶다",
    "내일 깨어나지 않았으면 좋겠다",
    "내가 없는 게 낫겠다",
    "살 이유가 없다",
    "살기 싫다",
    "다 끝내고 싶다",
    "모든 걸 놓고 싶다",
    "죽 고 싶 다", // 띄어쓰기 변형
  ];
  it.each(crisisCases)("위기: %s", (text) => {
    expect(detectCrisisKeyword(text)).toBe(true);
  });

  it("과거형·남의 이야기도 안전 우선으로 위기로 본다", () => {
    expect(detectCrisisKeyword("친구가 죽고 싶다고 했다")).toBe(true);
  });
});

describe("detectCrisisKeyword: 관용 표현과 평범한 문장", () => {
  const safeCases = [
    "배고파 죽겠다",
    "웃겨 죽는 줄 알았다",
    "피곤해 죽겠다",
    "더워 죽겠네",
    "보고 싶어 죽겠다",
    "오늘 발표를 무사히 마쳤다",
    "점심으로 김치찌개를 먹었다",
    "",
  ];
  it.each(safeCases)("위기 아님: %s", (text) => {
    expect(detectCrisisKeyword(text)).toBe(false);
  });

  it("관용 표현 옆에 실제 위기 표현이 있으면 위기다", () => {
    expect(detectCrisisKeyword("배고파 죽겠는데 사라지고 싶다")).toBe(true);
  });
});

describe("mergeCrisis", () => {
  it("키워드 OR AI", () => {
    expect(mergeCrisis(false, false)).toBe(false);
    expect(mergeCrisis(true, false)).toBe(true);
    expect(mergeCrisis(false, true)).toBe(true);
    expect(mergeCrisis(true, true)).toBe(true);
  });
  it("AI가 실패해도(null) 키워드 결과가 그대로 간다", () => {
    expect(mergeCrisis(true, null)).toBe(true);
    expect(mergeCrisis(false, null)).toBe(false);
  });
});
