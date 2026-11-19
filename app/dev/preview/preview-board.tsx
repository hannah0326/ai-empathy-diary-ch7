// 작성: 2026-11-19 12:26 KST
// 미리보기 판. 모든 화면 상태를 가짜 데이터로 보여준다(개발용). 실제 API를 부르지 않는다.
"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CrisisCard } from "@/components/crisis-card";
import { EntryBody } from "@/components/entry-body";
import { EntryComposer } from "@/components/entry-composer";
import { EntryDetail } from "@/components/entry-detail";
import { EntryList } from "@/components/entry-list";
import { FreeModelNotice } from "@/components/free-model-notice";
import { ErrorBox, InfoBox, LoadingNote } from "@/components/notices";
import { createMockClient, MOCK_SAMPLE_IDS, type MockListMode } from "@/lib/client/mock";
import type { Entry } from "@/lib/types";

const now = new Date().toISOString();
const empty = { emotion: null, intensity: null, message: null, model: null } as const;

/** 결과 표시 상태 모음(done / failed / pending / crisis 조합) */
const GALLERY: { label: string; entry: Entry }[] = [
  {
    label: "분석 성공(done)",
    entry: {
      id: "g1",
      content: "오늘 발표를 무사히 마쳤다\n준비한 만큼 잘 됐다\n\n저녁엔 푹 쉬어야지",
      emotion: "기쁨",
      intensity: 4,
      message: "발표를 잘 마치셨다니 정말 뿌듯하시겠어요. 그동안 준비하신 노력이 빛난 하루였네요. 오늘은 스스로를 마음껏 칭찬해 주세요.",
      crisis: false,
      analysisStatus: "done",
      model: "mock-model",
      createdAt: now,
    },
  },
  {
    label: "띄어쓰기 없는 긴 글(줄바꿈 확인)",
    entry: {
      id: "g0",
      content: "ㅗ".repeat(200),
      emotion: "불안",
      intensity: 2,
      message: "ㅇ".repeat(120),
      crisis: false,
      analysisStatus: "done",
      model: "mock-model",
      createdAt: now,
    },
  },
  {
    label: "분석 실패(failed)",
    entry: { id: "g2", content: "오늘은 그냥 흘러갔다", ...empty, crisis: false, analysisStatus: "failed", createdAt: now },
  },
  {
    label: "분석 대기(pending)",
    entry: { id: "g3", content: "퇴근길에 비를 맞았다", ...empty, crisis: false, analysisStatus: "pending", createdAt: now },
  },
  {
    label: "위기 + 분석 성공(감정이 기쁨이어도 카드 표시)",
    entry: {
      id: "g4",
      content: "(위기 표시 예시 문장)",
      emotion: "기쁨",
      intensity: 5,
      message: "마음을 적어 주셔서 고마워요. 지금 곁에서 듣고 있어요.",
      crisis: true,
      analysisStatus: "done",
      model: "mock-model",
      createdAt: now,
    },
  },
  {
    label: "위기 + 분석 실패",
    entry: { id: "g5", content: "(위기 표시 예시 문장)", ...empty, crisis: true, analysisStatus: "failed", createdAt: now },
  },
  {
    label: "위기 + 분석 대기",
    entry: { id: "g6", content: "(위기 표시 예시 문장)", ...empty, crisis: true, analysisStatus: "pending", createdAt: now },
  },
];

const LIST_MODES: { value: MockListMode; label: string }[] = [
  { value: "normal", label: "기록 있음(20건 + 더 보기 7건)" },
  { value: "empty", label: "빈 기록" },
  { value: "server_error", label: "서버 오류(500)" },
  { value: "bad_response", label: "JSON이 아닌 응답" },
  { value: "unauthorized", label: "로그인 만료(401)" },
];

const DETAIL_SAMPLES = [
  { id: MOCK_SAMPLE_IDS.done, label: "분석 성공" },
  { id: MOCK_SAMPLE_IDS.crisisDone, label: "위기 + 분석 성공" },
  { id: MOCK_SAMPLE_IDS.failed, label: "분석 실패" },
  { id: MOCK_SAMPLE_IDS.crisisFailed, label: "위기 + 분석 실패" },
  { id: MOCK_SAMPLE_IDS.pending, label: "분석 대기" },
  { id: MOCK_SAMPLE_IDS.missing, label: "없는 일기(404)" },
];

function Block({ id, title, hint, children }: { id: string; title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-12 border-t border-line pt-8">
      <h2 id={id} className="font-diary text-2xl font-bold text-ink">
        {title}
      </h2>
      {hint ? <p className="mt-2 text-sm text-muted">{hint}</p> : null}
      <div className="mt-5 grid gap-5">{children}</div>
    </section>
  );
}

