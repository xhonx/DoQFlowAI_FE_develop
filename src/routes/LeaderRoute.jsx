import PropTypes from 'prop-types';
import { useAuthStore } from '../store/authStore';
import { LEADER_RANK } from '../utils/format';
import PageError from '../components/common/PageError';

// 화면 안내용 가드. 실제 권한은 /management API가 DB 직급으로 판정한다.
export default function LeaderRoute({ children }) {
  const rank = useAuthStore((s) => s.user?.rankLevel);
  return rank === LEADER_RANK ? children : <PageError code="403" message="팀장만 이용할 수 있는 화면입니다" />;
}
LeaderRoute.propTypes = { children: PropTypes.node.isRequired };
