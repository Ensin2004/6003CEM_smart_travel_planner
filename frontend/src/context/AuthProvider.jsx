import { useMemo, useState } from 'react';
import AuthContext from './authContext';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) return null;

    try {
      return JSON.parse(savedUser);
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });

  const value = useMemo(
    () => ({
      user,
      setUser,
      isAuthenticated: Boolean(user || localStorage.getItem('accessToken')),
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
