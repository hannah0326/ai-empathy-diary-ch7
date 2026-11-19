// 작성: 2026-11-19 11:35 KST
// 모델 존재 확인: 공개 모델 목록(키 없이 조회)에서 설정한 모델 id를 대조한다.
import { MODELS, MODELS_URL } from "./config";

export interface ModelCheckResult {
  /** 목록을 가져오는 데 성공했는지. false면 found는 의미 없다. */
  listed: boolean;
  /** 모델 id별 존재 여부 */
  found: Record<string, boolean>;
  /** 목록 전체 개수(참고용) */
  total: number;
}

export async function checkModelsExist(
  opts: { fetchImpl?: typeof fetch; ids?: readonly string[]; timeoutMs?: number } = {},
): Promise<ModelCheckResult> {
  const ids = opts.ids ?? MODELS.map((m) => m.id);
  const fetchImpl = opts.fetchImpl ?? fetch;
  const found: Record<string, boolean> = Object.fromEntries(ids.map((id) => [id, false]));
  try {
    // 공개 목록이라 Authorization 헤더를 보내지 않는다.
    const res = await fetchImpl(MODELS_URL, { signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000) });
    if (!res.ok) return { listed: false, found, total: 0 };
    const json = (await res.json()) as { data?: Array<{ id?: unknown }> };
    const available = new Set((json.data ?? []).map((m) => m.id));
    for (const id of ids) found[id] = available.has(id);
    return { listed: true, found, total: available.size };
  } catch {
    return { listed: false, found, total: 0 };
  }
}
