// 작성: 2026-11-19 10:52 KST
// 수정: 2026-11-19 12:15 KST (로그인 화면 구현)
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { getSessionSafe } from "@/app/_lib/session";
import { FreeModelNotice } from "@/components/free-model-notice";
import { primaryButtonClass } from "@/components/notices";

export default async function LoginPage() {
  // 이미 로그인했으면 일기 쓰기 화면으로 보낸다. 세션 확인이 실패해도 로그인 화면은 보여준다.
  if (await getSessionSafe()) redirect("/");

  return (
    <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-5 py-12">
      <div className="rounded-paper border border-line bg-card p-8 text-center shadow-paper">
        <p aria-hidden="true" className="text-4xl">
          📔
        </p>
        <h1 className="mt-3 font-diary text-3xl font-bold text-ink">AI 공감 다이어리</h1>
        <p className="mt-3 text-lg text-muted">오늘 있었던 일을 한 줄로 쓰면 AI가 마음을 알아줘요.</p>
        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button type="submit" className={`${primaryButtonClass} w-full`}>
            구글로 시작하기
          </button>
        </form>
      </div>
      <FreeModelNotice />
    </main>
  );
}
