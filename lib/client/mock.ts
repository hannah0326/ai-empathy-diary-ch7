// 작성: 2026-11-19 11:43 KST
// 2단계용 가짜 API. 계약(lib/types.ts) 모양 그대로 돌려준다. 3단계에서는 lib/client/index.ts 스위치로 끈다.
//
// 일기 쓰기에서 내용에 아래 낱말이 들어 있으면 해당 상태를 흉내 낸다(화면 확인용).
//   "위기" → 위기 카드(분석 성공)      "위기실패" → 위기 카드 + 분석 실패
//   "실패" → 분석 실패(failed)         "대기" → 분석 대기(pending)
//   "상한" → 429 하루 상한              "만료" → 401 로그인 만료
//   "오류" → 500 서버 오류              "깨짐" → JSON이 아닌 응답
//   "느림" → 약 8초 대기(대기 표시 확인)  "끊김" → 연결 실패
//   그 밖에는 분석 성공
import {
  EMOTIONS,
  PAGE_SIZE,
  type CreateEntryResponse,
  type Entry,
  type Intensity,
  type ListEntriesResponse,
} from "@/lib/types";
import type { ApiFailureKind, ApiResult, EntriesClient } from "./types";

/** 기록 목록 시나리오 */
export type MockListMode = "normal" | "empty" | "server_error" | "unauthorized" | "bad_response";

export interface MockOptions {
  /** 기본 응답 지연(ms). 로딩 표시를 볼 수 있게 조금 둔다. */
  latencyMs?: number;
  listMode?: MockListMode;
}

const MESSAGES: Record<string, string> = {
  기쁨: "좋은 일이 있으셨군요. 그 기쁨이 글에서도 느껴져서 읽는 저도 덩달아 따뜻해져요. 오늘의 뿌듯함을 천천히 누려 보세요.",
  설렘: "기대되는 마음이 두근두근 전해져요. 설레는 일이 앞에 있다니 하루가 반짝였겠어요. 그 마음을 잘 간직해 주세요.",
  평온: "차분하게 흘러간 하루였군요. 특별하지 않아도 편안한 날은 그 자체로 소중해요. 오늘도 잘 보내셨어요.",
  슬픔: "마음이 많이 아프셨겠어요. 그런 감정이 드는 건 자연스러운 일이에요. 오늘은 스스로를 다정하게 대해 주세요.",
  외로움: "혼자라고 느껴진 순간이 있었군요. 그 마음을 이렇게 적어 주셔서 고마워요. 지금 여기서는 얼마든지 이야기해도 괜찮아요.",
  불안: "걱정이 마음을 붙잡고 있었군요. 불안한 마음이 드는 건 그만큼 중요한 일이라는 뜻이기도 해요. 오늘은 숨을 천천히 쉬어 보세요.",
  화남: "속상하고 억울한 일이 있으셨군요. 화가 날 만한 일이었다고 느껴져요. 그 감정을 글로 풀어낸 것만으로도 잘하셨어요.",
  지침: "몸도 마음도 많이 지치셨군요. 오늘은 쉬어도 괜찮은 날이에요. 애쓴 하루를 스스로 토닥여 주세요.",
};

const SAMPLE_CONTENTS = [
  "오늘 발표를 무사히 마쳤다",
  "친구와 오랜만에 통화해서 설렜다",
  "비가 와서 집에서 차를 마시며 쉬었다",
  "혼자 먹는 저녁이 유난히 쓸쓸했다",
  "내일 면접 생각에 잠이 안 온다",
  "팀 회의에서 내 의견이 무시당해 화가 났다",
  "야근이 이어져서 몸이 천근만근이다",
  "산책하다가 예쁜 노을을 봤다",
  "엄마가 보내준 반찬이 너무 맛있었다",
  "아무것도 하기 싫은 하루였다",
];

const emotionClassPick = (i: number) => EMOTIONS[i % EMOTIONS.length];
const intensityPick = (i: number): Intensity => ((i % 3) + 1) as Intensity;

