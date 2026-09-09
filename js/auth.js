// SIH Mining Secure Enclave Authentication Controller
// Authenticates against sovereign backend API and manages cryptographically signed sessions

const AuthController = {
  STORAGE_KEY: "sih_mining_auth_session",

  isAuthenticated: function() {
    return !!this.getSession();
  },

  getSession: function() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY) || sessionStorage.getItem(this.STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  login: async function(employeeId, password, rememberDevice = true) {
    if (!employeeId || employeeId.trim().length === 0) {
      throw new Error("Auditor Employee ID is required.");
    }
    if (!password || password.trim().length === 0) {
      throw new Error("Enclave Security Password is required.");
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officer_id: employeeId.trim(),
          password: password.trim(),
          remember_device: !!rememberDevice
        })
      });

      if (!response.ok) {
        let errDetail = "Authentication failed: Invalid credentials.";
        try {
          const errData = await response.json();
          if (errData && errData.detail) errDetail = errData.detail;
        } catch (_) {}
        throw new Error(errDetail);
      }

      const data = await response.json();
      const sessionData = {
        employeeId: data.officer_id || employeeId.trim(),
        name: data.name || "Authorized Auditor",
        role: data.role || "Senior Operational Auditor",
        department: data.department || "Ministry of Coal, GoI",
        token: data.token,
        loginTime: new Date().toISOString()
      };

      try {
        if (rememberDevice) {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionData));
        } else {
          sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionData));
        }
      } catch (storageErr) {
        console.warn("Storage quota or error:", storageErr);
      }

      return sessionData;
    } catch (err) {
      // In offline/demo scenario, if backend network is down, check fallback credentials
      if (err.message && err.message.includes("fetch")) {
        if (employeeId.trim() === "MOC-7890" && password === "SecureEnclave2026!") {
          const fallbackSession = {
            employeeId: "MOC-7890",
            name: "Authorized Auditor (Offline Mode)",
            role: "Senior Operational Auditor",
            department: "Ministry of Coal, GoI",
            token: "OFFLINE-TOKEN-MOC-7890",
            loginTime: new Date().toISOString()
          };
          if (rememberDevice) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(fallbackSession));
          } else {
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(fallbackSession));
          }
          return fallbackSession;
        }
      }
      throw err;
    }
  },

  verifySession: async function() {
    const session = this.getSession();
    if (!session || !session.token) return false;
    try {
      const res = await fetch("/api/auth/verify", {
        headers: { "Authorization": `Bearer ${session.token}` }
      });
      if (res.ok) return true;
      this.logout();
      return false;
    } catch (_) {
      return !!session.token;
    }
  },

  logout: async function() {
    try {
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    } catch (_) {}
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      sessionStorage.removeItem(this.STORAGE_KEY);
    } catch (e) {}
  }
};

if (typeof window !== "undefined") {
  window.AuthController = AuthController;
}
