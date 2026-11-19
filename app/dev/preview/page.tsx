// 작성: 2026-11-19 12:25 KST
// 개발 모드에서만 열리는 화면 미리보기. 로그인(AUTH_*) 없이 모든 화면 상태를 가짜 데이터로 한 페이지에서 본다.
// 운영 빌드(NODE_ENV=production)에서는 404가 된다.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PreviewBoard } from "./preview-board";

export const metadata: Metadata = {
  title: "화면 미리보기(개발용)",
  robots: { index: false, follow: false },
};

export default function DevPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main id="main" className="mx-auto w-full max-w-xl px-5 py-8">
      <PreviewBoard />
    </main>
  );
}
