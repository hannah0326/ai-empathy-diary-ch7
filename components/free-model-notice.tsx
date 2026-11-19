// 작성: 2026-11-19 11:52 KST
// F2 무료 모델 상시 안내문. 로그인 화면과 일기 쓰기 화면에 항상 보인다.
import { FREE_MODEL_NOTICE } from "@/lib/contacts";

export function FreeModelNotice() {
  return (
    <aside aria-label="이용 안내" className="rounded-2xl border border-line bg-soft px-4 py-3 text-sm text-muted">
      <p>
        <span className="font-bold text-ink">알아 두세요. </span>
        {FREE_MODEL_NOTICE}
      </p>
    </aside>
  );
}
