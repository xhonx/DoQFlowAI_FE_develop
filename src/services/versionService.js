// 소유: 공통 베이스
import { api } from './api';
import { saveDownload } from '../utils/download';

export const versionService = {
  importUrl: (documentId, url) => api.post(`/documents/${documentId}/versions/from-url`, { url }, { timeout: 45000 }).then((r) => r.data),
  /** files: File[]. 배열 순서가 곧 버전 번호 순서 */
  upload: (documentId, files) => {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    // Content-Type 은 브라우저가 boundary 와 함께 붙이도록 비웁니다
    return api
      .post(`/documents/${documentId}/versions`, form, { headers: { 'Content-Type': undefined }, timeout: 120000 })
      .then((r) => r.data);
  },

  get: (documentId, versionNo) => api.get(`/documents/${documentId}/versions/${versionNo}`).then((r) => r.data),
  content: (documentId, versionNo) =>
    api.get(`/documents/${documentId}/versions/${versionNo}/content`).then((r) => r.data),
  download: async (documentId, versionNo, filename) => {
    const response = await api.get(`/documents/${documentId}/versions/${versionNo}/download`, { responseType: 'blob' });
    saveDownload(response.data, filename);
  },
  remove: (documentId, versionNo) => api.delete(`/documents/${documentId}/versions/${versionNo}`),
  history: (documentId) => api.get(`/documents/${documentId}/history`).then((r) => r.data),
  compare: (documentId, from, to) =>
    api.get(`/documents/${documentId}/compare`, { params: { from, to } }).then((r) => r.data),
};
