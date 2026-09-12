/**
 * Centralized Authentication & Profile Context.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, LoginCredentials, FirstRunSetupData } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: UserProfile | null;
  sessionToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requiresSetup: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  firstRunSetup: (data: FirstRunSetupData) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(authService.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [requiresSetup, setRequiresSetup] = useState<boolean>(false);

  const checkSession = async () => {
    setIsLoading(true);
    try {
      // 1. Check whether database requires first-run setup
      const status = await authService.getSetupStatus();
      setRequiresSetup(status.requires_setup);

      if (status.requires_setup) {
        setUser(null);
        setSessionToken(null);
        setIsLoading(false);
        return;
      }

      // 2. If token exists, validate session with backend
      const activeToken = authService.getToken();
      if (activeToken) {
        const validatedUser = await authService.validateSession();
        if (validatedUser) {
          setUser(validatedUser);
          setSessionToken(activeToken);
        } else {
          setUser(null);
          setSessionToken(null);
        }
      }
    } catch (e) {
      console.error('Session validation error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const session = await authService.login(credentials);
    setUser(session.user);
    setSessionToken(session.session_token);
  };

  const firstRunSetup = async (data: FirstRunSetupData) => {
    const session = await authService.firstRunSetup(data);
    setUser(session.user);
    setSessionToken(session.session_token);
    setRequiresSetup(false);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setSessionToken(null);
    await checkSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        sessionToken,
        isAuthenticated: !!user && !!sessionToken,
        isLoading,
        requiresSetup,
        login,
        firstRunSetup,
        logout,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