function mockId(n: number) {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

/** 가짜 일기 만들기. 위기·실패·대기 같은 특수 상태가 섞이게 한다. */
function buildSeed(count: number, startIndex: number): Entry[] {
  const now = Date.now();
  const entries: Entry[] = [];
  for (let k = 0; k < count; k++) {
    const i = startIndex + k;
    // 하루에 1~2건씩 과거로(날짜별 묶음 확인용)
    const createdAt = new Date(now - (Math.floor(i / 2) * 24 * 60 + (i % 2) * 300 + i * 7) * 60 * 1000).toISOString();
    const content = SAMPLE_CONTENTS[i % SAMPLE_CONTENTS.length];
    const base = { id: mockId(i + 1), content, createdAt };
    if (i === 2) {
      entries.push({
        ...base,
        content: "요즘 사라지고 싶다는 생각이 자주 든다",
        emotion: "슬픔",
        intensity: 3,
        message: MESSAGES["슬픔"],
        crisis: true,
        analysisStatus: "done",
        model: "mock-model",
      });
    } else if (i === 4) {
      entries.push({
        ...base,
        content: "다 끝내고 싶다는 생각이 들었다",
        emotion: null,
        intensity: null,
        message: null,
        crisis: true,
        analysisStatus: "failed",
        model: null,
      });
    } else if (i === 3) {
      entries.push({ ...base, emotion: null, intensity: null, message: null, crisis: false, analysisStatus: "failed", model: null });
    } else if (i === 5) {
      entries.push({ ...base, emotion: null, intensity: null, message: null, crisis: false, analysisStatus: "pending", model: null });
    } else {
      const emotion = emotionClassPick(i);
      entries.push({
        ...base,
        emotion,
        intensity: intensityPick(i),
        message: MESSAGES[emotion],
        crisis: false,
        analysisStatus: "done",
        model: "mock-model",
      });
    }
  }
  return entries;
}

function fail<T>(kind: ApiFailureKind, message: string): ApiResult<T> {
  return { ok: false, kind, message };
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** 가짜 클라이언트를 새로 만든다(저장소는 이 클라이언트 안에만 있다). */
export function createMockClient(options: MockOptions = {}): EntriesClient {
  const latency = options.latencyMs ?? 500;
  const listMode = options.listMode ?? "normal";
  // 첫 쪽 20건(+커서) → 둘째 쪽 7건(커서 없음)
  const firstPage = buildSeed(PAGE_SIZE, 0);
  const secondPage = buildSeed(7, PAGE_SIZE);
  const created: Entry[] = [];
  const deleted = new Set<string>();

  const all = () => [...created, ...firstPage, ...secondPage].filter((e) => !deleted.has(e.id));

  return {
    async createEntry(content) {
      const slow = content.includes("느림");
      await sleep(slow ? 8000 : latency);

      if (content.includes("끊김")) return fail("network", "연결이 끊겼어요. 인터넷 연결을 확인하고 다시 시도해 주세요.");
      if (content.includes("만료")) return fail("unauthorized", "로그인이 만료됐어요. 다시 로그인해 주세요.");
      if (content.includes("상한")) return fail("daily_limit", "오늘 쓸 수 있는 일기를 모두 썼어요. 내일 다시 만나요.");
      if (content.includes("오류")) return fail("server", "서버에 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.");
      if (content.includes("깨짐")) return fail("bad_response", "서버 응답을 이해하지 못했어요. 잠시 뒤 다시 시도해 주세요.");

      const crisis = content.includes("위기");
      const base = { id: mockId(900 + created.length), content, createdAt: new Date().toISOString(), crisis };
      let entry: Entry;
      if (content.includes("대기")) {
        entry = { ...base, emotion: null, intensity: null, message: null, analysisStatus: "pending", model: null };
      } else if (content.includes("실패")) {
        entry = { ...base, emotion: null, intensity: null, message: null, analysisStatus: "failed", model: null };
      } else {
        const i = content.length;
        const emotion = emotionClassPick(i);
        entry = {
          ...base,
          emotion,
          intensity: intensityPick(i),
          message: MESSAGES[emotion],
          analysisStatus: "done",
          model: "mock-model",
        };
      }
      created.unshift(entry);
      return { ok: true, data: { entry } satisfies CreateEntryResponse };
    },

    async listEntries(cursor) {
      await sleep(latency);
      if (listMode === "unauthorized") return fail("unauthorized", "로그인이 필요해요.");
      if (listMode === "server_error") return fail("server", "서버에 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.");
      if (listMode === "bad_response") return fail("bad_response", "서버 응답을 이해하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
      if (listMode === "empty") {
        return { ok: true, data: { entries: [], nextCursor: null } satisfies ListEntriesResponse };
      }
      const list = all();
      if (!cursor) {
        return { ok: true, data: { entries: list.slice(0, PAGE_SIZE), nextCursor: list.length > PAGE_SIZE ? "mock-page-2" : null } };
      }
      return { ok: true, data: { entries: list.slice(PAGE_SIZE), nextCursor: null } };
    },

    async getEntry(id) {
      await sleep(latency);
      const entry = all().find((e) => e.id === id);
      if (!entry) return fail("not_found", "일기를 찾을 수 없어요.");
      return { ok: true, data: { entry } };
    },

    async deleteEntry(id) {
      await sleep(latency);
      // 없는 일기를 지워도 성공으로 본다(404는 성공 처리).
      deleted.add(id);
      return { ok: true, data: { deleted: true } };
    },
  };
}

/** 미리보기·확인용 상세 화면에서 쓰는 예시 ID들 */
export const MOCK_SAMPLE_IDS = {
  done: mockId(1),
  crisisDone: mockId(3),
  failed: mockId(4),
  crisisFailed: mockId(5),
  pending: mockId(6),
  missing: mockId(999),
} as const;
