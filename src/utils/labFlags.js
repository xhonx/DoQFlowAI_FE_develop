// 환경변수를 파싱하는 순수 함수. 개발 모드도 lab을 명시하지 않으면 전부 off.
const KNOWN = new Set([
  '1-1', '1-2', '1-3', '1-4', '1-5', '2-1', '2-2',
  '3-1', '3-2', '3-3', '3-4', '3-5', '3-6',
  '4-1', '4-2', '4-3', '4-4', '4-5', '5-1', '5-2',
  '6-1', '6-2', '7-1', '7-2', '7-3', '7-4', '8-1',
]);

export function createVulnFlagReader(mode, raw = '') {
  if (mode !== 'lab') return () => false;
  const enabled = new Set(raw.split(',').map((id) => id.trim()).filter(Boolean));
  if ([...enabled].some((id) => !KNOWN.has(id))) {
    throw new Error('VITE_LAB_VULNS에 지원하지 않는 항목 번호가 있습니다');
  }
  return (id) => enabled.has(id);
}
