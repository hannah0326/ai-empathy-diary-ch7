-- 작성: 2026-11-19 10:52 KST
-- 001: diary 스키마와 일기 표 만들기.
-- 이 파일은 diary 스키마 안의 객체만 만든다. 다른 스키마(public 등)는 건드리지 않는다.
-- 실행은 `npm run db:migrate`(사용자 승인 뒤)로만 한다. 실행기가 트랜잭션으로 감싸고 기록한다.

CREATE SCHEMA IF NOT EXISTS diary;

-- 마이그레이션 기록 표: 어떤 파일을 이미 실행했는지 남긴다.
CREATE TABLE IF NOT EXISTS diary.schema_migrations (
  name       text        PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

-- 일기 표. 주인은 구글 계정 고유 ID(sub)로 구분하며, 인증용 표는 따로 두지 않는다.
CREATE TABLE IF NOT EXISTS diary.entries (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text        NOT NULL,                 -- 구글 sub
  content         text        NOT NULL,                 -- 한 줄 일기(1~200자)
  emotion         text,                                 -- 감정 8개 중 하나. 분석 전·실패 시 NULL
  intensity       smallint,                             -- 1 약함, 2 보통, 3 강함
  message         text,                                 -- 공감 메시지
  crisis          boolean     NOT NULL DEFAULT false,   -- 키워드 검사 OR AI 판단
  analysis_status text        NOT NULL DEFAULT 'pending', -- pending / done / failed
  model           text,                                 -- 답한 모델 이름
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT entries_user_id_not_empty CHECK (char_length(user_id) > 0),
  CONSTRAINT entries_content_length    CHECK (char_length(content) BETWEEN 1 AND 200),
  CONSTRAINT entries_content_one_line  CHECK (content !~ E'[\\r\\n]'),
  CONSTRAINT entries_emotion_valid     CHECK (
    emotion IS NULL OR emotion IN ('기쁨', '설렘', '평온', '슬픔', '외로움', '불안', '화남', '지침')
  ),
  CONSTRAINT entries_intensity_valid   CHECK (intensity IS NULL OR intensity BETWEEN 1 AND 3),
  CONSTRAINT entries_status_valid      CHECK (analysis_status IN ('pending', 'done', 'failed')),
  -- 분석 성공(done)이면 결과 칸이 모두 채워져야 한다.
  CONSTRAINT entries_done_has_result   CHECK (
    analysis_status <> 'done'
    OR (emotion IS NOT NULL AND intensity IS NOT NULL AND message IS NOT NULL AND model IS NOT NULL)
  )
);

-- 내 일기를 최신순으로 20건씩 읽고(커서 페이지), 하루 작성 수를 세는 데 쓴다.
CREATE INDEX IF NOT EXISTS entries_user_created_idx
  ON diary.entries (user_id, created_at DESC, id DESC);

-- Supabase의 공개 API 역할(anon, authenticated)이 이 표를 읽지 못하게 행 수준 보안을 켠다.
-- 정책을 만들지 않으므로 서버(표 소유 역할로 접속)만 접근한다.
ALTER TABLE diary.entries ENABLE ROW LEVEL SECURITY;
