/**
 * Attendance Pro — App Logic
 * ========================================
 * Vanilla JS / LocalStorage State Management
 * Designed for the 研修課題５ requirements
 */

const App = (() => {
  // ==========================================
  //  CONFIGURATION
  //  GASをデプロイしたら、このURLを書き換えてください
  // ==========================================
  const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycby5ebEviQFx_NA3tvxZCpnWz0F2OfGY7iPcJuEJGxVNA5xL6jxx2V0GIFeAC4RJaafB/exec";

  // ==========================================
  //  STATE
  // ==========================================
  let state = {
    status: 'out',       // 'in' | 'out'
    userName: '',
    userId: 'user01',    // 研修生ID（固定）
    clockInTime: null    // ISO string
  };

  // ==========================================
  //  DOM CACHE
  // ==========================================
  const el = {};

  // ==========================================
  //  PWA INSTALL
  // ==========================================
  let _deferredInstallPrompt = null;

  // ==========================================
  //  INITIALIZE
  // ==========================================
  const init = () => {
    // Cache DOM
    el.userNameInput    = document.getElementById('user-name-input');
    el.statusBadge      = document.getElementById('status-badge');
    el.statusText       = document.getElementById('status-text');
    el.btnClockIn       = document.getElementById('btn-clock-in');
    el.btnClockOut      = document.getElementById('btn-clock-out');
    el.btnReport        = document.getElementById('btn-report');
    el.taskUrl          = document.getElementById('task-url');
    el.toastContainer   = document.getElementById('toast-container');
    el.clockInMeta      = document.getElementById('clock-in-meta');
    el.clockInSince     = document.getElementById('clock-in-since');
    el.liveTime         = document.getElementById('live-time');
    el.liveDate         = document.getElementById('live-date');
    el.installHint      = document.getElementById('install-hint');
    el.btnInstall       = document.getElementById('btn-install');
    el.footerYear       = document.getElementById('footer-year');

    // Footer year
    if (el.footerYear) el.footerYear.textContent = new Date().getFullYear();

    // Auto-fill app URL field with current page href
    if (el.taskUrl) {
      el.taskUrl.value = window.location.href.split('?')[0];
    }

    // Service Worker (PWA)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('[SW] Registered:', reg.scope))
        .catch(err => console.warn('[SW] Failed:', err));
    }

    // PWA Install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      _deferredInstallPrompt = e;
      if (el.installHint) el.installHint.classList.add('show');
    });

    if (el.btnInstall) {
      el.btnInstall.addEventListener('click', async () => {
        if (!_deferredInstallPrompt) return;
        _deferredInstallPrompt.prompt();
        const { outcome } = await _deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') {
          if (el.installHint) el.installHint.classList.remove('show');
        }
        _deferredInstallPrompt = null;
      });
    }

    // Restore state from localStorage
    loadState();

    // Name input
    el.userNameInput.addEventListener('input', (e) => {
      state.userName = e.target.value.trim();
      saveState();
    });

    // Live clock
    updateClock();
    setInterval(updateClock, 1000);

    // Initial render
    render();
  };

  // ==========================================
  //  LIVE CLOCK
  // ==========================================
  const DAYS = ['日', '月', '火', '水', '木', '金', '土'];

  const updateClock = () => {
    const now = new Date();
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());

    if (el.liveTime) el.liveTime.textContent = `${hh}:${mm}:${ss}`;
    if (el.liveDate) {
      const y = now.getFullYear();
      const mo = now.getMonth() + 1;
      const d = now.getDate();
      const w = DAYS[now.getDay()];
      el.liveDate.textContent = `${y}年${mo}月${d}日（${w}）`;
    }
  };

  // ==========================================
  //  STATE PERSISTENCE
  // ==========================================
  const loadState = () => {
    try {
      const saved = localStorage.getItem('attendance_pro_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
        if (state.userName) el.userNameInput.value = state.userName;
      }
    } catch (e) {
      console.warn('[State] Load error:', e);
    }
  };

  const saveState = () => {
    try {
      localStorage.setItem('attendance_pro_v2', JSON.stringify(state));
    } catch (e) {
      console.warn('[State] Save error:', e);
    }
    render();
  };

  // ==========================================
  //  RENDER / UI
  // ==========================================
  const render = () => {
    const isIn    = state.status === 'in';
    const hasName = !!state.userName;

    // Status badge
    if (isIn) {
      el.statusBadge.className = 'badge-in';
      el.statusBadge.innerHTML = `<span class="dot"></span><span id="status-text">勤務中</span>`;
      if (state.clockInTime) {
        const d = new Date(state.clockInTime);
        el.clockInSince.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
        el.clockInMeta.classList.add('visible');
      }
    } else {
      el.statusBadge.className = 'badge-out';
      el.statusBadge.innerHTML = `<span class="dot"></span><span id="status-text">未出勤</span>`;
      el.clockInMeta.classList.remove('visible');
    }

    // Button states
    el.btnClockIn.disabled  = !hasName || isIn;
    el.btnClockOut.disabled = !hasName || !isIn;
    el.btnReport.disabled   = !hasName;
  };

  // ==========================================
  //  BUTTON LOADING STATE
  // ==========================================
  const setLoading = (btn, isLoading) => {
    const text    = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.btn-spinner');
    if (isLoading) {
      btn.disabled = true;
      text.style.opacity = '0';
      spinner.style.display = 'block';
    } else {
      text.style.opacity = '1';
      spinner.style.display = 'none';
      render();
    }
  };

  // ==========================================
  //  TOAST NOTIFICATIONS
  // ==========================================
  const toast = (message, type = 'success') => {
    const icons = {
      success: `<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>`,
      error:   `<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>`,
      info:    `<path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>`
    };
    const div = document.createElement('div');
    div.className = `toast toast-${type}`;
    div.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">${icons[type] || icons.info}</svg>
      <span>${message}</span>
    `;
    el.toastContainer.appendChild(div);
    requestAnimationFrame(() => { requestAnimationFrame(() => div.classList.add('visible')); });
    setTimeout(() => {
      div.classList.remove('visible');
      setTimeout(() => div.remove(), 400);
    }, 3500);
  };

  // ==========================================
  //  NETWORK — GAS API CALL
  // ==========================================
  const callGas = async (payload) => {
    // 開発モード: GASのURLが設定されていない場合はダミー応答
    if (!GAS_ENDPOINT || GAS_ENDPOINT === "YOUR_GAS_WEB_APP_URL_HERE") {
      console.log('[Dev] Mock API call:', payload);
      return new Promise(resolve => setTimeout(() => resolve({ status: 'success' }), 1000));
    }

    try {
      const res = await fetch(GAS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.type === 'opaque') return { status: 'success' };

      const text = await res.text();
      try { return JSON.parse(text); }
      catch { return { status: 'success' }; }

    } catch (err) {
      console.error('[API] Error:', err);
      throw new Error('通信に失敗しました。接続を確認してください。');
    }
  };

  // ==========================================
  //  BUSINESS LOGIC — TIME CALCULATION
  // ==========================================
  const calcDuration = (startIso, endIso) => {
    const diffMs = new Date(endIso) - new Date(startIso);
    if (diffMs <= 0) return '0時間0分';
    const totalMin = Math.floor(diffMs / 60000);
    return `${Math.floor(totalMin / 60)}時間${totalMin % 60}分`;
  };

  // ==========================================
  //  HELPERS
  // ==========================================
  const pad = n => String(n).padStart(2, '0');

  const formatDateTime = (isoString) => {
    const d = new Date(isoString);
    const y  = d.getFullYear();
    const mo = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${y}/${mo}/${day} ${hh}:${mm}`;
  };

  const formatTime = (isoString) => {
    const d = new Date(isoString);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // ==========================================
  //  PUBLIC API
  // ==========================================
  return {
    init,

    // ------ 出勤打刻 ------
    clockIn: async () => {
      if (!state.userName) return toast('研修生の名前を入力してください', 'error');
      if (state.status === 'in') return toast('すでに出勤済みです', 'info');

      setLoading(el.btnClockIn, true);
      const timestamp = new Date().toISOString();

      try {
        await callGas({
          action:    'clock_in',
          userId:    state.userId,
          userName:  state.userName,
          timestamp: timestamp
        });

        state.status     = 'in';
        state.clockInTime = timestamp;
        saveState();
        toast(`出勤打刻しました ✓ ${formatTime(timestamp)}`, 'success');

      } catch (e) {
        toast(e.message, 'error');
      } finally {
        setLoading(el.btnClockIn, false);
      }
    },

    // ------ 退勤打刻 ------
    clockOut: async () => {
      if (!state.userName) return toast('研修生の名前を入力してください', 'error');
      if (state.status !== 'in') return toast('出勤打刻をしていません', 'error');

      setLoading(el.btnClockOut, true);
      const timestamp = new Date().toISOString();
      const duration  = calcDuration(state.clockInTime, timestamp);

      try {
        await callGas({
          action:       'clock_out',
          userId:       state.userId,
          userName:     state.userName,
          timestamp:    timestamp,
          clockInTime:  state.clockInTime,
          duration:     duration
        });

        state.status      = 'out';
        state.clockInTime = null;
        saveState();
        toast(`退勤打刻しました ✓ 実働 ${duration}`, 'success');

      } catch (e) {
        toast(e.message, 'error');
      } finally {
        setLoading(el.btnClockOut, false);
      }
    },

    // ------ 課題完了報告 ------
    reportTask: async () => {
      const url = el.taskUrl.value.trim();
      if (!state.userName) return toast('研修生の名前を入力してください', 'error');
      if (!url)            return toast('課題のURLを入力してください', 'error');
      if (!url.startsWith('http')) return toast('「http」から始まるURLを入力してください', 'error');
      setLoading(el.btnReport, true);
      const timestamp = new Date().toISOString();

      try {
        await callGas({
          action:    'report_task',
          userId:    state.userId,
          userName:  state.userName,
          timestamp: timestamp,
          taskUrl:   url
        });

        saveState();
        el.taskUrl.value = '';
        toast('🎉 課題を提出しました！確認をお待ちください', 'success');

      } catch (e) {
        toast(e.message, 'error');
      } finally {
        setLoading(el.btnReport, false);
      }
    }
  };

})();

// DOMContentLoaded で初期化
document.addEventListener('DOMContentLoaded', App.init);
