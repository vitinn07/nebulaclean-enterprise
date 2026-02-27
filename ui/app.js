const api = {
  async getStatus() {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error('Falha ao obter status');
    return res.json();
  },
  async startClean(simulation, selectedTargetIds) {
    const res = await fetch('/api/start-clean', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Simulation: simulation, SelectedTargetIds: selectedTargetIds })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao iniciar limpeza');
    return data;
  },
  async getProgress() {
    const res = await fetch('/api/progress');
    if (!res.ok) throw new Error('Falha ao obter progresso');
    return res.json();
  },
  async getLogs(last = 200) {
    const res = await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Last: last })
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Falha ao obter logs');
    return data;
  },
  async getConfig() {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Falha ao obter configuracao');
    return res.json();
  },
  async saveConfig(config) {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao salvar configuracao');
    return data;
  }
};

const ui = {
  state: {
    config: null,
    progressInterval: null,
    simulation: true
  },

  init() {
    this.cacheElements();
    this.bindEvents();
    this.loadInitialData();
  },

  cacheElements() {
    this.menuItems = document.querySelectorAll('.menu-item');
    this.views = document.querySelectorAll('.view');
    this.adminStatus = document.getElementById('adminStatus');
    this.adminBadge = document.getElementById('adminBadge');
    this.simulationToggle = document.getElementById('simulationToggle');
    this.modeBadge = document.getElementById('modeBadge');
    this.startCleanBtn = document.getElementById('startCleanBtn');
    this.progressLabel = document.getElementById('progressLabel');
    this.progressPercent = document.getElementById('progressPercent');
    this.progressBarInner = document.getElementById('progressBarInner');
    this.progressTarget = document.getElementById('progressTarget');
    this.progressFreed = document.getElementById('progressFreed');
    this.diskRingFg = document.getElementById('diskRingFg');
    this.diskUsedPct = document.getElementById('diskUsedPct');
    this.diskTotal = document.getElementById('diskTotal');
    this.diskUsed = document.getElementById('diskUsed');
    this.diskFree = document.getElementById('diskFree');
    this.targetsList = document.getElementById('targetsList');
    this.logsContainer = document.getElementById('logsContainer');
    this.refreshLogsBtn = document.getElementById('refreshLogsBtn');
    this.settingsTargets = document.getElementById('settingsTargets');
    this.scheduleEnabled = document.getElementById('scheduleEnabled');
    this.scheduleTime = document.getElementById('scheduleTime');
    this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
    this.toast = document.getElementById('toast');
    this.centralActionCard = document.querySelector('.central-action');
  },

  bindEvents() {
    this.menuItems.forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        this.switchView(view);
      });
    });

    this.simulationToggle.addEventListener('change', () => {
      this.state.simulation = this.simulationToggle.checked;
      this.updateModeBadge();
    });

    this.startCleanBtn.addEventListener('click', () => this.startCleaning());

    this.refreshLogsBtn.addEventListener('click', () => this.loadLogs());

    this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
  },

  async loadInitialData() {
    try {
      const status = await api.getStatus();
      this.state.config = status.Config;
      this.updateDisk(status.Disk);
      this.renderTargets(status.Config.Targets);
      this.renderSettingsTargets(status.Config.Targets);
      this.updateAdmin(status.IsAdmin);
      this.applySchedule(status.Config.Schedule);
      this.updateModeBadge();
      this.pollProgress();
      this.loadLogs();
    } catch (err) {
      this.showToast(err.message || 'Falha ao carregar dados iniciais', true);
    }
  },

  switchView(viewId) {
    this.menuItems.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === viewId);
    });
    this.views.forEach((v) => {
      v.classList.toggle('active', v.id === `view-${viewId}`);
    });
  },

  updateAdmin(isAdmin) {
    if (isAdmin) {
      this.adminStatus.textContent = 'Modo administrador ativo';
      this.adminStatus.classList.remove('warn');
      this.adminStatus.classList.add('ok');
      this.adminBadge.textContent = 'Administrador';
      this.adminBadge.classList.add('badge-admin');
      this.adminBadge.classList.remove('badge-ok');
    } else {
      this.adminStatus.textContent = 'Sem privilégios administrativos (algumas pastas serão ignoradas)';
      this.adminStatus.classList.remove('ok');
      this.adminStatus.classList.add('warn');
      this.adminBadge.textContent = 'Permissão limitada';
      this.adminBadge.classList.remove('badge-admin');
      this.adminBadge.classList.add('badge-ok');
    }
  },

  updateModeBadge() {
    const sim = this.state.simulation;
    this.modeBadge.textContent = sim ? 'Simulação' : 'Modo efetivo';
    this.modeBadge.classList.toggle('badge-sim', sim);
    this.modeBadge.classList.toggle('badge-live', !sim);
  },

  formatBytes(bytes) {
    if (bytes == null) return '--';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let value = bytes;
    while (value >= 1024 && i < units.length - 1) {
      value /= 1024;
      i++;
    }
    return `${value.toFixed(1)} ${units[i]}`;
  },

  updateDisk(disk) {
    if (!disk) return;
    const circumference = 2 * Math.PI * 52;
    const offset = circumference * (1 - disk.UsedPct / 100);
    this.diskRingFg.style.strokeDasharray = `${circumference}`;
    this.diskRingFg.style.strokeDashoffset = `${offset}`;
    this.diskUsedPct.textContent = `${disk.UsedPct}%`;
    this.diskTotal.textContent = this.formatBytes(disk.Total);
    this.diskUsed.textContent = this.formatBytes(disk.Used);
    this.diskFree.textContent = this.formatBytes(disk.Free);
  },

  renderTargets(targets) {
    this.targetsList.innerHTML = '';
    if (!targets) return;
    targets.forEach((t) => {
      const el = document.createElement('div');
      el.className = 'target-item';
      el.innerHTML = `
        <div class="target-main">
          <span class="target-name">${t.Name}</span>
          <span class="target-path">${t.Path}</span>
        </div>
        <div class="target-flags">
          <span class="badge">${t.Enabled ? 'Ativo' : 'Inativo'}</span>
          ${t.RequiresAdmin ? '<span class="badge badge-admin">Admin</span>' : ''}
        </div>
      `;
      this.targetsList.appendChild(el);
    });
  },

  renderSettingsTargets(targets) {
    this.settingsTargets.innerHTML = '';
    if (!targets) return;
    targets.forEach((t, index) => {
      const row = document.createElement('div');
      row.className = 'settings-targets-item';
      row.innerHTML = `
        <div>
          <div class="target-name">${t.Name}</div>
          <div class="target-path">${t.Path}</div>
        </div>
        <label class="switch">
          <input type="checkbox" data-target-index="${index}" ${t.Enabled ? 'checked' : ''}/>
          <span class="slider"></span>
        </label>
      `;
      this.settingsTargets.appendChild(row);
    });
  },

  applySchedule(schedule) {
    if (!schedule) return;
    this.scheduleEnabled.checked = !!schedule.Enabled;
    if (schedule.Time) {
      this.scheduleTime.value = schedule.Time;
    }
  },

  async startCleaning() {
    try {
      this.startCleanBtn.disabled = true;
      const selectedIds = (this.state.config?.Targets || [])
        .filter((t) => t.Enabled)
        .map((t) => t.Id);
      const sim = this.state.simulation;

      if (!confirm(sim ? 'Iniciar simulação de limpeza?' : 'Confirmar limpeza efetiva dos arquivos temporários selecionados?')) {
        this.startCleanBtn.disabled = false;
        return;
      }

      this.progressLabel.textContent = sim ? 'Simulação em andamento...' : 'Limpando arquivos...';
      this.progressTarget.textContent = 'Preparando lista de arquivos...';
      this.progressBarInner.classList.add('indeterminate');

      await api.startClean(sim, selectedIds);
      this.showToast(sim ? 'Simulação iniciada.' : 'Limpeza iniciada.');

      if (!this.state.progressInterval) {
        this.pollProgress();
      }
    } catch (err) {
      this.showToast(err.message || 'Erro ao iniciar limpeza', true);
    } finally {
      this.startCleanBtn.disabled = false;
    }
  },

  pollProgress() {
    if (this.state.progressInterval) {
      clearInterval(this.state.progressInterval);
    }
    const tick = async () => {
      try {
        const p = await api.getProgress();
        this.updateProgress(p);
      } catch (err) {
        console.error(err);
      }
    };
    tick();
    this.state.progressInterval = setInterval(tick, 500);
  },

  updateProgress(p) {
    if (!p) return;
    if (this.centralActionCard) {
      if (p.Status === 'running') this.centralActionCard.classList.add('running');
      else this.centralActionCard.classList.remove('running');
    }
    const phase = p.Phase || 'idle';
    const isEnumerating = phase === 'enumerating' || (p.Status === 'running' && (p.Total === 0 || p.Total === undefined));

    this.progressPercent.textContent = isEnumerating ? '…' : `${p.Percent || 0}%`;
    this.progressLabel.textContent =
      p.Status === 'running'
        ? isEnumerating
          ? 'Listando pastas...'
          : p.Simulation
            ? 'Simulação em andamento...'
            : 'Limpando arquivos...'
        : p.Status === 'completed'
          ? 'Limpeza concluída'
          : 'Aguardando...';

    if (p.Status === 'running' && isEnumerating) {
      this.progressBarInner.classList.add('indeterminate');
      this.progressBarInner.style.width = '';
      this.progressTarget.textContent = p.CurrentTarget || 'Preparando lista de arquivos...';
    } else if (p.Status === 'running') {
      this.progressBarInner.classList.remove('indeterminate');
      this.progressBarInner.style.width = `${p.Percent || 0}%`;
      this.progressTarget.textContent = p.CurrentTarget
        ? `${p.CurrentTarget} — ${p.Processed || 0} / ${p.Total || 0} itens`
        : 'Processando...';
    } else if (p.Status === 'completed') {
      this.progressBarInner.classList.remove('indeterminate');
      this.progressBarInner.style.width = '100%';
      this.progressTarget.textContent = 'Última execução concluída.';
    } else {
      this.progressBarInner.classList.remove('indeterminate');
      this.progressBarInner.style.width = '0%';
      this.progressTarget.textContent = 'Nenhuma limpeza em andamento.';
    }

    const freed = this.formatBytes(p.FreedBytes || 0);
    this.progressFreed.textContent = `Espaço estimado: ${freed}`;
  },

  async loadLogs() {
    try {
      const data = await api.getLogs(300);
      const lines = data.Lines || [];
      this.logsContainer.textContent = lines.join('\n');
      this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
    } catch (err) {
      this.showToast(err.message || 'Erro ao carregar logs', true);
    }
  },

  async saveSettings() {
    try {
      if (!this.state.config) return;

      const targetSwitches = this.settingsTargets.querySelectorAll('input[data-target-index]');
      targetSwitches.forEach((input) => {
        const idx = Number(input.dataset.targetIndex);
        if (this.state.config.Targets[idx]) {
          this.state.config.Targets[idx].Enabled = input.checked;
        }
      });

      const enabled = this.scheduleEnabled.checked;
      const time = this.scheduleTime.value || '03:00';
      this.state.config.Schedule = {
        Enabled: enabled,
        Time: time
      };

      const result = await api.saveConfig(this.state.config);
      this.showToast(result.message || 'Configurações salvas.');
    } catch (err) {
      this.showToast(err.message || 'Erro ao salvar configurações', true);
    }
  },

  showToast(message, isError = false) {
    if (!this.toast) return;
    this.toast.textContent = message;
    this.toast.style.borderColor = isError ? 'rgba(255,75,129,0.6)' : 'rgba(56,217,150,0.6)';
    this.toast.classList.add('show');
    clearTimeout(this.toast._hideTimeout);
    this.toast._hideTimeout = setTimeout(() => {
      this.toast.classList.remove('show');
    }, 4000);
  }
};

document.addEventListener('DOMContentLoaded', () => ui.init());

