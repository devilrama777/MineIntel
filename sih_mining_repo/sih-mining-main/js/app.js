// SIH Mining Main Application Controller - Executive Edition

document.addEventListener("DOMContentLoaded", () => {
  App.init();
});

const App = {
  activeTab: "dashboard",
  activeDatasetId: "DS-2026-NATIONAL",
  selectedFile: null,
  pipelineInterval: null,
  pipelineStartTime: null,
  animationFrameId: null,
  factIntervalId: null,
  trendsChart: null,
  shareChart: null,

  factsList: [
    "Synthesizing colliery extraction logs across 432 operational basins...",
    "Auditing thermal power plant off-take ratios against national energy security reserves...",
    "Modeling opencast stripping ratios and heavy excavation equipment utilization...",
    "Calibrating mathematical variance matrices and verifying production quotas...",
    "Generating high-fidelity visual charts, distribution curves, and executive PDF report..."
  ],

  init: function() {
    this.checkAuth();
    this.renderRankingsTable();
    this.initEventListeners();
    this.initDragAndDrop();
    this.startHeaderClock();
    this.renderDashboardCharts();
    this.loadLatestSummary();
  },

  startHeaderClock: function() {
    const updateClock = () => {
      const el = document.getElementById("header-clock");
      if (!el) return;
      const now = new Date();
      const options = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
      el.innerText = `📅 ${now.toLocaleDateString('en-IN', options)}`;
    };
    updateClock();
    setInterval(updateClock, 1000);
  },

  checkAuth: function() {
    const session = typeof AuthController !== "undefined" ? AuthController.getSession() : null;
    const loginView = document.getElementById("view-login");
    const appView = document.getElementById("view-app");

    if (session) {
      if (loginView) loginView.classList.add("hidden");
      if (appView) {
        appView.classList.remove("hidden");
        appView.classList.add("flex");
      }
      const empIdEl = document.getElementById("session-emp-id");
      if (empIdEl) empIdEl.innerText = session.employeeId;
      setTimeout(() => this.renderDashboardCharts(), 150);
    } else {
      if (loginView) loginView.classList.remove("hidden");
      if (appView) {
        appView.classList.add("hidden");
        appView.classList.remove("flex");
      }
    }
  },

  initEventListeners: function() {
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => this.handleLogin(e));
    }
  },

  togglePasswordVisibility: function(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const pwd = document.getElementById("login-password");
    const eye = document.getElementById("eye-icon");
    if (!pwd) return;

    if (pwd.type === "password") {
      pwd.type = "text";
      if (eye) eye.innerText = "🙈";
    } else {
      pwd.type = "password";
      if (eye) eye.innerText = "👁️";
    }
  },

  handleLogin: async function(e, overrideEmpId = null) {
    if (e) {
      e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();
    }
    const empIdEl = document.getElementById("login-emp-id");
    const pwdEl = document.getElementById("login-password");
    const rememberEl = document.getElementById("remember-device");

    const empId = overrideEmpId || (empIdEl ? empIdEl.value.trim() : "");
    const pwd = pwdEl ? pwdEl.value : "";
    const remember = rememberEl ? rememberEl.checked : true;

    const spinner = document.getElementById("auth-spinner");
    const icon = document.getElementById("auth-icon");
    const text = document.getElementById("auth-btn-text");
    const btn = document.getElementById("btn-authenticate");

    if (spinner) spinner.classList.remove("hidden");
    if (icon) icon.classList.add("hidden");
    if (text) text.innerText = "Authenticating Session...";
    if (btn) btn.disabled = true;

    try {
      const session = await AuthController.login(empId, pwd, remember);
      if (spinner) spinner.classList.add("hidden");
      if (icon) icon.classList.remove("hidden");
      if (text) text.innerText = "Authenticate Session";
      if (btn) btn.disabled = false;

      this.checkAuth();
      this.showToast(`Welcome, ${session.employeeId} • Session Authenticated`, "success");
    } catch (err) {
      if (spinner) spinner.classList.add("hidden");
      if (icon) icon.classList.remove("hidden");
      if (text) text.innerText = "Authenticate Session";
      if (btn) btn.disabled = false;
      this.showToast(err.message || "Authentication failed", "error");
    }
  },

  handleLogout: function() {
    AuthController.logout();
    this.checkAuth();
    this.showToast("Signed out of secure session.", "info");
  },

  switchTab: function(tabId) {
    const tabs = ["dashboard", "datasets", "analytics", "reports", "system"];
    tabs.forEach(t => {
      const tabBtn = document.getElementById(`tab-${t}`);
      const tabView = document.getElementById(`view-${t}`);
      if (tabBtn) {
        if (t === tabId) {
          tabBtn.className = "py-3.5 text-sm font-semibold border-b-2 border-primary text-primary transition flex items-center space-x-2 shrink-0";
        } else {
          tabBtn.className = "py-3.5 text-sm font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition flex items-center space-x-2 shrink-0";
        }
      }
      if (tabView) {
        tabView.classList.toggle("hidden", t !== tabId);
      }
    });
    this.activeTab = tabId;

    if (tabId === "dashboard") {
      setTimeout(() => this.renderDashboardCharts(), 100);
    }
  },

  renderRankingsTable: function() {
    const tbody = document.getElementById("rankings-tbody");
    if (!tbody || typeof MOCK_COLLIERIES === "undefined") return;

    tbody.innerHTML = MOCK_COLLIERIES.slice(0, 7).map(c => {
      let medal = `#${c.rank}`;
      if (c.rank === 1) medal = `<span class="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-md">🥇 #1</span>`;
      if (c.rank === 2) medal = `<span class="px-2 py-0.5 bg-slate-200 text-slate-700 font-bold rounded-md">🥈 #2</span>`;
      if (c.rank === 3) medal = `<span class="px-2 py-0.5 bg-orange-100 text-orange-800 font-bold rounded-md">🥉 #3</span>`;

      const pct = Math.min(100, Math.round((c.production / c.target) * 100));

      return `
        <tr class="hover:bg-slate-50/80 transition">
          <td class="py-3 px-3 font-bold">${medal}</td>
          <td class="py-3 px-3 font-semibold text-slate-900">${c.name}</td>
          <td class="py-3 px-3 text-slate-600">${c.state}</td>
          <td class="py-3 px-3"><span class="px-2.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-full text-[11px] font-bold">${c.company}</span></td>
          <td class="py-3 px-3 text-right font-bold text-slate-900 mono">${c.production.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
          <td class="py-3 px-3 text-right">
            <div class="flex items-center justify-end space-x-2">
              <span class="text-xs font-bold text-slate-700 mono">${pct}%</span>
              <div class="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div class="bg-emerald-500 h-1.5 rounded-full" style="width: ${pct}%"></div>
              </div>
            </div>
          </td>
          <td class="py-3 px-3 text-right text-blue-700 font-bold mono">${c.share}</td>
        </tr>
      `;
    }).join("");
  },

  renderDashboardCharts: function() {
    if (typeof Chart === "undefined") return;

    // Line / Area Chart: 12-Month Trends
    const ctxTrends = document.getElementById("chart-production-trends");
    if (ctxTrends) {
      if (this.trendsChart) this.trendsChart.destroy();
      this.trendsChart = new Chart(ctxTrends, {
        type: 'line',
        data: {
          labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
          datasets: [
            {
              label: 'Actual Production (MT)',
              data: [10.2, 10.8, 11.1, 10.9, 11.4, 11.8, 12.1, 12.5, 12.8, 13.1, 13.4, 13.8],
              borderColor: '#1E3A8A',
              backgroundColor: 'rgba(30, 58, 138, 0.12)',
              fill: true,
              tension: 0.35,
              borderWidth: 2.5,
              pointBackgroundColor: '#1E3A8A',
              pointRadius: 3
            },
            {
              label: 'Target Allocation (MT)',
              data: [10.0, 10.5, 10.8, 11.0, 11.2, 11.5, 12.0, 12.2, 12.5, 12.8, 13.0, 13.5],
              borderColor: '#D97706',
              borderDash: [5, 5],
              borderWidth: 2,
              pointRadius: 0,
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0F172A',
              titleFont: { size: 12, weight: 'bold' },
              bodyFont: { size: 12 },
              padding: 10,
              cornerRadius: 8
            }
          },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: '#F1F5F9' }, min: 8 }
          }
        }
      });
    }

    // Doughnut Chart: Subsidiary Share
    const ctxShare = document.getElementById("chart-company-share");
    if (ctxShare) {
      if (this.shareChart) this.shareChart.destroy();
      this.shareChart = new Chart(ctxShare, {
        type: 'doughnut',
        data: {
          labels: ['SECL (Chhattisgarh)', 'MCL (Odisha)', 'NCL (Madhya Pradesh)', 'CCL & BCCL (Jharkhand)', 'ECL (West Bengal)'],
          datasets: [{
            data: [30.8, 23.6, 26.0, 15.6, 4.0],
            backgroundColor: ['#1E3A8A', '#059669', '#2563EB', '#D97706', '#9333EA'],
            borderWidth: 2,
            borderColor: '#FFFFFF'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
          },
          cutout: '70%'
        }
      });
    }
  },

  initDragAndDrop: function() {
    const dropzone = document.getElementById("dataset-dropzone");
    if (!dropzone) return;

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.add("border-blue-600", "bg-blue-100/40");
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.remove("border-blue-600", "bg-blue-100/40");
      }, false);
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt.files && dt.files.length) {
        this.processSelectedFile(dt.files[0]);
      }
    });
  },

  handleFileSelect: function(event) {
    if (event.target.files && event.target.files.length) {
      this.processSelectedFile(event.target.files[0]);
    }
  },

  processSelectedFile: function(file) {
    this.selectedFile = file;
    const nameEl = document.getElementById("selected-file-name");
    const pill = document.getElementById("selected-file-pill");
    const title = document.getElementById("dropzone-title");
    const subtitle = document.getElementById("dropzone-subtitle");
    const auditFile = document.getElementById("audit-filename");

    if (nameEl) nameEl.innerText = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    if (pill) pill.classList.remove("hidden");
    if (title) title.innerText = file.name;
    if (subtitle) subtitle.innerText = `Selected file: ${(file.size / 1024).toFixed(1)} KB • Ready for executive analysis`;
    if (auditFile) auditFile.innerText = file.name;

    this.showToast(`Selected ${file.name}. Generating preview...`, "info");
    this.fetchFilePreview(file);
  },

  clearSelectedFile: function(e) {
    if (e) e.stopPropagation();
    this.selectedFile = null;
    const fileInput = document.getElementById("dataset-file-input");
    if (fileInput) fileInput.value = "";
    const pill = document.getElementById("selected-file-pill");
    if (pill) pill.classList.add("hidden");
    const title = document.getElementById("dropzone-title");
    if (title) title.innerText = "Upload Coal or Mining Dataset (CSV / PDF)";
    const subtitle = document.getElementById("dropzone-subtitle");
    if (subtitle) subtitle.innerText = "Drag and drop your file here, or click to browse (supports CSV, TSV, XLSX, PDF)";
    const previewCard = document.getElementById("dataset-preview-card");
    if (previewCard) previewCard.classList.add("hidden");
    const auditFilename = document.getElementById("audit-filename");
    if (auditFilename) auditFilename.innerText = "None Selected";
    const auditRows = document.getElementById("audit-row-count");
    if (auditRows) auditRows.innerText = "-";
    const auditCols = document.getElementById("audit-col-count");
    if (auditCols) auditCols.innerText = "-";
  },

  fetchFilePreview: async function(file) {
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".tsv")) {
      document.getElementById("audit-row-count").innerText = "PDF Document";
      document.getElementById("audit-col-count").innerText = "Multi-page Text/Tables";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/pipeline/quick-preview", {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        document.getElementById("audit-row-count").innerText = `${data.rows} rows`;
        document.getElementById("audit-col-count").innerText = `${data.columns.length} columns`;
        document.getElementById("quality-gauge").innerText = "100%";
        document.getElementById("quality-status-text").innerText = "AUDIT VERIFIED";
        this.renderPreviewTable(data);
      }
    } catch (e) {
      console.log("Preview error:", e);
    }
  },

  renderPreviewTable: function(data) {
    const card = document.getElementById("dataset-preview-card");
    const thead = document.getElementById("dataset-preview-thead");
    const tbody = document.getElementById("dataset-preview-tbody");
    const badge = document.getElementById("preview-record-badge");

    if (!card || !thead || !tbody) return;

    badge.innerText = `First ${data.preview.length} of ${data.rows} records (${data.columns.length} columns)`;
    thead.innerHTML = `<tr>${data.columns.map(c => `<th class="py-2.5 px-3 border-b border-slate-200 font-bold">${c}</th>`).join("")}</tr>`;
    tbody.innerHTML = data.preview.map(row => `
      <tr class="hover:bg-slate-50">
        ${data.columns.map(col => `<td class="py-2 px-3 border-b border-slate-100 text-slate-700">${row[col] ?? ''}</td>`).join("")}
      </tr>
    `).join("");

    card.classList.remove("hidden");
  },

  startWaveformAnimation: function() {
    const canvas = document.getElementById("live-telemetry-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let step = 0;

    const resize = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    resize();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const mid = height / 2;

      // Primary Cyan Wave
      ctx.beginPath();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#38BDF8";
      for (let x = 0; x < width; x++) {
        const y = mid + Math.sin((x * 0.02) + (step * 0.08)) * 20 * Math.sin(x / width * Math.PI);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Secondary Emerald Wave
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#34D399";
      for (let x = 0; x < width; x++) {
        const y = mid + Math.cos((x * 0.03) - (step * 0.06)) * 14 * Math.sin(x / width * Math.PI);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      step++;
      this.animationFrameId = requestAnimationFrame(draw);
    };

    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = requestAnimationFrame(draw);
  },

  stopWaveformAnimation: function() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  },

  runSequentialPipeline: async function() {
    if (!this.selectedFile) {
      this.showToast("Please select or drop a CSV or PDF dataset first!", "error");
      document.getElementById("dataset-dropzone")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const btn = document.getElementById("btn-run-pipeline");
    const hub = document.getElementById("processing-hub");
    const resultsShowcase = document.getElementById("report-results-showcase");
    const progressBar = document.getElementById("pipeline-progress-bar");
    const timer = document.getElementById("pipeline-timer");
    const pctLabel = document.getElementById("processing-pct-label");
    const stageLabel = document.getElementById("processing-stage-label");
    const factText = document.getElementById("rotating-fact-text");
    const customCmd = document.getElementById("pipeline-custom-command")?.value?.trim() || "";

    btn.disabled = true;
    btn.classList.add("opacity-75");
    hub.classList.remove("hidden");
    if (resultsShowcase) resultsShowcase.classList.add("hidden");
    hub.scrollIntoView({ behavior: "smooth" });

    // Start Live Waveform
    this.startWaveformAnimation();

    // Start Rotating Facts
    let factIdx = 0;
    if (this.factIntervalId) clearInterval(this.factIntervalId);
    this.factIntervalId = setInterval(() => {
      factIdx = (factIdx + 1) % this.factsList.length;
      if (factText) {
        factText.style.opacity = '0';
        setTimeout(() => {
          factText.innerText = this.factsList[factIdx];
          factText.style.opacity = '1';
        }, 200);
      }
    }, 2200);

    // Elapsed Timer & Smooth Progress
    this.pipelineStartTime = Date.now();
    let currentPct = 15;
    if (this.pipelineInterval) clearInterval(this.pipelineInterval);
    this.pipelineInterval = setInterval(() => {
      const elapsed = ((Date.now() - this.pipelineStartTime) / 1000).toFixed(1);
      if (timer) timer.innerText = `${elapsed}s`;

      if (currentPct < 92) {
        currentPct += Math.random() * 6;
        if (currentPct > 92) currentPct = 92;
        const rounded = Math.round(currentPct);
        if (progressBar) progressBar.style.width = `${rounded}%`;
        if (pctLabel) pctLabel.innerText = `${rounded}%`;
      }
    }, 300);

    const formData = new FormData();
    formData.append("file", this.selectedFile);
    if (customCmd) {
      formData.append("custom_llama_command", customCmd);
    }

    try {
      const res = await fetch("/api/pipeline/run", {
        method: "POST",
        body: formData
      });

      clearInterval(this.pipelineInterval);
      clearInterval(this.factIntervalId);
      this.stopWaveformAnimation();

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const result = await res.json();
      
      // 100% Complete
      if (progressBar) progressBar.style.width = "100%";
      if (pctLabel) pctLabel.innerText = "100%";
      if (stageLabel) stageLabel.innerText = "Executive Report Compiled Successfully!";

      setTimeout(() => {
        hub.classList.add("hidden");
        this.displayExecutiveResults(result);
      }, 600);

    } catch (err) {
      clearInterval(this.pipelineInterval);
      clearInterval(this.factIntervalId);
      this.stopWaveformAnimation();
      hub.classList.add("hidden");
      this.showToast(`Analysis error: ${err.message}`, "error");
    } finally {
      btn.disabled = false;
      btn.classList.remove("opacity-75");
    }
  },

  displayExecutiveResults: function(result) {
    const showcase = document.getElementById("report-results-showcase");
    const content = document.getElementById("executive-summary-content");
    const actions = document.getElementById("dataset-result-actions");

    if (showcase) showcase.classList.remove("hidden");
    if (actions) actions.classList.remove("hidden");

    const rawText = result.final_report || result.llama_analysis || "Executive Summary Generated.";
    
    // Format text nicely into HTML
    let formatted = rawText
      .replace(/^# (.*$)/gim, '<h1 class="text-xl font-black text-slate-900 mt-4 mb-2">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-base font-bold text-blue-900 border-b border-slate-200 pb-1 mt-4 mb-2">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-sm font-bold text-slate-800 mt-3 mb-1">$1</h3>')
      .replace(/^\* (.*$)/gim, '<li class="ml-4 list-disc text-slate-700 py-0.5">$1</li>')
      .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-slate-700 py-0.5">$1</li>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-slate-900">$1</strong>')
      .replace(/\n\n/gim, '<p class="my-2"></p>');

    if (content) {
      content.innerHTML = `
        <div class="prose prose-slate max-w-none text-xs sm:text-sm">
          ${formatted}
        </div>
      `;
    }

    showcase.scrollIntoView({ behavior: "smooth" });
    this.showToast("Executive Report Ready! PDF & Excel Available for Download.", "success");
  },

  loadLatestSummary: async function() {
    try {
      const res = await fetch("/api/summary/latest");
      if (res.ok) {
        const data = await res.json();
        const content = document.getElementById("executive-summary-content");
        if (content && data.summary && !content.innerHTML.trim()) {
          this.displayExecutiveResults({ final_report: data.summary });
        }
      }
    } catch (e) {
      // Ignored
    }
  },

  runCppAnalytics: function() {
    if (typeof MiningAnalytics !== "undefined" && typeof MOCK_COLLIERIES !== "undefined") {
      const { stats, anomalies } = MiningAnalytics.detectAnomalies(MOCK_COLLIERIES);
      this.showToast(`Analyzed ${stats.count} Collieries • Distribution Spread: ±${Math.round(stats.stdDev)} MT`, "success");
    }
  },

  showToast: function(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    let bg = "bg-slate-900 text-white border border-slate-700";
    let icon = "ℹ️";
    if (type === "success") { bg = "bg-emerald-900 text-emerald-100 border border-emerald-700"; icon = "✓"; }
    if (type === "error") { bg = "bg-red-900 text-red-100 border border-red-700"; icon = "⚠️"; }

    toast.className = `toast-anim flex items-center space-x-2.5 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold ${bg} pointer-events-auto mb-2`;
    toast.innerHTML = `<span class="font-bold text-sm">${icon}</span><span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};

if (typeof window !== "undefined") {
  window.App = App;
}