const selectClass = "min-h-11 rounded-xl border border-line bg-card px-3 text-ink";

export function PreviewBoard() {
  const composerClient = useMemo(() => createMockClient(), []);
  const [listMode, setListMode] = useState<MockListMode>("normal");
  const listClient = useMemo(() => createMockClient({ listMode }), [listMode]);
  const [detailId, setDetailId] = useState<string>(MOCK_SAMPLE_IDS.done);
  const detailClient = useMemo(() => createMockClient(), [detailId]); // eslint-disable-line react-hooks/exhaustive-deps
  const [notice, setNotice] = useState("");

  return (
    <div>
      <h1 className="font-diary text-3xl font-bold text-ink">화면 미리보기</h1>
      <p className="mt-2 text-muted">
        개발용 페이지예요(운영에서는 열리지 않아요). 모든 데이터는 가짜이고 서버를 부르지 않아요. 로그인 화면은{" "}
        <a href="/login" className="text-accent underline underline-offset-4">
          /login
        </a>
        에서 봐요.
      </p>
      <p role="status" className="mt-3 min-h-6 text-sm font-medium text-ink">
        {notice}
      </p>

      <Block
        id="p-write"
        title="1. 일기 쓰기"
        hint={
          <>
            내용에 낱말을 넣어 상태를 불러 보세요. <b>위기</b>(위기 카드), <b>위기실패</b>, <b>실패</b>(분석 실패), <b>대기</b>(pending),{" "}
            <b>상한</b>(429), <b>만료</b>(401, 쓴 글 보존), <b>오류</b>(500), <b>깨짐</b>(JSON 아님), <b>끊김</b>(연결 실패),{" "}
            <b>느림</b>(8초 대기). 그 밖에는 분석 성공이에요.
          </>
        }
      >
        <EntryComposer client={composerClient} onUnauthorized={() => setNotice("로그인 만료(401): 실제에서는 쓴 글을 보관하고 /login으로 이동해요.")} />
        <FreeModelNotice />
      </Block>

      <Block id="p-results" title="2. 결과 표시 상태" hint="쓰기 결과와 기록 상세가 같이 쓰는 표시예요.">
        {GALLERY.map(({ label, entry }) => (
          <div key={entry.id} className="min-w-0 rounded-paper border border-line bg-card p-5">
            <h3 className="mb-3 text-sm font-bold text-muted">{label}</h3>
            <EntryBody entry={entry} headingLevel={3} />
          </div>
        ))}
      </Block>

      <Block id="p-crisis" title="3. 위기 카드 단독" hint="연락처 4곳, tel: 링크, 1388 휴대전화 지역번호 안내.">
        <CrisisCard headingLevel={3} />
      </Block>

      <Block id="p-list" title="4. 지난 기록">
        <label className="grid gap-1 text-sm text-muted">
          상태 고르기
          <select className={selectClass} value={listMode} onChange={(e) => setListMode(e.target.value as MockListMode)}>
            {LIST_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <EntryList
          key={listMode}
          client={listClient}
          hrefFor={() => "#p-detail"}
          onUnauthorized={() => setNotice("로그인 만료(401): 실제에서는 /login으로 이동해요.")}
        />
      </Block>

      <Block id="p-detail" title="5. 기록 상세와 삭제" hint="삭제는 확인 창을 거쳐요. 지우면 아래에 알림이 떠요.">
        <label className="grid gap-1 text-sm text-muted">
          일기 고르기
          <select className={selectClass} value={detailId} onChange={(e) => setDetailId(e.target.value)}>
            {DETAIL_SAMPLES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <EntryDetail
          key={detailId}
          id={detailId}
          client={detailClient}
          listHref="#p-list"
          onDeleted={() => setNotice("삭제됨: 실제에서는 지난 기록(/entries)으로 이동해요.")}
          onUnauthorized={() => setNotice("로그인 만료(401): 실제에서는 /login으로 이동해요.")}
        />
      </Block>

      <Block id="p-states" title="6. 상태 상자 모음">
        <LoadingNote title="기록을 불러오고 있어요" />
        <ErrorBox title="오늘은 여기까지예요">오늘 쓸 수 있는 일기를 모두 썼어요. 내일 다시 만나요. 쓴 글은 그대로 남겨 두었어요.</ErrorBox>
        <ErrorBox title="문제가 생겼어요">서버에 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.</ErrorBox>
        <ErrorBox title="문제가 생겼어요">서버 응답을 이해하지 못했어요. 잠시 뒤 다시 시도해 주세요.</ErrorBox>
        <InfoBox title="분석을 하지 못했어요. 일기는 저장됐어요">지금은 AI가 답을 주지 못했어요.</InfoBox>
      </Block>
    </div>
  );
}
