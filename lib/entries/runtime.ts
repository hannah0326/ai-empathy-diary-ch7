// 작성: 2026-11-19 13:05 KST
// 라우트가 쓰는 실제 서비스 한 벌: Postgres 저장소 + 분석 함수.
// DB 연결은 첫 쿼리 때 만들어지므로 import만으로는 연결하지 않는다.
import { createPostgresRepository } from "./repository";
import { fakeAnalyzeDiary } from "./fake-analyze";
import { createEntryService } from "./service";

// TODO(3단계): 가짜 분석 함수를 lib/ai의 실제 analyzeDiary로 바꾼다.
//   import { analyzeDiary } from "@/lib/ai";  그리고  analyze: analyzeDiary
export const entryService = createEntryService({
  repo: createPostgresRepository(),
  analyze: fakeAnalyzeDiary,
});
