// 작성: 2026-11-19 10:52 KST
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 공감 다이어리",
  description: "오늘 있었던 일을 한 줄로 쓰면 AI가 마음을 알아주는 일기장",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

