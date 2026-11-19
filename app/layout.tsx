// 작성: 2026-11-19 10:52 KST
// 수정: 2026-11-19 11:36 KST (글꼴, 본문 건너뛰기 링크)
import type { Metadata, Viewport } from "next";
import { Gowun_Batang, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

// 본문용 고딕(읽기 편함)과 일기 내용·제목용 바탕체(손글씨 느낌). 변수 이름은 globals.css의 --font-sans, --font-diary가 읽는다.
const sansKr = Noto_Sans_KR({
  variable: "--font-sans-kr",
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});
const diaryKr = Gowun_Batang({
  variable: "--font-diary-kr",
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "AI 공감 다이어리",
  description: "오늘 있었던 일을 한 줄로 쓰면 AI가 마음을 알아주는 일기장",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${sansKr.variable} ${diaryKr.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
        >
          본문으로 건너뛰기
        </a>
        {children}
      </body>
    </html>
  );
}
