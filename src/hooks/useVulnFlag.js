import { isVulnEnabled } from '../utils/vulnFlags';

// 기존 호출 형식을 유지하는 읽기 전용 도우미. API/DB 조회와 런타임 변경은 없다.
// Vite 개발 서버 재시작 또는 lab 번들 재빌드 후에만 값이 바뀐다.
export function useVulnFlag(flagId) {
  return isVulnEnabled(flagId);
}
