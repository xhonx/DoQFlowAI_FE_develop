const ORIGIN = 'https://doqflow.invalid';

/** 로그인 후 돌아갈 내부 경로. 외부 주소, 역슬래시, 제어문자와 인증 페이지 루프는 거절한다. */
export function safeReturnPath(value) {
  if (typeof value !== 'string' || value.length > 2048) return '/';
  const internal = (path) => path.startsWith('/') && !path.startsWith('//') && !path.includes('\\') && ![...path].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127);
  if (!internal(value)) return '/';
  try {
    // 인코딩된 구분자도 검사한다. 반환값은 원래 URL의 인코딩을 보존한다.
    let decoded = value;
    for (let i = 0; i < 4 && /%[0-9a-f]{2}/i.test(decoded); i += 1) {
      decoded = decodeURIComponent(decoded);
      if (!internal(decoded)) return '/';
    }
    if (/%[0-9a-f]{2}/i.test(decoded)) return '/';
    const url = new URL(value, ORIGIN);
    const decodedUrl = new URL(decoded, ORIGIN);
    if (url.origin !== ORIGIN || decodedUrl.origin !== ORIGIN) return '/';
    if (/^\/(login|signup)(\/|$)/i.test(decodedUrl.pathname)) return '/';
    const target = `${url.pathname}${url.search}${url.hash}`;
    return internal(target) ? target : '/';
  } catch {
    return '/';
  }
}
