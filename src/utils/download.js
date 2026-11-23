/** 저장 경로가 아닌 화면의 원본 파일명을 사용한다. */
export function downloadName(original) {
  const name = String(original || 'download').replaceAll('\\', '/').split('/').pop().split('').map((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 ? '_' : c).join('');
  return !name || name === '.' || name === '..' ? 'download' : name;
}

export function saveDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = downloadName(filename);
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    // 브라우저가 다운로드를 시작하기 전에 URL을 해제하지 않는다.
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}
