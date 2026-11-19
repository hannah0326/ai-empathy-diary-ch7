// 작성: 2026-11-19 12:13 KST
// 로그인 뒤 화면의 머리글: 앱 이름, 쓰기·기록 이동, 로그아웃.
import Link from "next/link";
import { signOut } from "@/auth";

type Current = "write" | "entries";

export function AppHeader({ current }: { current: Current }) {
  const linkClass = (active: boolean) =>
    `inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium ${
      active ? "bg-soft text-ink underline decoration-2 underline-offset-4" : "text-muted hover:bg-soft hover:text-ink"
    }`;

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3">
        <Link href="/" className="font-diary text-lg font-bold text-ink">
          AI 공감 다이어리
        </Link>
        <nav aria-label="주 메뉴" className="flex items-center gap-1">
          <Link href="/" aria-current={current === "write" ? "page" : undefined} className={linkClass(current === "write")}>
            오늘 쓰기
          </Link>
          <Link
            href="/entries"
            aria-current={current === "entries" ? "page" : undefined}
            className={linkClass(current === "entries")}
          >
            지난 기록
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className={linkClass(false)}>
              로그아웃
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
