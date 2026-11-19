// 작성: 2026-11-19 12:17 KST
// 기록 상세 화면(로그인 필요). 내용·감정·강도·공감 메시지와 삭제.
import { requireLogin } from "@/app/_lib/session";
import { AppHeader } from "@/components/app-header";
import { EntryDetail } from "@/components/entry-detail";

export default async function EntryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireLogin();
  const { id } = await params;

  return (
    <>
      <AppHeader current="entries" />
      <main id="main" className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-5 py-8">
        <h1 className="font-diary text-3xl font-bold text-ink">일기 보기</h1>
        <EntryDetail id={id} />
      </main>
    </>
  );
}
