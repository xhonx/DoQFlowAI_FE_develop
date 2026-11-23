import { useEffect, useState } from 'react';
import { api } from '../services/api';
import Card from '../components/common/Card';
import { getErrorMessage } from '../utils/errors';

export default function HelpPage() {
  const [page, setPage] = useState('guide');
  const [content, setContent] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let current = true;
    setContent(null);
    setError('');
    api.get('/help', { params: { page } }).then((r) => { if (current) setContent(r.data); })
      .catch((e) => { if (current) setError(getErrorMessage(e)); });
    return () => { current = false; };
  }, [page]);
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <h1 className="text-display font-bold">도움말</h1>
      <label className="text-label">안내 선택
        <select className="ml-3 rounded border border-line p-2" value={page} onChange={(e) => setPage(e.target.value)}>
          <option value="guide">사용 안내</option><option value="terms">실습 이용 안내</option><option value="privacy">실습 데이터 안내</option>
        </select>
      </label>
      {error ? <p role="alert" className="text-danger">{error}</p> : null}
      {content ? <Card><h2 className="mb-3 text-title font-bold">{content.title}</h2><p className="text-body">{content.content}</p></Card> : null}
    </div>
  );
}
