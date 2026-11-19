// 작성: 2026-11-19 10:52 KST
import { describe, expect, it } from "vitest";
import { isValidCursor, isValidEntryId, validateContent } from "@/lib/validation";

describe("validateContent", () => {
  it("정상 일기는 통과한다", () => {
    expect(validateContent("오늘은 맑아서 기분이 좋았다")).toEqual({
      ok: true,
      content: "오늘은 맑아서 기분이 좋았다",
    });
  });

  it("줄 바꿈은 공백으로 바꾸고 앞뒤 공백은 지운다", () => {
    expect(validateContent("  가\n나\r\n다  ")).toEqual({ ok: true, content: "가 나 다" });
  });

  it("빈 문자열과 공백뿐인 입력은 거절한다", () => {
    expect(validateContent("").ok).toBe(false);
    expect(validateContent("   \n  ").ok).toBe(false);
  });

  it("문자열이 아니면 거절한다", () => {
    expect(validateContent(undefined).ok).toBe(false);
    expect(validateContent(123).ok).toBe(false);
    expect(validateContent({ a: 1 }).ok).toBe(false);
  });

  it("200자는 통과하고 201자는 거절한다", () => {
    expect(validateContent("가".repeat(200)).ok).toBe(true);
    expect(validateContent("가".repeat(201)).ok).toBe(false);
  });

  it("이모지는 한 글자로 센다", () => {
    expect(validateContent("😀".repeat(200)).ok).toBe(true);
    expect(validateContent("😀".repeat(201)).ok).toBe(false);
  });
});

describe("isValidEntryId / isValidCursor", () => {
  it("UUID 형식만 ID로 인정한다", () => {
    expect(isValidEntryId("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
    expect(isValidEntryId("1; DROP TABLE diary.entries")).toBe(false);
    expect(isValidEntryId("")).toBe(false);
    expect(isValidEntryId(undefined)).toBe(false);
  });

  it("커서는 안전한 문자·길이만 인정한다", () => {
    expect(isValidCursor("abc_DEF-123")).toBe(true);
    expect(isValidCursor("")).toBe(false);
    expect(isValidCursor("a b")).toBe(false);
    expect(isValidCursor("a".repeat(201))).toBe(false);
  });
});
