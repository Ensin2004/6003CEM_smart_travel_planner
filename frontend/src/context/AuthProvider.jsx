/**
 * Auth Provider module.
 * Provider state exposes shared values and actions to nested React screens.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { logoutSession } from '../api/authApi';
import AuthContext from './authContext';

// Default idle timeout configuration for automatic session expiration
const DEFAULT_IDLE_TIMEOUT_MINUTES = 30;
const idleTimeoutMinutes = Number(import.meta.env.VITE_IDLE_TIMEOUT_MINUTES || DEFAULT_IDLE_TIMEOUT_MINUTES);
const IDLE_TIMEOUT_MS = Math.max(idleTimeoutMinutes, 1) * 60 * 1000;

// Clears all stored session data from local storage
const clearStoredSession = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('lastActivityAt');
};

export function AuthProvider({ children }) {
  // Initializes user state from stored session data
  const [user, setUser] = useState(() => {
    const savedToken = localStorage.getItem('accessToken');
    const savedUser = localStorage.getItem('user');
    if (!savedToken || !savedUser) {
      clearStoredSession();
      return null;
    }
    try {
      return JSON.parse(savedUser);
    } catch {
      clearStoredSession();
      return null;
    }
  });

  // Logout function that clears session, revokes token, and optionally redirects
  const logout = useCallback(({ redirect = false, revoke = true } = {}) => {
    const refreshToken = localStorage.getItem('refreshToken');

    if (revoke && refreshToken) {
      logoutSession({ refreshToken }).catch(() => {});
    }

    clearStoredSession();
    setUser(null);
    if (redirect && window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  }, []);

  // Sets up idle session monitoring with activity detection
  useEffect(() => {
    if (!user || !localStorage.getItem('accessToken')) {
      return undefined;
    }

    const activityEvents = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
    let lastActivityWriteAt = 0;

    // Marks user activity timestamp in local storage with throttling
    const markActivity = () => {
      if (Date.now() - lastActivityWriteAt < 10000) {
        return;
      }

      lastActivityWriteAt = Date.now();
      localStorage.setItem('lastActivityAt', String(Date.now()));
    };

    // Checks if the session has exceeded the idle timeout
    const checkIdleSession = () => {
      const lastActivityAt = Number(localStorage.getItem('lastActivityAt') || Date.now());

      if (Date.now() - lastActivityAt >= IDLE_TIMEOUT_MS) {
        logout({ redirect: true });
      }
    };

    markActivity();
    activityEvents.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }));
    const idleInterval = window.setInterval(checkIdleSession, 30 * 1000);

    // Cleanup prevents state updates after component unmount.
    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, markActivity));
      window.clearInterval(idleInterval);
    };
  }, [logout, user]);

  // Memoized context value for auth state and methods
  const value = useMemo(
    () => ({
      user,
      setUser,
      logout,
      isAuthenticated: Boolean(user && localStorage.getItem('accessToken')),
    }),
    [logout, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
