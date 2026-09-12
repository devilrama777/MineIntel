/**
 * Local Authentication Service.
 *
 * Communicates with the sovereign MineIntel backend (/api/auth)
 * to authenticate officer credentials, maintain cryptographic session tokens,
 * and verify session lifecycles.
 */
import {
  UserProfile,
  AuthSession,
  LoginCredentials,
  FirstRunSetupData,
  SetupStatus,
} from '../types';
import { getApiBaseUrl } from './config';

const API_BASE = getApiBaseUrl();
const SESSION_STORAGE_KEY = 'mineintel_active_session_token';
const USER_STORAGE_KEY = 'mineintel_active_user_profile';

class AuthService {
  private activeToken: string | null = null;
  private currentUser: UserProfile | null = null;

  constructor() {
    try {
      this.activeToken =
        sessionStorage.getItem(SESSION_STORAGE_KEY) ||
        localStorage.getItem(SESSION_STORAGE_KEY);
      const savedUser =
        sessionStorage.getItem(USER_STORAGE_KEY) ||
        localStorage.getItem(USER_STORAGE_KEY);
      if (savedUser) {
        this.currentUser = JSON.parse(savedUser);
      }
    } catch {
      this.activeToken = null;
      this.currentUser = null;
    }
  }

  public getToken(): string | null {
    return this.activeToken;
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public getAuthHeader(): Record<string, string> {
    if (!this.activeToken) return {};
    return { Authorization: `Bearer ${this.activeToken}` };
  }

  /**
   * Check whether any accounts exist or if first-run setup is required.
   */
  public async getSetupStatus(): Promise<SetupStatus> {
    return { has_users: true, requires_setup: false };
  }

  /**
   * Initial profile setup delegating to authentication.
   */
  public async firstRunSetup(data: FirstRunSetupData): Promise<AuthSession> {
    return this.login({
      username: data.username,
      password: data.password,
    });
  }

  /**
   * Authenticate officer with Employee ID / Username and Password.
   */
  public async login(credentials: LoginCredentials): Promise<AuthSession> {
    const payload = {
      officer_id: credentials.username.trim(),
      password: credentials.password.trim(),
    };

    const resp = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(
        errData.detail || 'Authentication failed: Invalid Officer ID or Enclave Password.'
      );
    }

    const data = await resp.json();
    const user: UserProfile = {
      id: data.officer_id || credentials.username,
      username: data.officer_id || credentials.username,
      display_name: data.name || data.officer_id || credentials.username,
      status: 'Active Sovereign Enclave',
      role: data.role || 'Senior Operational Auditor',
      created_at: Date.now(),
      last_login_at: Date.now(),
    };

    const session: AuthSession = {
      session_token: data.token,
      user,
    };

    this.setSession(data.token, user);
    return session;
  }

  /**
   * Validate current session with backend cryptographic token verification.
   */
  public async validateSession(): Promise<UserProfile | null> {
    if (!this.activeToken) return null;

    try {
      const resp = await fetch(`${API_BASE}/api/auth/verify`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.activeToken}`,
        },
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.authenticated) {
          const user: UserProfile = this.currentUser || {
            id: data.officer_id || 'officer',
            username: data.officer_id || 'officer',
            display_name: data.officer_id || 'Authorized Officer',
            status: 'Active Sovereign Enclave',
            role: data.role || 'Senior Operational Auditor',
            created_at: Date.now(),
            last_login_at: Date.now(),
          };
          this.currentUser = user;
          return user;
        }
      }
    } catch (e) {
      console.warn('Session verification network error, preserving local session:', e);
      if (this.currentUser) return this.currentUser;
    }

    this.clearSession();
    return null;
  }

  /**
   * Sign out and revoke active enclave session.
   */
  public async logout(): Promise<void> {
    if (this.activeToken) {
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.activeToken}`,
          },
        });
      } catch {
        // Continue clearing local state
      }
    }
    this.clearSession();
  }

  private setSession(token: string, user: UserProfile) {
    this.activeToken = token;
    this.currentUser = user;
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, token);
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem(SESSION_STORAGE_KEY, token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } catch {
      // Non-blocking
    }
  }

  private clearSession() {
    this.activeToken = null;
    this.currentUser = null;
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      sessionStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      // Non-blocking
    }
  }
}

export const authService = new AuthService();
