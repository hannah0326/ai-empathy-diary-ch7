// 작성: 2026-11-19 11:35 KST
// 모델 응답 문자열에서 JSON을 꺼내고 검증한다. 모델 응답은 그대로 믿지 않는다.
import { isEmotion, isIntensity, type Emotion, type Intensity } from "../types";
import { MAX_MESSAGE_LENGTH } from "./config";

export interface ParsedAnalysis {
  emotion: Emotion;
  intensity: Intensity;
  message: string;
  crisis: boolean;
}

/** 추론 태그와 코드펜스를 걷어낸다. */
function stripNoise(raw: string): string {
  return raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```(?:json|JSON)?/g, "")
    .trim();
}

/** 첫 `{`부터 짝이 맞는 `}`까지(문자열 안의 괄호는 무시)를 잘라 낸다. 없으면 null. */
export function extractFirstJsonObject(raw: string): string | null {
  const s = stripNoise(raw);
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

/** 문장 수. 마침표·물음표·느낌표·말줄임표 뒤의 공백이나 끝에서 끊는다. */
export function countSentences(message: string): number {
  return message
    .split(/(?<=[.!?。…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0).length;
}

/** 전화번호·웹 주소는 AI가 만들지 않는다(연락처는 화면이 고정값으로 보여 준다). */
function containsContactInfo(message: string): boolean {
  return /https?:\/\/|www\.|\d{2,4}-\d{3,4}-?\d{0,4}|(?<!\d)(?:109|112|119|1388|1577)(?!\d)/.test(message);
}

export type ParseOutcome =
  | { ok: true; value: ParsedAnalysis }
  | { ok: false; reason: "empty_response" | "invalid_format" };

/** 응답 문자열 → 검증된 결과. 실패 이유는 계약의 reason 값으로 돌려준다. */
export function parseAnalysis(raw: unknown): ParseOutcome {
  if (typeof raw !== "string" || raw.trim() === "") {
    return { ok: false, reason: "empty_response" };
  }
  const jsonText = extractFirstJsonObject(raw);
  if (!jsonText) return { ok: false, reason: "invalid_format" };

  let data: unknown;
  try {
    data = JSON.parse(jsonText);
  } catch {
    return { ok: false, reason: "invalid_format" };
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { ok: false, reason: "invalid_format" };
  }
  const { emotion, intensity, message, crisis } = data as Record<string, unknown>;

  if (!isEmotion(emotion)) return { ok: false, reason: "invalid_format" };
  if (!isIntensity(intensity)) return { ok: false, reason: "invalid_format" };
  if (typeof crisis !== "boolean") return { ok: false, reason: "invalid_format" };
  if (typeof message !== "string") return { ok: false, reason: "invalid_format" };

  const trimmed = message.trim();
  if (trimmed === "" || trimmed.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, reason: "invalid_format" };
  }
  const sentences = countSentences(trimmed);
  if (sentences < 2 || sentences > 4) return { ok: false, reason: "invalid_format" };
  if (containsContactInfo(trimmed)) return { ok: false, reason: "invalid_format" };

  return { ok: true, value: { emotion, intensity, message: trimmed, crisis } };
}
