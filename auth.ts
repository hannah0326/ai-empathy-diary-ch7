// 작성: 2026-11-19 10:52 KST
// Auth.js(next-auth v5) 설정: 구글 로그인만, 세션은 JWT.
// 일기 주인은 구글 계정 고유 ID(sub)로 구분하므로 인증용 DB 표(어댑터)는 쓰지 않는다.
// 필요한 환경 변수(이름만): AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET
// 구글 공급자는 AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET을 환경 변수에서 자동으로 읽는다.
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    // 로그인 직후 구글 계정 고유 ID(sub)를 토큰에 고정한다.
    jwt({ token, profile }) {
      if (profile?.sub) {
        token.sub = profile.sub;
      }
      return token;
    },
    // 서버 코드가 session.user.id로 사용자 ID를 얻게 한다.
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
