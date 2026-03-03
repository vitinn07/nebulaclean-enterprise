(function () {
  const TOKEN_KEY = 'nc_token';
  const USER_KEY = 'nc_user';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setAuth(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function authFetch(url, options = {}) {
    const token = getToken();
    const headers = { ...options.headers };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(url, { ...options, headers }).then((res) => {
      if (res.status === 401) {
        clearAuth();
        showScreen('login');
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      return res;
    });
  }

  function showToast(msg, isError = false) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.style.borderColor = isError ? 'rgba(255,75,129,0.6)' : 'rgba(56,217,150,0.6)';
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 4000);
  }

  function showScreen(name) {
    const login = document.getElementById('login-screen');
    const app = document.getElementById('app-screen');
    if (name === 'login') {
      if (login) login.classList.add('active');
      if (app) app.classList.remove('active');
    } else {
      if (login) login.classList.remove('active');
      if (app) app.classList.add('active');
    }
  }

  function renderAppWithUser(user) {
    document.getElementById('sidebar-username').textContent = user.username || '--';
    const roleEl = document.getElementById('sidebar-role');
    roleEl.textContent = user.role === 'ADMIN' ? 'Admin' : 'Usuário';
    roleEl.className = 'badge ' + (user.role === 'ADMIN' ? 'badge-admin' : 'badge-ok');

    document.querySelectorAll('.menu-admin').forEach((el) => {
      el.style.display = user.role === 'ADMIN' ? '' : 'none';
    });

    document.getElementById('welcome-msg').textContent =
      'Olá, ' + (user.username || 'usuário') + '. Você está logado como ' + (user.role === 'ADMIN' ? 'administrador' : 'usuário') + '.';
  }

  const titles = { dashboard: 'Dashboard', logs: 'Logs', schedule: 'Agendamento', network: 'Rede', admin: 'Usuários' };

  function setNavOpen(open) {
    const body = document.body;
    const btn = document.getElementById('menu-toggle');
    if (!body) return;
    if (open) {
      body.classList.add('nav-open');
      if (btn) btn.classList.add('is-open');
    } else {
      body.classList.remove('nav-open');
      if (btn) btn.classList.remove('is-open');
    }
  }

  function switchView(viewId) {
    document.querySelectorAll('.menu-item').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === viewId);
    });
    document.querySelectorAll('.view').forEach((v) => {
      v.classList.toggle('active', v.id === 'view-' + viewId);
    });
    document.getElementById('page-title').textContent = titles[viewId] || 'Dashboard';
    if (viewId === 'logs') loadLogs();
    if (viewId === 'schedule') loadSchedule();
    if (viewId === 'network') discoverMachines();
  }

  async function loadUsersList() {
    const list = document.getElementById('users-list');
    list.innerHTML = '<p class="muted">Carregando...</p>';
    try {
      const res = await authFetch('/api/users');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar usuários');
      const users = data.users || [];
      if (users.length === 0) {
        list.innerHTML = '<p class="muted">Nenhum usuário.</p>';
        return;
      }
      list.innerHTML = users
        .map(
          (u) =>
            '<div class="user-row">' +
            '<span class="user-name">' + escapeHtml(u.username) + '</span>' +
            '<span class="badge ' + (u.role === 'ADMIN' ? 'badge-admin' : 'badge-ok') + '">' + (u.role === 'ADMIN' ? 'Admin' : 'Usuário') + '</span>' +
            (u.lastLoginAt ? '<span class="muted small">Último login: ' + new Date(u.lastLoginAt).toLocaleString('pt-BR') + '</span>' : '') +
            '<button type="button" class="ghost-btn small btn-delete" data-id="' + escapeHtml(u.id) + '" data-username="' + escapeHtml(u.username) + '">Excluir</button>' +
            '</div>'
        )
        .join('');
      list.querySelectorAll('.btn-delete').forEach((btn) => {
        btn.addEventListener('click', () => deleteUser(btn.dataset.id, btn.dataset.username));
      });
    } catch (err) {
      list.innerHTML = '<p class="form-error">' + escapeHtml(err.message) + '</p>';
    }
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function parseStructuredLogs(raw) {
    if (!raw) return [];
    const blocks = raw.split(/\n\s*\n/);
    const entries = [];
    blocks.forEach((b) => {
      const block = b.trim();
      if (!block) return;
      const host = (block.match(/\[HOST:\s*([^\]]+)\]/i) || [])[1] || '';
      const ip = (block.match(/\[IP:\s*([^\]]+)\]/i) || [])[1] || '';
      const user = (block.match(/\[USER:\s*([^\]]+)\]/i) || [])[1] || '';
      const date = (block.match(/\[DATA:\s*([^\]]+)\]/i) || [])[1] || '';
      const time = (block.match(/\[HORA:\s*([^\]]+)\]/i) || [])[1] || '';
      const status = (block.match(/\[STATUS:\s*([^\]]+)\]/i) || [])[1] || '';
      const body = block
        .replace(/\[HOST:[^\]]+\]\s*/i, '')
        .replace(/\[IP:[^\]]+\]\s*/i, '')
        .replace(/\[USER:[^\]]+\]\s*/i, '')
        .replace(/\[DATA:[^\]]+\]\s*/i, '')
        .replace(/\[HORA:[^\]]+\]\s*/i, '')
        .replace(/\[STATUS:[^\]]+\]\s*/i, '')
        .trim();
      entries.push({
        host,
        ip,
        user,
        date,
        time,
        status,
        body
      });
    });
    return entries;
  }

  async function deleteUser(id, username) {
    if (!confirm('Excluir o usuário "' + username + '"?')) return;
    try {
      const res = await authFetch('/api/users/' + id, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha ao excluir');
      showToast('Usuário excluído.');
      loadUsersList();
    } catch (err) {
      showToast(err.message, true);
    }
  }

  async function loadLogs() {
    const listEl = document.getElementById('logs-list');
    const contentEl = document.getElementById('log-content');
    if (!listEl) return;
    listEl.innerHTML = '<p class="muted">Carregando...</p>';
    contentEl.textContent = '';
    try {
      const endpoint = getUser()?.role === 'ADMIN' ? '/api/logs/all' : '/api/logs/me';
      const res = await authFetch(endpoint);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar logs');
      const files = data.files || [];
      if (files.length === 0) {
        listEl.innerHTML = '<p class="muted">Nenhum log.</p>';
        return;
      }
      listEl.innerHTML = files.map(function (f) {
        return '<div class="log-file" data-file="' + escapeHtml(f.file) + '" title="' + escapeHtml(f.hostname) + '">' +
          escapeHtml(f.hostname) + ' <span class="muted small">' + (f.mtime ? new Date(f.mtime).toLocaleString('pt-BR') : '') + '</span></div>';
      }).join('');
      listEl.querySelectorAll('.log-file').forEach(function (el) {
        el.addEventListener('click', function () {
          listEl.querySelectorAll('.log-file').forEach(function (x) { x.classList.remove('active'); });
          el.classList.add('active');
          loadLogContent(el.dataset.file);
        });
      });
    } catch (err) {
      listEl.innerHTML = '<p class="form-error">' + escapeHtml(err.message) + '</p>';
    }
  }

  async function loadLogContent(file) {
    const contentEl = document.getElementById('log-content');
    if (!contentEl) return;
    contentEl.textContent = 'Carregando...';
    try {
      const res = await authFetch('/api/logs/file/' + encodeURIComponent(file));
      if (!res.ok) {
        contentEl.textContent = 'Log não encontrado ou acesso negado.';
        return;
      }
      const text = await res.text();
      const entries = parseStructuredLogs(text);
      if (!entries.length) {
        contentEl.textContent = text || '(vazio)';
        return;
      }
      contentEl.innerHTML = entries
        .map(function (e) {
          const statusLower = (e.status || '').toLowerCase();
          const isError = statusLower.indexOf('erro') >= 0 || statusLower.indexOf('fail') >= 0;
          const statusClass = isError ? 'log-entry-status-error' : 'log-entry-status-ok';
          return (
            '<article class="log-entry ' +
            statusClass +
            '">' +
            '<header class="log-entry-header">' +
            (e.host
              ? '<span class="log-tag log-tag-host">' + escapeHtml(e.host) + '</span>'
              : '') +
            (e.ip ? '<span class="log-tag log-tag-ip">' + escapeHtml(e.ip) + '</span>' : '') +
            (e.user
              ? '<span class="log-tag log-tag-user" title="Usuário">' + escapeHtml(e.user) + '</span>'
              : '') +
            (e.status
              ? '<span class="log-tag log-tag-status">' + escapeHtml(e.status) + '</span>'
              : '') +
            '</header>' +
            (e.date || e.time
              ? '<div class="log-entry-meta">' +
                (e.date ? '<span>' + escapeHtml(e.date) + '</span>' : '') +
                (e.time ? '<span>' + escapeHtml(e.time) + '</span>' : '') +
                '</div>'
              : '') +
            (e.body
              ? '<div class="log-entry-body">' + escapeHtml(e.body) + '</div>'
              : '<div class="log-entry-body log-entry-body-empty">(sem detalhes)</div>') +
            '</article>'
          );
        })
        .join('');
    } catch (err) {
      contentEl.textContent = err.message || 'Erro ao carregar.';
    }
  }

  async function loadSchedule() {
    try {
      const res = await authFetch('/api/schedule');
      const data = await res.ok ? await res.json() : {};
      document.getElementById('schedule-enabled').checked = !!data.enabled;
      document.getElementById('schedule-day').value = String(data.dayOfWeek ?? 1);
      document.getElementById('schedule-time').value = data.time || '03:00';
      document.getElementById('schedule-result').textContent = '';
    } catch (err) {
      document.getElementById('schedule-result').textContent = err.message || '';
    }
  }

  async function saveSchedule() {
    const resultEl = document.getElementById('schedule-result');
    resultEl.textContent = 'Salvando...';
    try {
      const res = await authFetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: document.getElementById('schedule-enabled').checked,
          dayOfWeek: parseInt(document.getElementById('schedule-day').value, 10),
          time: document.getElementById('schedule-time').value || '03:00'
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.details || 'Falha ao salvar');
      resultEl.textContent = 'Agendamento salvo.';
      showToast('Agendamento salvo.');
    } catch (err) {
      resultEl.textContent = err.message || 'Erro.';
      showToast(err.message, true);
    }
  }

  let networkMachinesList = [];
  async function discoverMachines() {
    const container = document.getElementById('network-machines');
    const resultEl = document.getElementById('network-result');
    if (!container) return;
    container.innerHTML = '';
    resultEl.textContent = 'Descobrindo...';
    try {
      const res = await authFetch('/api/clean/network/discover');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao descobrir');
      const machines = data.machines || [];
      networkMachinesList = machines;
      if (machines.length === 0) {
        container.innerHTML = '<p class="muted">Nenhuma máquina encontrada (arp).</p>';
      } else {
        container.innerHTML = machines.map(function (m) {
          return '<label><input type="checkbox" data-ip="' + escapeHtml(m.ip) + '" data-host="' + escapeHtml(m.hostname) + '" /> ' + escapeHtml(m.hostname) + ' (' + escapeHtml(m.ip) + ')</label>';
        }).join('');
      }
      resultEl.textContent = '';
    } catch (err) {
      resultEl.textContent = err.message || '';
    }
  }

  async function runNetworkClean() {
    const checked = document.querySelectorAll('#network-machines input:checked');
    const computers = Array.from(checked).map(function (c) { return c.dataset.ip || c.dataset.host; }).filter(Boolean);
    const resultEl = document.getElementById('network-result');
    if (computers.length === 0) {
      resultEl.textContent = 'Selecione ao menos uma máquina.';
      return;
    }
    resultEl.textContent = 'Executando...';
    try {
      const res = await authFetch('/api/clean/network/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ computers })
      });
      const data = await res.json().catch(() => ({}));
      resultEl.textContent = data.results ? data.results.map(function (r) {
        return (r.Computer || r.computer) + ': ' + (r.Success ? 'OK' : (r.Error || 'Erro'));
      }).join('; ') : (data.message || 'Concluído.');
      showToast(data.success ? 'Limpeza na rede executada.' : 'Algumas máquinas falharam.');
    } catch (err) {
      resultEl.textContent = err.message || '';
      showToast(err.message, true);
    }
  }

  async function runLocalClean() {
    const resultEl = document.getElementById('local-result');
    resultEl.textContent = 'Executando...';
    const btn = document.getElementById('btn-local-clean');
    btn.disabled = true;
    try {
      const res = await authFetch('/api/clean/local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simulation: document.getElementById('local-simulation').checked,
          runCleanmgr: document.getElementById('local-cleanmgr').checked,
          flushDns: document.getElementById('local-flushdns').checked,
          clearRecycleBin: document.getElementById('local-recycle').checked,
          runDism: document.getElementById('local-dism').checked
        })
      });
      const data = await res.json().catch(() => ({}));
      resultEl.textContent = data.success ? 'Concluído. ' + (data.stdout || '') : (data.stderr || data.error || 'Erro');
      showToast(data.success ? 'Limpeza local concluída.' : 'Falha na limpeza.', !data.success);
    } catch (err) {
      resultEl.textContent = err.message || '';
      showToast(err.message, true);
    } finally {
      btn.disabled = false;
    }
  }

  async function runMemoryClean() {
    const resultEl = document.getElementById('memory-result');
    resultEl.textContent = 'Executando...';
    const btn = document.getElementById('btn-memory-clean');
    btn.disabled = true;
    try {
      const res = await authFetch('/api/clean/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runGC: document.getElementById('mem-gc').checked,
          restartExplorer: document.getElementById('mem-explorer').checked,
          flushDns: document.getElementById('mem-flushdns').checked
        })
      });
      const data = await res.json().catch(() => ({}));
      resultEl.textContent = data.success ? 'Concluído.' : (data.stderr || data.error || 'Erro');
      showToast(data.success ? 'Limpeza de memória concluída.' : 'Falha.', !data.success);
    } catch (err) {
      resultEl.textContent = err.message || '';
      showToast(err.message, true);
    } finally {
      btn.disabled = false;
    }
  }

  function openModal() {
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById('modal-overlay').setAttribute('aria-hidden', 'false');
    document.getElementById('new-user-error').textContent = '';
    document.getElementById('form-new-user').reset();
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
    document.getElementById('modal-overlay').setAttribute('aria-hidden', 'true');
  }

  function init() {
    const token = getToken();
    const user = getUser();

    if (!token || !user) {
      showScreen('login');
    } else {
      showScreen('app');
      renderAppWithUser(user);
      authFetch('/api/users/me')
        .then((r) => r.json())
        .then((data) => {
          if (data.user) {
            setAuth(token, data.user);
            renderAppWithUser(data.user);
          }
        })
        .catch(() => {});
    }

    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('login-btn');
      const errEl = document.getElementById('login-error');
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;
      errEl.textContent = '';
      btn.disabled = true;
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || data.details?.[0] || 'Falha no login');
        setAuth(data.token, data.user);
        showScreen('app');
        renderAppWithUser(data.user);
        showToast('Login realizado.');
      } catch (err) {
        const isNetwork = err.message === 'Failed to fetch' || err.name === 'TypeError';
        errEl.textContent = isNetwork
          ? 'Não foi possível conectar ao servidor. Inicie com "npm start" e acesse por http://localhost:3000'
          : (err.message || 'Erro ao entrar.');
      } finally {
        btn.disabled = false;
      }
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
      clearAuth();
      showScreen('login');
      showToast('Você saiu.');
    });

    document.querySelectorAll('.menu-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        if (view === 'admin') loadUsersList();
        switchView(view);
        setNavOpen(false);
      });
    });

    const menuToggle = document.getElementById('menu-toggle');
    const navOverlay = document.getElementById('nav-overlay');
    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        const open = !document.body.classList.contains('nav-open');
        setNavOpen(open);
      });
    }
    if (navOverlay) {
      navOverlay.addEventListener('click', () => setNavOpen(false));
    }

    document.getElementById('btn-refresh-logs')?.addEventListener('click', loadLogs);
    document.getElementById('btn-local-clean')?.addEventListener('click', runLocalClean);
    document.getElementById('btn-memory-clean')?.addEventListener('click', runMemoryClean);
    document.getElementById('btn-save-schedule')?.addEventListener('click', saveSchedule);
    document.getElementById('btn-discover')?.addEventListener('click', discoverMachines);
    document.getElementById('btn-network-run')?.addEventListener('click', runNetworkClean);

    document.getElementById('btn-new-user').addEventListener('click', openModal);
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') closeModal();
    });

    document.getElementById('form-new-user').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('new-user-error');
      errEl.textContent = '';
      const username = document.getElementById('new-username').value.trim();
      const password = document.getElementById('new-password').value;
      const role = document.getElementById('new-role').value;
      try {
        const res = await authFetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, role })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.details?.[0] || 'Falha ao criar usuário');
        showToast('Usuário criado.');
        closeModal();
        loadUsersList();
      } catch (err) {
        errEl.textContent = err.message || 'Erro ao criar usuário.';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
