// 작성: 2026-11-19 10:52 KST
// 로그인 화면 뼈대. 디자인은 2단계에서 frontend-developer가 한다.
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function LoginPage() {
  // 이미 로그인했으면 일기 쓰기 화면으로 보낸다.
  if (await auth()) redirect("/");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-bold">AI 공감 다이어리</h1>
      <p>오늘 있었던 일을 한 줄로 쓰면 AI가 마음을 알아줘요.</p>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/" });
        }}
      >
        <button type="submit" className="rounded border px-4 py-2">
          구글로 로그인
        </button>
      </form>
      {/* TODO(2단계, frontend-developer): F2 무료 모델 상시 안내문(PRD 8.2절 승인 문구) */}
    </main>
  );
}
