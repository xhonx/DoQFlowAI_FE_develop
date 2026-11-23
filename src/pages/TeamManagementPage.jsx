import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageError from '../components/common/PageError';
import { getErrorMessage } from '../utils/errors';

export default function TeamManagementPage() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    api.get('/management/documents', { params: { page, size: 20 } })
      .then((response) => { if (current) setData(response.data); })
      .catch((e) => { if (current) setError(e); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [page]);
  if (loading) return <LoadingSpinner />;
  if (error) return <PageError message={getErrorMessage(error)} />;
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <h1 className="text-display font-bold text-ink">팀장 문서 관리</h1>
      <p className="text-body text-muted">직접 등록한 문서의 버전과 열람자를 관리합니다.</p>
      <Card>
        <p className="mb-3 text-label text-muted">등록 문서 {data?.totalElements ?? 0}개</p>
        <ul className="divide-y divide-line">
          {data?.content.map((doc) => (
            <li key={doc.documentId} className="flex items-center justify-between gap-3 py-3">
              <span className="min-w-0 truncate text-body text-ink">{doc.name}</span>
              <Link className="shrink-0 rounded-btn-sm px-3 py-2 text-label text-brand hover:bg-soft" to={`/documents/${doc.documentId}`}>관리하기</Link>
            </li>
          ))}
        </ul>
        {data?.content.length === 0 ? <p className="py-5 text-muted">등록한 문서가 없습니다. 문서 만들기로 시작하세요.</p> : null}
      </Card>
      <div className="flex items-center gap-3">
        <Button variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>이전</Button>
        <span className="text-label">{page + 1} 페이지</span>
        <Button variant="outline" disabled={(page + 1) * 20 >= (data?.totalElements ?? 0)} onClick={() => setPage(page + 1)}>다음</Button>
      </div>
    </div>
  );
}
