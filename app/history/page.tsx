// 작성: 2026-11-19 10:52 KST
// 지난 기록 화면 뼈대(로그인 필요). 디자인과 기능은 2단계에서 구현한다.
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function HistoryPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">지난 기록</h1>
      {/* TODO(2단계, frontend-developer): GET /api/entries 목록, 20건씩 더 보기, 상세·삭제 */}
      <p>기록 화면은 2단계에서 만들어요.</p>
      <Link href="/" className="underline">
        일기 쓰러 가기
      </Link>
    </main>
  );
}
