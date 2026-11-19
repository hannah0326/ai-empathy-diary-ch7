// 작성: 2026-11-19 11:37 KST
// 상담 연락처 고정 데이터. 한 곳에서만 관리한다(PRD 8.2절 고정 문구, 8.3절 연락처 표).
// 연락처는 AI가 만들지 않고 이 파일의 내용만 화면에 보여준다. 번호가 바뀌면 이 파일만 고친다.
// 확인일: 2026-11-19. 배포 전에 공식 출처로 다시 확인한다(PRD R5).

export interface Contact {
  /** 기관·서비스 이름 */
  name: string;
  /** 화면에 보이는 번호 */
  display: string;
  /** tel: 링크에 쓰는 번호(숫자만) */
  tel: string;
  /** 운영 설명 */
  description: string;
  /** 번호 아래 덧붙일 안내(없으면 생략) */
  note?: string;
  /** 공식 출처(화면에는 보이지 않고 확인용) */
  source: string;
}

export const CONTACTS_VERIFIED_ON = "2026-11-19";

export const CONTACTS: readonly Contact[] = [
  {
    name: "자살예방상담전화",
    display: "109",
    tel: "109",
    description: "보건복지부, 24시간",
    source: "https://www.korea.kr/news/policyNewsView.do?newsId=148921684",
  },
  {
    name: "정신건강위기상담전화",
    display: "1577-0199",
    tel: "15770199",
    description: "보건복지부, 24시간",
    source: "https://www.mohw.go.kr/menu.es?mid=a10706040100",
  },
  {
    name: "청소년상담전화",
    display: "1388",
    tel: "1388",
    description: "여성가족부·한국청소년상담복지개발원, 24시간",
    note: "휴대전화로 걸 때는 지역번호를 먼저 눌러 주세요. (예: 서울 02-1388)",
    source: "https://www.1388.go.kr",
  },
  {
    name: "긴급 신고",
    display: "119",
    tel: "119",
    description: "소방청, 재난신고 통합번호",
    source: "https://www.nfa.go.kr",
  },
];

/** PRD 8.2절 고정 안내 문구(승인됨) */
export const CRISIS_MESSAGE =
  "지금 많이 힘드시군요. 이렇게 마음을 적어 주셔서 고마워요. 혼자 견디지 않으셔도 괜찮아요. 아래 전화는 언제든 이야기를 들어 줄 수 있는 곳이에요. 지금 위험하다고 느껴지면 바로 119에 연락해 주세요.";

/** PRD 8.2절 고지 문구(연락처 카드 아래) */
export const CRISIS_DISCLAIMER = "이 앱은 의료·상담을 대신하지 않습니다.";

/** F2 상시 안내문(로그인·쓰기 화면). PRD F2, 8.2절 취지 */
export const FREE_MODEL_NOTICE =
  "쓴 글은 AI 분석을 위해 외부 무료 AI 모델 제공사로 전달돼요. 제공사가 이 글을 기록하거나 학습에 쓸 수 있어요.";
