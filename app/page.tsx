// 작성: 2026-11-19 10:52 KST
// 수정: 2026-11-19 12:14 KST (일기 쓰기 화면 구현)
// 일기 쓰기 화면(로그인 필요). 결과는 이 화면 안에 보여준다(PRD 6절 협의 결과).
import { requireLogin } from "@/app/_lib/session";
import { AppHeader } from "@/components/app-header";
import { EntryComposer } from "@/components/entry-composer";
import { FreeModelNotice } from "@/components/free-model-notice";

export default async function WritePage() {
  await requireLogin();

  return (
    <>
      <AppHeader current="write" />
      <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-8">
        <h1 className="font-diary text-3xl font-bold text-ink">오늘의 한 줄</h1>
        <EntryComposer />
        <FreeModelNotice />
      </main>
    </>
  );
}
