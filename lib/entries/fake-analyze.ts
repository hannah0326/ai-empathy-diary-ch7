// 작성: 2026-11-19 13:05 KST
// 2단계용 가짜 분석 함수(AnalyzeDiary 계약). 실제 AI(lib/ai)는 3단계에서 연결한다.
// 화면 시험을 돕기 위해 일기에 "[분석실패]"가 들어 있으면 두 모델 모두 실패한 것처럼 돌려준다.
// 일기 내용과 무관한 고정 결과이므로 AI 판단(crisis)은 항상 false다. 위기는 키워드 검사가 잡는다.
import type { AnalyzeDiary } from "@/lib/types";

export const fakeAnalyzeDiary: AnalyzeDiary = async (text) => {
  if (text.includes("[분석실패]")) {
    return { ok: false, reason: "all_models_failed" };
  }
  return {
    ok: true,
    emotion: "평온",
    intensity: 2,
    message:
      "오늘 하루도 마음을 적어 주셔서 고마워요. 어떤 하루였든 이렇게 돌아보는 시간이 소중해요. 지금 느끼는 감정을 있는 그대로 두어도 괜찮아요.",
    crisis: false,
    model: "fake-model",
  };
};
