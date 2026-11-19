// 작성: 2026-11-19 11:45 KST
// scripts/ai-try.mjs 전용 로더 훅. lib/ai의 TypeScript 파일을 Node가 그대로 실행할 수 있게
// 확장자 없는 상대 경로를 `.ts`로 풀어 준다(Node 24의 타입 제거 기능 사용, 별도 패키지 불필요).
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const ROOT = new URL("../", import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  // tsconfig의 "@/" 별칭(프로젝트 루트)을 푼다. db-smoke.mjs가 서비스·저장소 코드를 그대로 불러올 때 필요하다.
  if (specifier.startsWith("@/")) {
    for (const candidate of [`${specifier.slice(2)}.ts`, `${specifier.slice(2)}/index.ts`]) {
      try {
        const url = new URL(candidate, ROOT);
        await access(fileURLToPath(url));
        return nextResolve(url.href, context);
      } catch {
        // 다음 후보로
      }
    }
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[a-z]+$/i.test(specifier)) {
    for (const candidate of [`${specifier}.ts`, `${specifier}/index.ts`]) {
      try {
        const url = new URL(candidate, context.parentURL);
        await access(fileURLToPath(url));
        return nextResolve(url.href, context);
      } catch {
        // 다음 후보로
      }
    }
  }
  return nextResolve(specifier, context);
}
