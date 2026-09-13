/**
 * Centralized Authentication & Profile Context.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, LoginCredentials, FirstRunSetupData, AuthState, AuthConfigStatus } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: UserProfile | null;
  sessionToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authConfigStatus: AuthConfigStatus | null;
  authState: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  firstRunSetup: (data: FirstRunSetupData) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  refreshAuthConfig: () => Promise<AuthConfigStatus>;
  refreshProfile: () => Promise<UserProfile>;
  updateProfile: (data: { display_name: string; phone: string; email: string }) => Promise<UserProfile>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(authService.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authConfigStatus, setAuthConfigStatus] = useState<AuthConfigStatus | null>(null);
  const [authState, setAuthState] = useState<AuthState>('IDLE');

  const refreshAuthConfig = async (): Promise<AuthConfigStatus> => {
    const status = await authService.checkAuthConfig();
    setAuthConfigStatus(status);
    if (!status.reachable) {
      setAuthState('BACKEND_UNREACHABLE');
    } else if (!status.configured) {
      setAuthState('AUTHENTICATION_NOT_CONFIGURED');
    } else {
      setAuthState('AUTHENTICATION_CONFIGURED');
    }
    return status;
  };

  const checkSession = async () => {
    setIsLoading(true);
    try {
      // 1. Proactively check backend connectivity and authentication configuration
      const status = await refreshAuthConfig();

      // 2. If token exists, validate session with backend
      const activeToken = authService.getToken();
      if (activeToken && status.reachable) {
        const validatedUser = await authService.validateSession();
        if (validatedUser) {
          setUser(validatedUser);
          setSessionToken(activeToken);
          setAuthState('AUTHENTICATION_SUCCESSFUL');
        } else {
          setUser(null);
          setSessionToken(null);
        }
      }
    } catch (e) {
      console.error('Session validation error:', e);
      setAuthState('BACKEND_UNREACHABLE');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const session = await authService.login(credentials);
      setUser(session.user);
      setSessionToken(session.session_token);
      setAuthState('AUTHENTICATION_SUCCESSFUL');
    } catch (err: any) {
      if (err.code === 'AUTHENTICATION_NOT_CONFIGURED') {
        setAuthState('AUTHENTICATION_NOT_CONFIGURED');
      } else if (err.code === 'AUTHENTICATION_REJECTED') {
        setAuthState('AUTHENTICATION_REJECTED');
      } else if (err.code === 'BACKEND_UNREACHABLE') {
        setAuthState('BACKEND_UNREACHABLE');
      } else {
        setAuthState('AUTHENTICATION_REQUEST_FAILED');
      }
      throw err;
    }
  };

  const firstRunSetup = async (data: FirstRunSetupData) => {
    await login({
      username: data.username,
      password: data.password,
      captcha_challenge_id: '',
      captcha_answer: '',
    });
  };

  const refreshProfile = async () => {
    const profile = await authService.getProfile();
    setUser(profile);
    return profile;
  };

  const updateProfile = async (data: { display_name: string; phone: string; email: string }) => {
    const profile = await authService.updateProfile(data);
    setUser(profile);
    return profile;
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await authService.changePassword(currentPassword, newPassword);
    setUser(null);
    setSessionToken(null);
    setAuthState('IDLE');
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
        authConfigStatus,
        authState,
        login,
        firstRunSetup,
        logout,
        checkSession,
        refreshAuthConfig,
        refreshProfile,
        updateProfile,
        changePassword,
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
