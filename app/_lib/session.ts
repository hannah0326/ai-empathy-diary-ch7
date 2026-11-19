// 작성: 2026-11-19 12:12 KST
// 화면(서버 컴포넌트)용 로그인 확인 도우미. 세션 확인 중 오류(예: AUTH_SECRET 누락)는 로그인하지 않은 것으로 본다.
import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** 로그인한 세션을 돌려준다. 없거나 확인에 실패하면 null. */
export async function getSessionSafe() {
  try {
    return await auth();
  } catch {
    return null;
  }
}

/** 로그인하지 않았으면 /login으로 보낸다. */
export async function requireLogin() {
  const session = await getSessionSafe();
  if (!session) redirect("/login");
  return session;
}
