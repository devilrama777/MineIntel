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
  AuthConfigStatus,
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
   * Note: The backend credentials are provided solely via environment variables.
   */
  public async getSetupStatus(): Promise<SetupStatus> {
    return { has_users: true, requires_setup: false };
  }

  /**
   * Proactively checks whether backend is reachable and authentication is configured.
   */
  public async checkAuthConfig(): Promise<AuthConfigStatus> {
    try {
      // 1. Probe health endpoint
      const healthResp = await fetch(`${API_BASE}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!healthResp.ok) {
        return {
          configured: false,
          reachable: true,
          message: `Backend server returned unexpected status: ${healthResp.status}`,
        };
      }

      // 2. Probe auth endpoint to check if environment credentials are set
      const probeResp = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officer_id: '', password: '' }),
      });

      if (probeResp.status === 503) {
        const errData = await probeResp.json().catch(() => ({}));
        return {
          configured: false,
          reachable: true,
          message:
            errData.detail ||
            'Authentication is unconfigured. Production credentials must be supplied via MINEINTEL_OFFICER_ID and MINEINTEL_AUTH_PASSWORD environment variables.',
        };
      }

      // If status is 401 or anything else, authentication is configured
      return {
        configured: true,
        reachable: true,
      };
    } catch {
      return {
        configured: false,
        reachable: false,
        message: 'Backend service is unreachable. Ensure the backend server is running and accessible.',
      };
    }
  }

  /**
   * First-run setup delegates to standard login since sovereign credentials
   * are provisioned exclusively via host environment variables.
   */
  public async firstRunSetup(data: FirstRunSetupData): Promise<AuthSession> {
    const captcha = await this.getCaptcha();
    return this.login({
      username: data.username,
      password: data.password,
      captcha_challenge_id: captcha.challenge_id,
      captcha_answer: data.captcha_answer || '',
    });
  }

  public async getCaptcha(): Promise<{ challenge_id: string; image: string; expires_in: number }> {
    const resp = await fetch(`${API_BASE}/api/auth/captcha`);
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.detail || 'Unable to load CAPTCHA.');
    return data;
  }

  /**
   * Authenticate officer with Employee ID / Username and Password.
   */
  public async login(credentials: LoginCredentials): Promise<AuthSession> {
    const payload = {
      officer_id: credentials.username.trim(),
      password: credentials.password.trim(),
      captcha_challenge_id: credentials.captcha_challenge_id,
      captcha_answer: credentials.captcha_answer.trim(),
    };

    let resp: Response;
    try {
      resp = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      const err: any = new Error(
        'Backend service unreachable: Unable to establish connection to MineIntel server.'
      );
      err.code = 'BACKEND_UNREACHABLE';
      err.status = 0;
      throw err;
    }

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      let errCode: string = 'AUTHENTICATION_REQUEST_FAILED';
      let message = errData.detail || 'Authentication failed.';

      if (resp.status === 503) {
        errCode = 'AUTHENTICATION_NOT_CONFIGURED';
        message =
          errData.detail ||
          'Authentication is unconfigured. Production credentials must be supplied via MINEINTEL_OFFICER_ID and MINEINTEL_AUTH_PASSWORD environment variables.';
      } else if (resp.status === 401) {
        errCode = 'AUTHENTICATION_REJECTED';
        message = errData.detail || 'Authentication failed: Invalid Officer ID or Enclave Password.';
      }

      const err: any = new Error(message);
      err.code = errCode;
      err.status = resp.status;
      throw err;
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

  public async getProfile(): Promise<UserProfile> {
    const resp = await fetch(`${API_BASE}/api/auth/profile`, { headers: this.getAuthHeader() });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.detail || 'Unable to load profile.');
    const profile = data.profile || data;
    const user: UserProfile = {
      id: profile.officer_id, username: profile.officer_id, display_name: profile.display_name,
      phone: profile.phone || '', email: profile.email || '', status: 'Active Sovereign Enclave',
      role: profile.role || 'Operational Auditor', created_at: profile.created_at || Date.now(), updated_at: profile.updated_at,
    };
    this.currentUser = user;
    try { sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user)); localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user)); } catch { /* non-blocking */ }
    return user;
  }

  public async updateProfile(data: { display_name: string; phone: string; email: string }): Promise<UserProfile> {
    const resp = await fetch(`${API_BASE}/api/auth/profile`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }, body: JSON.stringify(data) });
    const result = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(result.detail || 'Unable to save profile.');
    return this.getProfile();
  }

  public async changePassword(current_password: string, new_password: string): Promise<void> {
    const resp = await fetch(`${API_BASE}/api/auth/password`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }, body: JSON.stringify({ current_password, new_password }) });
    const result = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(result.detail || 'Unable to change password.');
    this.clearSession();
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

  /**
   * Create a new normal user account. Requires Master Officer credentials for authorization.
   */
  public async createUser(data: {
    master_officer_id: string;
    master_password: string;
    officer_id: string;
    password: string;
    display_name?: string;
    role?: string;
  }): Promise<{ success: boolean; message: string; user?: any }> {
    const resp = await fetch(`${API_BASE}/api/auth/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const resData = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(resData.detail || 'Failed to create user.');
    }
    return resData;
  }

  /**
   * List registered users. Requires valid active session.
   */
  public async listUsers(): Promise<any[]> {
    const resp = await fetch(`${API_BASE}/api/auth/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
    });
    if (!resp.ok) return [];
    const data = await resp.json().catch(() => ({}));
    return data.users || [];
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
