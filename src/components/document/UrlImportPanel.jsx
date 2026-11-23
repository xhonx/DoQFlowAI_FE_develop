import { useState } from 'react';
import PropTypes from 'prop-types';
import Button from '../common/Button';
import TextField from '../common/TextField';
import { versionService } from '../../services/versionService';
import { getErrorMessage } from '../../utils/errors';

export default function UrlImportPanel({ documentId, onImported, disabled = false }) {
  const [url, setUrl] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    if (pending || disabled) return;
    setPending(true);
    setError('');
    try {
      await versionService.importUrl(documentId, url.trim());
      setUrl('');
      await onImported();
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setPending(false); }
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-2 border-t border-line pt-3">
      <TextField label="외부 문서 URL" type="url" value={url} onChange={(e) => setUrl(e.target.value)}
        placeholder="https://허용된-출처/문서.pdf" maxLength={2048} required disabled={pending || disabled} />
      <p className="text-caption text-muted">허용된 출처의 HTTPS 파일만 가져옵니다. 파일은 20MB 이하이며 기존 업로드 형식과 같습니다.</p>
      {error ? <p role="alert" className="text-label text-danger">{error}</p> : null}
      <Button type="submit" variant="outline" disabled={pending || disabled || !url.trim()}>
        {pending ? '가져오는 중…' : 'URL에서 버전 가져오기'}
      </Button>
    </form>
  );
}
UrlImportPanel.propTypes = { documentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onImported: PropTypes.func.isRequired, disabled: PropTypes.bool };
