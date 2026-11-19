// 작성: 2026-11-19 10:52 KST
// 일기 쓰기 화면 뼈대(로그인 필요). 디자인과 기능은 2단계에서 구현한다.
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

export default async function WritePage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">오늘의 한 줄</h1>
      {/* TODO(2단계, frontend-developer): 한 줄 입력, 남은 글자 수, 결과, 상시 안내문 */}
      <p>일기 쓰기 화면은 2단계에서 만들어요.</p>
      <nav className="flex gap-4">
        <Link href="/history" className="underline">
          지난 기록
        </Link>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" className="underline">
            로그아웃
          </button>
        </form>
      </nav>
    </main>
  );
}
