/**
 * Protected Route module.
 * Route definitions connect endpoints with validation, authorization, and controllers.
 */
import { useContext, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import AuthContext from '../context/authContext';
// ProtectedRoute renders the main screen and handles nearby interactions.
function ProtectedRoute({ allowedRoles, redirectTo = '/' }) {
  const location = useLocation();
  const { isAuthenticated, logout, user } = useContext(AuthContext);
  const userRole = user?.role;
  const isForbiddenRole = Boolean(isAuthenticated && allowedRoles?.length && !allowedRoles.includes(userRole));
  const roleRedirect = userRole === 'admin' ? '/admin' : userRole === 'user' ? '/dashboard' : redirectTo;
  useEffect(() => {
    if (!isAuthenticated || (isForbiddenRole && roleRedirect === redirectTo)) {
      logout();
    }
  }, [isAuthenticated, isForbiddenRole, logout, redirectTo, roleRedirect]);
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  if (isForbiddenRole) {
    return <Navigate to={roleRedirect} replace />;
  }

  return <Outlet />;
}
// Default export registers the primary  value.
export default ProtectedRoute;
