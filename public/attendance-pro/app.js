/**
 * Attendance Pro Logic
 * Vanilla JS Application with LocalStorage State Management
 */

const App = (() => {
  // --- Configuration ---
  // TODO: デプロイしたGASのURL（ウェブアプリのURL）をここに入力してください
  const GAS_ENDPOINT = "YOUR_GAS_WEB_APP_URL_HERE"; 

  // --- State ---
  let currentState = {
    status: 'out', // 'in' (勤務中) or 'out' (未出勤)
    userName: '',
    clockInTime: null
  };

  // --- External Elements ---
  const el = {
    userNameInput: null,
    statusBadge: null,
    btnClockIn: null,
    btnClockOut: null,
    btnReport: null,
    taskUrl: null,
    toastContainer: null,
    clockInTimeDisplay: null,
    clockInTimeValue: null
  };

  // --- Setup & Initialization ---
  const init = () => {
    // 1. Service Workerの登録 (PWAのオフラインサポート)
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('ServiceWorker registered:', reg.scope))
          .catch(err => console.log('ServiceWorker failed:', err));
      });
    }

    // 2. DOMのキャッシュ
    el.userNameInput = document.getElementById('user-name-input');
    el.statusBadge = document.getElementById('status-badge');
    el.btnClockIn = document.getElementById('btn-clock-in');
    el.btnClockOut = document.getElementById('btn-clock-out');
    el.btnReport = document.getElementById('btn-report');
    el.taskUrl = document.getElementById('task-url');
    el.toastContainer = document.getElementById('toast-container');
    el.clockInTimeDisplay = document.getElementById('clock-in-time-display');
    el.clockInTimeValue = document.getElementById('clock-in-time-value');

    // 3. ローカルストレージからの状態復元 (リロード対策、二重打刻防止)
    loadState();
    
    // 4. イベントバインディング
    el.userNameInput.addEventListener('input', (e) => {
      currentState.userName = e.target.value.trim();
      saveState();
    });

    render();
  };

  // --- State Persistence ---
  const loadState = () => {
    const saved = localStorage.getItem('attendance_pro_state');
    if (saved) {
      try {
        currentState = JSON.parse(saved);
        if (currentState.userName) {
          el.userNameInput.value = currentState.userName;
        }
      } catch(e) {
        console.error('State parse error', e);
      }
    }
  };

  const saveState = () => {
    localStorage.setItem('attendance_pro_state', JSON.stringify(currentState));
    render();
  };

  // --- View Rendering ---
  const render = () => {
    const isIn = currentState.status === 'in';
    
    // ① ステータスバリアブルの更新
    if (isIn) {
      el.statusBadge.textContent = '勤務中';
      el.statusBadge.className = 'px-4 py-1.5 rounded-full text-lg font-bold bg-success/10 text-success-dark transition-colors duration-300';
      
      // 出勤中なので出勤ボタンは無効、退勤は有効 (二重打刻防止)
      el.btnClockIn.disabled = true;
      el.btnClockOut.disabled = false;
      
      if (currentState.clockInTime) {
        const d = new Date(currentState.clockInTime);
        const hh = ("0" + d.getHours()).slice(-2);
        const mm = ("0" + d.getMinutes()).slice(-2);
        el.clockInTimeValue.textContent = `${hh}:${mm}`;
        el.clockInTimeDisplay.classList.remove('hidden');
      }
    } else {
      el.statusBadge.textContent = '未出勤';
      el.statusBadge.className = 'px-4 py-1.5 rounded-full text-lg font-bold bg-slate-100 text-slate-600 transition-colors duration-300';
      
      // 未出勤なので出勤は有効、退勤は無効
      el.btnClockIn.disabled = false;
      el.btnClockOut.disabled = true;
      el.clockInTimeDisplay.classList.add('hidden');
    }

    // ② ユーザー未選択時は全ボタンを無効化
    if (!currentState.userName) {
      el.btnClockIn.disabled = true;
      el.btnClockOut.disabled = true;
      el.btnReport.disabled = true;
    } else {
      el.btnReport.disabled = false;
    }
  };

  // --- UI Helpers ---
  const setButtonLoading = (btn, isLoading) => {
    const textGroup = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.btn-spinner');
    
    if (isLoading) {
      btn.disabled = true;
      textGroup.classList.add('invisible');
      spinner.classList.remove('hidden');
    } else {
      textGroup.classList.remove('invisible');
      spinner.classList.add('hidden');
      render(); // Restore exact state constraints
    }
  };

  const showToast = (message, type = 'success') => {
    const toast = document.createElement('div');
    const bgClass = type === 'success' ? 'bg-slate-800' : 'bg-danger';
    
    toast.className = `flex items-center px-4 py-3 rounded-lg text-white text-sm font-medium shadow-lg transform transition-all duration-300 -translate-y-4 opacity-0 ${bgClass}`;
    
    toast.innerHTML = `
      <svg class="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${type === 'success' ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'}"></path></svg>
      <span>${message}</span>
    `;
    
    el.toastContainer.appendChild(toast);
    
    // Animate In
    requestAnimationFrame(() => {
      toast.classList.remove('-translate-y-4', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    });

    // Auto remove after 3 seconds
    setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('-translate-y-4', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // --- Network API Logic ---
  const sendRequest = async (payload) => {
    // GAS設定前はダミー通信レスポンスを返す（開発/UI確認用）
    if (GAS_ENDPOINT === "YOUR_GAS_WEB_APP_URL_HERE") {
      return new Promise((resolve) => setTimeout(() => resolve({status: 'success'}), 1200));
    }

    try {
      // GAS Web Appsに対してPOSTリクエストを行う。
      // CORS回避のために text/plain で送るプラクティスもあるが、アプリ側（Google Apps Script）で JSONを許容している前提とする。
      // もしCORSエラーが出る場合は mode: 'no-cors' を付与するが、その場合レスポンスボディは読めなくなる。
      const response = await fetch(GAS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      // mode: no-cors の場合、opaque response になるためそのまま成功とみなす
      if (response.type === 'opaque') return { status: 'success' };
      
      const rawText = await response.text();
      try { 
        return JSON.parse(rawText); 
      } catch(e) { 
        return {status: 'success'}; // JSON以外が返った場合もひとまず成功として扱う
      }
    } catch (error) {
      console.error(error);
      throw new Error("通信に失敗しました。電波環境の良い場所で再実行してください。");
    }
  };

  // --- Business Logic ---
  const calculateDuration = (startIso, endIso) => {
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    const diffMs = end - start;
    if (diffMs <= 0) return "0時間0分";
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const h = Math.floor(diffMins / 60);
    const m = diffMins % 60;
    return `${h}時間${m}分`;
  };

  // 公開API
  return {
    init,
    
    clockIn: async () => {
      if (!currentState.userName) return showToast('研修生の名前を入力してください', 'error');
      
      setButtonLoading(el.btnClockIn, true);
      const timestamp = new Date().toISOString();
      
      try {
        await sendRequest({
          action: "clock_in",
          userName: currentState.userName,
          timestamp: timestamp
        });
        
        currentState.status = 'in';
        currentState.clockInTime = timestamp;
        saveState();
        showToast('打刻しました（出勤）');
      } catch (e) {
        showToast(e.message, 'error');
      } finally {
        setButtonLoading(el.btnClockIn, false);
      }
    },
    
    clockOut: async () => {
      if (!currentState.userName) return showToast('研修生の名前を入力してください', 'error');
      if (currentState.status !== 'in') return showToast('現在『未出勤』状態です', 'error');
      
      setButtonLoading(el.btnClockOut, true);
      const timestamp = new Date().toISOString();
      const duration = calculateDuration(currentState.clockInTime, timestamp);

      try {
        await sendRequest({
          action: "clock_out",
          userName: currentState.userName,
          timestamp: timestamp,
          duration: duration
        });
        
        currentState.status = 'out';
        currentState.clockInTime = null;
        saveState();
        showToast(`打刻しました（退勤） - 実働: ${duration}`);
      } catch (e) {
        showToast(e.message, 'error');
      } finally {
        setButtonLoading(el.btnClockOut, false);
      }
    },

    reportTask: async () => {
      const url = el.taskUrl.value.trim();
      if (!currentState.userName) return showToast('研修生の名前を入力してください', 'error');
      if (!url) return showToast('課題のURLを入力してください', 'error');
      if (!url.startsWith('http')) return showToast('「http」から始まる正しいURLを入力してください', 'error');

      setButtonLoading(el.btnReport, true);
      const timestamp = new Date().toISOString();

      try {
        await sendRequest({
          action: "report_task",
          userName: currentState.userName,
          timestamp: timestamp,
          taskUrl: url
        });
        
        el.taskUrl.value = '';
        showToast('課題を提出しました！');
      } catch (e) {
        showToast(e.message, 'error');
      } finally {
        setButtonLoading(el.btnReport, false);
      }
    }
  };
})();

// DOMコンテンツの読み込み完了時に初期化
document.addEventListener('DOMContentLoaded', App.init);
