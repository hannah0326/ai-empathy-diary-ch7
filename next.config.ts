// 작성: 2026-11-19 10:58 KST
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 로그인 세션(쿠키)을 읽는 화면이 대부분이라 기본 동적 렌더링을 쓴다.
  // (create-next-app이 켜 둔 cacheComponents, partialPrefetching은 빌드 오류를 내서 껐다.)
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
