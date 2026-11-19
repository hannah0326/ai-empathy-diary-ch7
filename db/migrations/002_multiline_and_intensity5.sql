-- 작성: 2026-11-19 12:27 KST
-- 사용자 요청(2026-11-19)으로 바꾼 두 가지를 diary.entries에 반영한다.
-- 1) 일기에 줄바꿈 허용: 한 줄 제약을 없앤다(글자 수 1~200 제약은 그대로).
-- 2) 감정 강도를 3단계에서 5단계로: 이미 저장된 값은 뜻이 같도록 옮긴다(1→1, 2→3, 3→5).
-- diary 스키마만 바꾼다.

ALTER TABLE diary.entries DROP CONSTRAINT IF EXISTS entries_content_one_line;

ALTER TABLE diary.entries DROP CONSTRAINT IF EXISTS entries_intensity_valid;

UPDATE diary.entries
   SET intensity = CASE intensity WHEN 2 THEN 3 WHEN 3 THEN 5 END
 WHERE intensity IN (2, 3);

ALTER TABLE diary.entries
  ADD CONSTRAINT entries_intensity_valid CHECK (intensity IS NULL OR intensity BETWEEN 1 AND 5);
