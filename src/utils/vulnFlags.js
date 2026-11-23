import { createVulnFlagReader } from './labFlags';

// axios 인터셉터 등 React 컴포넌트 밖에서도 같은 고정 설정을 읽는다.
export const isVulnEnabled = createVulnFlagReader(import.meta.env.MODE, import.meta.env.VITE_LAB_VULNS);
