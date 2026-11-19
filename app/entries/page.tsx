// 작성: 2026-11-19 12:16 KST
// 지난 기록 화면(로그인 필요). 옛 /history를 옮겨 왔다.
import { requireLogin } from "@/app/_lib/session";
import { AppHeader } from "@/components/app-header";
import { EntryList } from "@/components/entry-list";

export default async function EntriesPage() {
  await requireLogin();

  return (
    <>
      <AppHeader current="entries" />
      <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-8">
        <div>
          <h1 className="font-diary text-3xl font-bold text-ink">지난 기록</h1>
          <p className="mt-1 text-muted">지금까지 남긴 일기와 그날의 감정을 돌아볼 수 있어요.</p>
        </div>
        <EntryList />
      </main>
    </>
  );
}
