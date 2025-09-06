import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Login from './components/Login';
import Mailbox from './components/Mailbox';
import { User } from './types';
import * as mailService from './services/mailService';
import { AUTH_TOKEN_KEY } from './constants';
import { SpinnerIcon } from './components/icons/SpinnerIcon';

export const AuthContext = React.createContext<{
  user: User | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
} | null>(null);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  // On app start, check for a token and verify it
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (token) {
        try {
          const verifiedUser = await mailService.verifyToken();
          setUser(verifiedUser);
        } catch (error) {
          console.error("Token verification failed:", error);
          localStorage.removeItem(AUTH_TOKEN_KEY);
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: loggedInUser } = await mailService.login(email, password);
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    setUser(loggedInUser);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }, []);

  const authContextValue = useMemo(() => ({
    user,
    login,
    logout,
  }), [user, login, logout]);
  
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <SpinnerIcon />
        </div>
    );
  }

  return (
    <AuthContext.Provider value={authContextValue}>
       <div className="min-h-screen text-gray-800 dark:text-gray-200">
        {user ? <Mailbox toggleTheme={toggleTheme} currentTheme={theme} /> : <Login />}
       </div>
    </AuthContext.Provider>
  );
};

export default App;
