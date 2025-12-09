import { observer } from 'mobx-react-lite';
import { Navigate } from 'react-router-dom';
import { userStore } from '../../store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = observer(({ children }: ProtectedRouteProps) => {
  // 如果未登录，重定向到登录页
  if (!userStore.isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
});

export default ProtectedRoute;

