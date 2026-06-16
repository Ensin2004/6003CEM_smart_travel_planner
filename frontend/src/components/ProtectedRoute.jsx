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
  
  // Determines whether the authenticated user lacks the required role for access
  const isForbiddenRole = Boolean(isAuthenticated && allowedRoles?.length && !allowedRoles.includes(userRole));
  
  // Maps user role to appropriate redirect destination when access is denied
  const roleRedirect = userRole === 'admin' ? '/admin' : userRole === 'user' ? '/dashboard' : redirectTo;

  // Automatically logs out unauthenticated or unauthorized users to clear invalid sessions
  useEffect(() => {
    if (!isAuthenticated || (isForbiddenRole && roleRedirect === redirectTo)) {
      logout();
    }
  }, [isAuthenticated, isForbiddenRole, logout, redirectTo, roleRedirect]);

  // Redirects to login page when no authenticated session exists
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Redirects to role-appropriate page when authenticated user lacks required permissions
  if (isForbiddenRole) {
    return <Navigate to={roleRedirect} replace />;
  }

  // Renders nested child routes when authentication and authorization both pass
  return <Outlet />;
}

// Default export registers the primary value.
export default ProtectedRoute;
