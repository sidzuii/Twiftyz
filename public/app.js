const API = '';
const TOKEN_KEY = 'twiftyz_token';
const THEME_KEY = 'twiftyz_theme';
const FONT_KEY = 'twiftyz_font_size';
const state = {
  token: localStorage.getItem(TOKEN_KEY) || '',
  boot: null,
  me: null,
  settings: null,
  chats: [],
  contacts: [],
  calls: [],
  notifications: [],
  admin: null,
  sessions: [],
  activeChatId: '',
  messages: {},
  linkPreviews: {},
  imageBlobs: {},
  search: '',
  chatFilter: 'all',
  userSearch: '',
  userResults: [],
  view: 'chats',
  // On phones the chat list is the home screen — open the sidebar by default.
  sidebarOpen: window.matchMedia('(max-width: 820px)').matches,
  inspectorOpen: false,
  composerText: '',
  replyTo: null,
  typing: {},
  ws: null,
  uploadProgress: null,
  chatSearchOpen: false,
  chatSearchQuery: '',
  chatSearchIndex: 0,
  recording: null,
  audioBlobs: {},
  lastRenderedChatId: '',
  auth: {
    step: 'login',
    identifier: '',
    email: '',
    phone: '',
    password: '',
    firstName: '',
    lastName: '',
    nickname: '',
    challengeId: '',
    deliveryChannel: '',
    pendingEmail: '',
    devCode: '',
    code: ''
  },
  passwordForm: {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  },
  modal: null,
  toast: ''
};

// Inline SVG icon set (Feather-style, inherits currentColor). Sized via CSS `.ic`.
const svg = (body) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const icons = {
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
  chat: svg('<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>'),
  send: svg('<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/>'),
  phone: svg('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>'),
  video: svg('<path d="m23 7-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>'),
  settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
  admin: svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>'),
  bell: svg('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>'),
  paperclip: svg('<path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>'),
  pin: svg('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'),
  profile: svg('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
  contacts: svg('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  group: svg('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  channel: svg('<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>'),
  lock: svg('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
  back: svg('<path d="m15 18-6-6 6-6"/>'),
  plus: svg('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'),
  menu: svg('<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>'),
  close: svg('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'),
  info: svg('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'),
  link: svg('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
  star: svg('<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z"/>'),
  starFilled: `<svg class="ic" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>`,
  ban: svg('<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>'),
  archive: svg('<rect x="3" y="3" width="18" height="5" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M9 12l3 3 3-3"/>'),
  unarchive: svg('<rect x="3" y="3" width="18" height="5" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M9 14l3-3 3 3"/>'),
  mic: svg('<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>'),
  stop: svg('<rect x="6" y="6" width="12" height="12" rx="2"/>'),
  arrowDown: svg('<line x1="12" y1="5" x2="12" y2="19"/><path d="m19 12-7 7-7-7"/>'),
  bookmark: svg('<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>'),
  chevronUp: svg('<path d="m18 15-6-6-6 6"/>'),
  chevronDown: svg('<path d="m6 9 6 6 6-6"/>')
};

const app = document.querySelector('#app');

const darkMedia = window.matchMedia('(prefers-color-scheme: dark)');

function resolveTheme(preference) {
  if (preference === 'light' || preference === 'dark') return preference;
  return darkMedia.matches ? 'dark' : 'light';
}

// Applies the chosen appearance (theme + font size) to <html>.
// `theme` is one of: 'auto' | 'light' | 'dark'.
function applyAppearance(theme, fontSize) {
  const preference = theme || localStorage.getItem(THEME_KEY) || 'auto';
  const size = Number(fontSize) || Number(localStorage.getItem(FONT_KEY)) || 15;
  document.documentElement.dataset.theme = resolveTheme(preference);
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.style.fontSize = `${size}px`;
  localStorage.setItem(THEME_KEY, preference);
  localStorage.setItem(FONT_KEY, String(size));
}

// React to OS theme changes while the user keeps the "auto" preference.
darkMedia.addEventListener('change', () => {
  const preference = state.settings?.theme || localStorage.getItem(THEME_KEY) || 'auto';
  if (preference === 'auto') {
    document.documentElement.dataset.theme = resolveTheme('auto');
  }
});

// Apply the cached preference immediately so there is no flash before bootstrap.
applyAppearance();

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function formatDateTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function formatSize(size) {
  const value = Number(size || 0);
  if (value > 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} МБ`;
  if (value > 1024) return `${(value / 1024).toFixed(1)} КБ`;
  return `${value} Б`;
}

function userName(user) {
  if (!user) return 'Пользователь';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.nickname || user.email || 'Пользователь';
}

function chatIcon(chat) {
  if (chat.type === 'channel') return icons.channel;
  if (chat.type === 'group') return icons.group;
  if (chat.type === 'saved') return icons.bookmark;
  return icons.profile;
}

// "(3) Twiftyz" in the browser tab when there are unread chats.
function updateDocTitle() {
  const total = state.chats.reduce((sum, chat) => sum + (chat.unread || 0), 0);
  document.title = total ? `(${total}) Twiftyz Messenger` : 'Twiftyz Messenger';
}

// Browsers require a user gesture before showing the permission prompt.
function armNotificationPermission() {
  if (!('Notification' in window) || Notification.permission !== 'default') return;
  document.addEventListener('click', () => Notification.requestPermission().catch(() => {}), { once: true });
}

// Telegram-style sound for incoming messages (respects mute and DND settings).
function maybeSound(message) {
  if (message.authorId === state.me?.id) return;
  if (message.chatId === state.activeChatId && !document.hidden) return;
  const chat = state.chats.find((item) => item.id === message.chatId);
  if (!chat || (chat.mutedBy || []).includes(state.me.id)) return;
  const prefs = state.settings?.notifications || {};
  if (prefs.sounds === false || prefs.doNotDisturb) return;
  playMessageSound();
}

function maybeNotify(message) {
  if (state.settings?.notifications?.push === false) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!document.hidden) return;
  if (message.authorId === state.me?.id) return;
  const chat = state.chats.find((item) => item.id === message.chatId);
  if (!chat || (chat.mutedBy || []).includes(state.me.id)) return;
  const title = chat.title;
  const body = `${userName(message.author)}: ${message.text || 'Вложение'}`.slice(0, 140);
  try {
    const notice = new Notification(title, { body, tag: message.chatId, icon: '/assets/logo/twiftyz-mark-2a.png' });
    notice.onclick = async () => {
      window.focus();
      notice.close();
      state.activeChatId = message.chatId;
      state.view = 'chats';
      await loadActiveMessages();
      render();
    };
  } catch {
    // Notification constructor can throw on some platforms; ignore.
  }
}

const STATUS_LABELS = {
  online: 'в сети',
  away: 'отошёл',
  offline: 'не в сети',
  active: 'активен',
  ended: 'завершён'
};

function statusLabel(status) {
  return STATUS_LABELS[status] || status || 'не в сети';
}

function className(parts) {
  return parts.filter(Boolean).join(' ');
}

function setToast(message) {
  state.toast = message;
  render();
  window.clearTimeout(setToast.timer);
  setToast.timer = window.setTimeout(() => {
    state.toast = '';
    render();
  }, 2600);
}

async function request(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {})
  };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers,
    body: options.body && typeof options.body !== 'string' && !isFormData ? JSON.stringify(options.body) : options.body
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.error || `HTTP ${response.status}`);
  }
  return data;
}

function patchStateFromBootstrap(boot) {
  state.boot = boot;
  state.me = boot.me;
  state.settings = boot.settings;
  if (boot.settings) applyAppearance(boot.settings.theme, boot.settings.fontSize);
  state.chats = boot.chats || [];
  state.contacts = boot.contacts || [];
  state.calls = boot.calls || [];
  state.notifications = boot.notifications || [];
  state.admin = boot.admin;
  state.activeChatId ||= state.chats[0]?.id || '';
}

async function boot() {
  if (!state.token) {
    renderAuth();
    return;
  }
  try {
    const bootData = await request('/api/bootstrap');
    patchStateFromBootstrap(bootData);
    connectWs();
    armNotificationPermission();
    await loadActiveMessages();
    render();
  } catch (error) {
    localStorage.removeItem(TOKEN_KEY);
    state.token = '';
    renderAuth(error.message);
  }
}

function connectWs() {
  if (!state.token || state.ws?.readyState === WebSocket.OPEN || state.ws?.readyState === WebSocket.CONNECTING) return;
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${protocol}://${location.host}/ws?token=${encodeURIComponent(state.token)}`);
  state.ws = ws;
  ws.addEventListener('message', (event) => {
    const packet = JSON.parse(event.data);
    handleRealtime(packet.type, packet.payload);
  });
  ws.addEventListener('close', () => {
    if (state.token) window.setTimeout(connectWs, 1800);
  });
}

function handleRealtime(type, payload) {
  if (type === 'message:new') {
    const list = state.messages[payload.chatId] || [];
    if (!list.some((message) => message.id === payload.id)) {
      state.messages[payload.chatId] = [...list, payload];
    }
    const chat = state.chats.find((item) => item.id === payload.chatId);
    if (chat) {
      chat.lastMessage = payload;
      chat.updatedAt = payload.createdAt;
      if (payload.chatId !== state.activeChatId && payload.authorId !== state.me.id) chat.unread = (chat.unread || 0) + 1;
      state.chats = [...state.chats].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }
    maybeNotify(payload);
    maybeSound(payload);
    render();
    return;
  }
  if (type === 'message:updated') {
    updateMessage(payload);
    render();
    return;
  }
  if (type === 'message:deleted') {
    // Collapse animation, then the message disappears from the chat entirely.
    const removeFromState = () => {
      const list = state.messages[payload.chatId] || [];
      state.messages[payload.chatId] = list.filter((message) => message.id !== payload.id);
      render();
    };
    const el = document.querySelector(`#messageList [data-message-id="${CSS.escape(payload.id)}"]`);
    if (el && payload.chatId === state.activeChatId) {
      el.classList.add('removing');
      window.setTimeout(removeFromState, 280);
    } else {
      removeFromState();
    }
    return;
  }
  if (type === 'chat:created') {
    if (!state.chats.some((chat) => chat.id === payload.id)) state.chats.unshift(payload);
    render();
    return;
  }
  if (type === 'chat:updated') {
    const index = state.chats.findIndex((chat) => chat.id === payload.id);
    if (index >= 0) state.chats[index] = { ...state.chats[index], ...payload };
    render();
    return;
  }
  if (type === 'chat:removed') {
    removeChatLocally(payload.id);
    return;
  }
  if (type === 'chat:cleared') {
    state.messages[payload.chatId] = [];
    const chat = state.chats.find((item) => item.id === payload.chatId);
    if (chat) chat.lastMessage = null;
    render();
    return;
  }
  if (type === 'typing:update') {
    if (payload.userId !== state.me.id) {
      state.typing[payload.chatId] = payload.isTyping ? payload.userId : '';
      render();
    }
    return;
  }
  if (type === 'presence:update') {
    for (const chat of state.chats) {
      for (const member of chat.membersDetailed || []) {
        if (member.id === payload.userId) member.status = payload.status;
      }
    }
    for (const contact of state.contacts) {
      if (contact.user?.id === payload.userId) contact.user.status = payload.status;
    }
    render();
    return;
  }
  if (type === 'notification:new') {
    state.notifications.unshift(payload);
    render();
    return;
  }
  if (type === 'call:started') {
    if (!state.calls.some((call) => call.id === payload.id)) state.calls.unshift(payload);
    setToast(`${payload.type === 'video' ? 'Видеозвонок' : 'Звонок'} начат`);
    return;
  }
  if (type === 'call:ended') {
    const call = state.calls.find((item) => item.id === payload.id);
    if (call) Object.assign(call, payload);
    render();
  }
}

function updateMessage(payload) {
  const list = state.messages[payload.chatId] || [];
  state.messages[payload.chatId] = list.map((message) => message.id === payload.id ? payload : message);
}

async function loadActiveMessages() {
  if (!state.activeChatId) return;
  try {
    state.messages[state.activeChatId] = await request(`/api/chats/${state.activeChatId}/messages`);
    await request(`/api/chats/${state.activeChatId}/read`, { method: 'POST', body: {} });
    const chat = state.chats.find((item) => item.id === state.activeChatId);
    if (chat) chat.unread = 0;
  } catch (error) {
    setToast(error.message);
  }
}

function renderAuth(error = '') {
  const step = state.auth.step || 'login';
  app.innerHTML = `
    <main class="auth-shell">
      <div class="brand-lockup auth-brand">
        <img class="brand-logo" src="/assets/logo/twiftyz-mark-2a.svg" alt="Twiftyz" />
        <h1>Twiftyz Messenger</h1>
      </div>
      <div class="auth-columns">
      <section class="auth-visual">
        <div class="auth-mock">
          <div class="auth-mock-head">
            <span class="auth-mock-avatar"><img src="/assets/logo/twiftyz-mark-2a.svg" alt="" /></span>
            <div>
              <strong>Команда Twiftyz</strong>
              <span class="auth-mock-status"><i></i> в сети</span>
            </div>
            <span class="auth-mock-icons">${icons.phone}${icons.video}</span>
          </div>
          <div class="auth-mock-body">
            <div class="mock-bubble">Привет! Как продвигается дизайн? 🎨</div>
            <div class="mock-bubble out">Готово — тёмная тема, модалки и SVG-иконки ✨</div>
            <div class="mock-bubble">А что с функциями? 🤔</div>
            <div class="mock-bubble out">Голосовые сообщения, реакции и ответы уже работают 🎙️</div>
            <div class="mock-bubble out">Плюс файлы с прогрессом загрузки и просмотр фото 📎</div>
            <div class="mock-bubble">А поиск по переписке есть?</div>
            <div class="mock-bubble out">Да — с подсветкой и переходами по совпадениям 🔍</div>
            <div class="mock-bubble">Огонь. Покажем на презентации 🚀</div>
            <div class="mock-bubble out">Запускаем демо 👇</div>
          </div>
          <div class="auth-mock-foot">
            <span>Сообщение…</span>
            <span class="auth-mock-send">${icons.send}</span>
          </div>
        </div>
        <div class="auth-features">
          <div class="auth-feature">${icons.lock}<span>Шифрование</span></div>
          <div class="auth-feature">${icons.group}<span>Группы и каналы</span></div>
          <div class="auth-feature">${icons.paperclip}<span>Файлы и медиа</span></div>
        </div>
      </section>
      <section class="auth-card">
        ${renderAuthCard(step, error)}
      </section>
      </div>
      <p class="auth-est">EST. 2026 · Быстрый и безопасный мессенджер: личные чаты, группы и каналы, сообщения в реальном времени, звонки и обмен файлами.</p>
    </main>
  `;
  bindAuthEvents(step);
  // The demo chat opens scrolled to the latest message, like a real chat.
  const mockBody = document.querySelector('.auth-mock-body');
  if (mockBody) mockBody.scrollTop = mockBody.scrollHeight;
}

function renderAuthCard(step, error) {
  const errorHtml = error ? `<div class="form-error">${escapeHtml(error)}</div>` : '';
  const devHint = state.auth.devCode ? `<div class="dev-code">Демо-код (email не настроен): ${escapeHtml(state.auth.devCode)}</div>` : '';
  const tabs = (step === 'login' || step === 'register') ? `
    <div class="auth-mode-tabs">
      <button class="${step === 'login' ? 'active' : ''}" type="button" data-auth-step="login">Вход</button>
      <button class="${step === 'register' ? 'active' : ''}" type="button" data-auth-step="register">Регистрация</button>
    </div>` : '';

  if (step === 'register') {
    return `${tabs}
      <h2>Создать аккаунт</h2>
      <p>Заполните данные — на email придёт код подтверждения.</p>
      ${errorHtml}
      <form id="authRegisterForm">
        <label>Имя<input name="firstName" autocomplete="given-name" value="${escapeHtml(state.auth.firstName)}" placeholder="Иван" /></label>
        <label>Никнейм<input name="nickname" autocomplete="nickname" value="${escapeHtml(state.auth.nickname)}" placeholder="ivan.petrov" /></label>
        <label>Email<input name="email" type="email" autocomplete="email" value="${escapeHtml(state.auth.email)}" placeholder="user@example.com" /></label>
        <label>Телефон<input name="phone" type="tel" inputmode="tel" autocomplete="tel" value="${escapeHtml(state.auth.phone)}" placeholder="+79990000000" /></label>
        <label>Пароль<input name="password" type="password" autocomplete="new-password" placeholder="Минимум 8 символов" /></label>
        <button class="primary-button" type="submit">Получить код</button>
      </form>`;
  }

  if (step === 'register-code' || step === 'login-code') {
    const isReg = step === 'register-code';
    const where = state.auth.deliveryChannel === 'in-app'
      ? 'в чат <strong>Twiftyz</strong> на устройстве, где вы уже вошли'
      : `на почту <strong>${escapeHtml(state.auth.pendingEmail || '')}</strong>`;
    return `
      <button class="text-button" type="button" data-auth-step="${isReg ? 'register' : 'login'}">${icons.back} Назад</button>
      <h2>Введите код</h2>
      <p>Мы отправили 6-значный код ${where}.</p>
      ${errorHtml}
      ${devHint}
      <form id="authCodeForm">
        <label>Код подтверждения
          <input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" value="${escapeHtml(state.auth.code || '')}" />
        </label>
        <button class="primary-button" type="submit">${isReg ? 'Подтвердить и войти' : 'Войти'}</button>
      </form>
      ${!isReg && state.auth.deliveryChannel === 'email' ? `<button class="text-button auth-forgot" type="button" data-auth-step="recover">Код не приходит?</button>` : ''}`;
  }

  if (step === 'recover') {
    return `
      <button class="text-button" type="button" data-auth-step="login">${icons.back} Назад ко входу</button>
      <h2>Восстановление доступа</h2>
      <p>Подтвердите, что аккаунт ваш: укажите привязанные email, телефон и никнейм — вышлем код на почту повторно.</p>
      ${errorHtml}
      <form id="authRecoverForm">
        <label>Email<input name="email" type="email" autocomplete="email" value="${escapeHtml(state.auth.email || state.auth.identifier)}" placeholder="user@example.com" /></label>
        <label>Телефон<input name="phone" autocomplete="tel" value="${escapeHtml(state.auth.phone)}" placeholder="+79990000000" /></label>
        <label>Никнейм<input name="nickname" autocomplete="nickname" value="${escapeHtml(state.auth.nickname)}" placeholder="ivan.petrov" /></label>
        <button class="primary-button" type="submit">Отправить код на почту</button>
      </form>`;
  }

  if (step === 'reset') {
    return `
      <button class="text-button" type="button" data-auth-step="login">${icons.back} Назад ко входу</button>
      <h2>Сброс пароля</h2>
      <p>Укажите email аккаунта — вышлем код для сброса пароля.</p>
      ${errorHtml}
      <form id="authResetForm">
        <label>Email<input name="email" type="email" autocomplete="email" value="${escapeHtml(state.auth.email || state.auth.identifier)}" placeholder="user@example.com" /></label>
        <button class="primary-button" type="submit">Отправить код</button>
      </form>`;
  }

  if (step === 'reset-code') {
    return `
      <button class="text-button" type="button" data-auth-step="reset">${icons.back} Назад</button>
      <h2>Новый пароль</h2>
      <p>Код отправлен на почту <strong>${escapeHtml(state.auth.pendingEmail || '')}</strong>. Введите его и задайте новый пароль.</p>
      ${errorHtml}
      ${devHint}
      <form id="authResetCodeForm">
        <label>Код из письма<input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" value="${escapeHtml(state.auth.code || '')}" /></label>
        <label>Новый пароль<input name="newPassword" type="password" autocomplete="new-password" placeholder="Минимум 8 символов" /></label>
        <button class="primary-button" type="submit">Сохранить и войти</button>
      </form>`;
  }

  return `${tabs}
    <h2>Войти в аккаунт</h2>
    <p>Введите email, телефон или никнейм и пароль. Затем подтвердите вход кодом.</p>
    ${errorHtml}
    <form id="authLoginForm">
      <label>Email, телефон или никнейм<input name="identifier" autocomplete="username" value="${escapeHtml(state.auth.identifier)}" placeholder="demo@twiftyz.local" /></label>
      <label>Пароль<input name="password" type="password" autocomplete="current-password" placeholder="Ваш пароль" /></label>
      <button class="primary-button" type="submit">Продолжить</button>
    </form>
    <button class="text-button auth-forgot" type="button" data-auth-step="reset">Забыли пароль?</button>`;
}

function bindAuthEvents() {
  document.querySelectorAll('[data-auth-step]').forEach((button) => button.addEventListener('click', () => {
    state.auth.step = button.dataset.authStep;
    state.auth.code = '';
    state.auth.devCode = '';
    renderAuth();
  }));
  document.querySelector('#authLoginForm')?.addEventListener('submit', submitLogin);
  document.querySelector('#authRegisterForm')?.addEventListener('submit', submitRegister);
  document.querySelector('#authCodeForm')?.addEventListener('submit', submitAuthCode);
  document.querySelector('#authRecoverForm')?.addEventListener('submit', submitRecover);
  document.querySelector('#authResetForm')?.addEventListener('submit', submitResetStart);
  document.querySelector('#authResetCodeForm')?.addEventListener('submit', submitResetCode);
}

async function submitResetStart(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  state.auth.email = String(form.get('email') || '').trim();
  try {
    const result = await request('/api/auth/password/reset/start', {
      method: 'POST',
      body: { email: state.auth.email }
    });
    state.auth.challengeId = result.challengeId;
    state.auth.pendingEmail = result.email || state.auth.email;
    state.auth.devCode = result.devCode || '';
    state.auth.code = '';
    state.auth.step = 'reset-code';
    renderAuth();
  } catch (error) {
    renderAuth(error.message);
  }
}

async function submitResetCode(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const code = String(form.get('code') || '').trim();
  const newPassword = String(form.get('newPassword') || '');
  state.auth.code = code;
  try {
    const result = await request('/api/auth/password/reset/verify', {
      method: 'POST',
      body: { challengeId: state.auth.challengeId, code, newPassword }
    });
    state.auth.devCode = '';
    state.auth.code = '';
    state.auth.password = '';
    await finishAuth(result);
  } catch (error) {
    renderAuth(error.message);
  }
}

async function submitLogin(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  state.auth.identifier = String(form.get('identifier') || '').trim();
  state.auth.password = String(form.get('password') || '');
  try {
    const result = await request('/api/auth/login', {
      method: 'POST',
      body: { identifier: state.auth.identifier, password: state.auth.password }
    });
    if (result.requiresRecovery) {
      state.auth.step = 'recover';
      renderAuth();
      return;
    }
    state.auth.challengeId = result.challengeId;
    state.auth.deliveryChannel = result.delivery || 'in-app';
    state.auth.pendingEmail = result.email || '';
    state.auth.devCode = result.devCode || '';
    state.auth.code = '';
    state.auth.step = 'login-code';
    renderAuth();
  } catch (error) {
    renderAuth(error.message);
  }
}

async function submitRegister(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  state.auth.firstName = String(form.get('firstName') || '').trim();
  state.auth.nickname = String(form.get('nickname') || '').trim();
  state.auth.email = String(form.get('email') || '').trim();
  state.auth.phone = String(form.get('phone') || '').trim();
  state.auth.password = String(form.get('password') || '');
  const phoneDigits = state.auth.phone.replace(/\D/g, '');
  if (!/^\+?[\d\s()-]+$/.test(state.auth.phone) || phoneDigits.length < 10 || phoneDigits.length > 15) {
    renderAuth('Укажите корректный номер телефона: только цифры (10–15 знаков), без букв');
    return;
  }
  try {
    const result = await request('/api/auth/register', {
      method: 'POST',
      body: {
        firstName: state.auth.firstName,
        nickname: state.auth.nickname,
        email: state.auth.email,
        phone: state.auth.phone,
        password: state.auth.password
      }
    });
    state.auth.challengeId = result.challengeId;
    state.auth.pendingEmail = result.email || state.auth.email;
    state.auth.deliveryChannel = 'email';
    state.auth.devCode = result.devCode || '';
    state.auth.code = '';
    state.auth.step = 'register-code';
    renderAuth();
  } catch (error) {
    renderAuth(error.message);
  }
}

async function submitAuthCode(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const code = String(form.get('code') || '').trim();
  state.auth.code = code;
  const endpoint = state.auth.step === 'register-code' ? '/api/auth/register/verify' : '/api/auth/login/verify';
  try {
    const result = await request(endpoint, {
      method: 'POST',
      body: { challengeId: state.auth.challengeId, code }
    });
    state.auth.devCode = '';
    state.auth.code = '';
    await finishAuth(result);
  } catch (error) {
    renderAuth(error.message);
  }
}

async function submitRecover(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  state.auth.email = String(form.get('email') || '').trim();
  state.auth.phone = String(form.get('phone') || '').trim();
  state.auth.nickname = String(form.get('nickname') || '').trim();
  try {
    const result = await request('/api/auth/recover', {
      method: 'POST',
      body: { email: state.auth.email, phone: state.auth.phone, nickname: state.auth.nickname }
    });
    state.auth.challengeId = result.challengeId;
    state.auth.pendingEmail = result.email || state.auth.email;
    state.auth.deliveryChannel = 'email';
    state.auth.devCode = result.devCode || '';
    state.auth.code = '';
    state.auth.step = 'login-code';
    renderAuth();
  } catch (error) {
    renderAuth(error.message);
  }
}

async function finishAuth(result) {
  state.token = result.token;
  localStorage.setItem(TOKEN_KEY, state.token);
  patchStateFromBootstrap(result.bootstrap);
  connectWs();
  armNotificationPermission();
  await loadActiveMessages();
  render();
}

function activeChat() {
  return state.chats.find((chat) => chat.id === state.activeChatId) || state.chats[0] || null;
}

function filteredChats() {
  const q = state.search.trim().toLowerCase();
  return state.chats
    .filter((chat) => {
      if (state.chatFilter === 'direct') return chat.type === 'direct' && !chat.isArchivedByMe;
      if (state.chatFilter === 'group') return chat.type === 'group' && !chat.isArchivedByMe;
      if (state.chatFilter === 'channel') return chat.type === 'channel' && !chat.isArchivedByMe;
      if (state.chatFilter === 'pinned') return chat.isPinnedByMe && !chat.isArchivedByMe;
      if (state.chatFilter === 'archive') return chat.isArchivedByMe;
      return !chat.isArchivedByMe;
    })
    .filter((chat) => {
      if (!q) return true;
      return `${chat.title} ${chat.description} ${chat.lastMessage?.text || ''} ${chat.folder || ''}`.toLowerCase().includes(q);
    })
    .sort((a, b) => Number(b.isPinnedByMe) - Number(a.isPinnedByMe) || new Date(b.updatedAt) - new Date(a.updatedAt));
}

function render() {
  if (!state.token || !state.me) {
    renderAuth();
    return;
  }

  const chat = activeChat();
  const messages = chat ? state.messages[chat.id] || [] : [];
  // Capture the scroll position and composer focus before the DOM is replaced,
  // so an incoming message re-render never steals the caret from the user.
  const prevList = document.querySelector('#messageList');
  const prevScroll = prevList
    ? { top: prevList.scrollTop, atBottom: prevList.scrollHeight - prevList.scrollTop - prevList.clientHeight < 80 }
    : null;
  const prevComposer = document.activeElement?.id === 'composerInput'
    ? { start: document.activeElement.selectionStart, end: document.activeElement.selectionEnd }
    : null;
  app.innerHTML = `
    <div class="${className(['app-shell', state.sidebarOpen && 'sidebar-visible'])}">
      ${renderNav()}
      ${renderSidebar()}
      ${renderMain(chat, messages)}
      ${renderInspector(chat)}
      ${renderMobileTabbar()}
      ${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ''}
    </div>
  `;
  bindEvents();
  restoreScroll(chat, prevScroll);
  if (prevComposer) {
    const ta = document.querySelector('#composerInput');
    if (ta) {
      ta.focus();
      ta.setSelectionRange(prevComposer.start, prevComposer.end);
    }
  }
  updateDocTitle();
  ensureLinkPreviews(messages.map((message) => firstUrl(message.text)).filter(Boolean));
  ensureInlineMedia();
}

// Keeps the reading position across re-renders; snaps to bottom on chat switch
// or when the user was already at the bottom.
function restoreScroll(chat, prevScroll) {
  const list = document.querySelector('#messageList');
  if (!list) return;
  const chatChanged = (chat?.id || '') !== state.lastRenderedChatId;
  state.lastRenderedChatId = chat?.id || '';
  if (chatChanged || !prevScroll || prevScroll.atBottom) {
    list.scrollTop = list.scrollHeight;
  } else {
    list.scrollTop = prevScroll.top;
  }
  syncScrollDownButton(list);
  list.addEventListener('scroll', () => syncScrollDownButton(list), { passive: true });
}

function syncScrollDownButton(list) {
  const button = document.querySelector('#scrollDownBtn');
  if (!button) return;
  const away = list.scrollHeight - list.scrollTop - list.clientHeight > 200;
  button.classList.toggle('visible', away);
}

function closeChatSearch() {
  state.chatSearchOpen = false;
  state.chatSearchQuery = '';
  state.chatSearchIndex = 0;
  render();
}

function stepChatSearch(delta) {
  const chat = activeChat();
  const matches = chatSearchMatches(chat, state.messages[chat?.id] || []);
  if (!matches.length) return;
  state.chatSearchIndex = (state.chatSearchIndex + delta + matches.length) % matches.length;
  render();
  const input = document.querySelector('#chatSearchInput');
  if (input) {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
  scrollToCurrentMatch();
}

function scrollToCurrentMatch() {
  document.querySelector('.message.search-current')?.scrollIntoView({ block: 'center' });
}

function jumpToMessage(messageId) {
  // Scoped to the list: the pinned bar carries the same data attribute.
  const target = document.querySelector(`#messageList [data-message-id="${CSS.escape(messageId || '')}"]`);
  if (!target) {
    setToast('Сообщение не найдено в загруженной истории');
    return;
  }
  target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  target.classList.add('flash');
  window.setTimeout(() => target.classList.remove('flash'), 1400);
}

function renderNav() {
  const unread = state.notifications.filter((item) => !item.read).length;
  const items = [
    ['chats', icons.chat, 'Чаты'],
    ['contacts', icons.contacts, 'Контакты'],
    ['settings', icons.settings, 'Настройки'],
    ...(state.me.role === 'admin' ? [['admin', icons.admin, 'Админ']] : [])
  ];
  return `
    <nav class="rail" aria-label="Основная навигация">
      <button class="rail-avatar" data-action="open-profile" title="Профиль">
        <img src="${escapeHtml(state.me.avatar)}" alt="" />
      </button>
      <div class="rail-items">
        ${items.map(([view, icon, label]) => `
          <button class="${className(['rail-button', state.view === view && 'active'])}" data-view="${view}" title="${label}" aria-label="${label}">
            <span>${icon}</span>
          </button>
        `).join('')}
      </div>
      <button class="rail-button notification-dot" data-view="notifications" title="Уведомления" aria-label="Уведомления">
        <span>${icons.bell}</span>${unread ? `<em>${unread}</em>` : ''}
      </button>
    </nav>
  `;
}

// Bottom tab bar — mobile only (CSS hides it on desktop). Chats / Contacts / Profile.
function renderMobileTabbar() {
  const inChat = state.view === 'chats' && !state.sidebarOpen && activeChat();
  const tabs = [
    ['chats', icons.chat, 'Чаты'],
    ['contacts', icons.contacts, 'Контакты']
  ];
  return `
    <nav class="mobile-tabbar" aria-label="Навигация">
      ${tabs.map(([view, icon, label]) => `
        <button class="${className(['tabbar-btn', state.view === view && !inChat && 'active'])}" data-action="mobile-tab" data-tab="${view}">
          ${icon}<span>${label}</span>
        </button>
      `).join('')}
      <button class="tabbar-btn" data-action="open-profile">
        <img class="tabbar-avatar" src="${escapeHtml(state.me.avatar)}" alt="" /><span>Профиль</span>
      </button>
    </nav>
  `;
}

function renderSidebar() {
  if (state.view === 'contacts') return renderContactsSidebar();
  if (state.view === 'calls') return renderCallsSidebar();
  if (state.view === 'settings') return renderSettingsSidebar();
  if (state.view === 'admin') return renderAdminSidebar();
  if (state.view === 'notifications') return renderNotificationsSidebar();
  return renderChatsSidebar();
}

function renderSidebarHeader(title, action = '') {
  return `
    <div class="sidebar-header">
      <button class="mobile-close" data-action="close-sidebar" title="Назад">${icons.back}</button>
      <div>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(state.boot?.app?.name || 'Twiftyz Messenger')}</p>
      </div>
      ${action}
    </div>
  `;
}

function renderChatsSidebar() {
  const filters = [
    ['all', 'Все'],
    ['direct', 'Личные'],
    ['group', 'Группы'],
    ['channel', 'Каналы'],
    ['pinned', 'Закреп'],
    ['archive', 'Архив']
  ];
  return `
    <aside class="sidebar">
      ${renderSidebarHeader('Сообщения', `<button class="icon-button" data-action="open-create-menu" title="Создать">${icons.plus}</button>`)}
      <div class="search-box">
        <span>${icons.search}</span>
        <input id="chatSearch" value="${escapeHtml(state.search)}" placeholder="Поиск по чатам и сообщениям" />
      </div>
      <div class="chat-tabs chat-tabs-wide">
        ${filters.map(([value, label]) => `<button class="${state.chatFilter === value ? 'active' : ''}" data-action="set-chat-filter" data-filter="${value}">${label}</button>`).join('')}
      </div>
      <div class="chat-list">
        ${filteredChats().map(renderChatItem).join('') || '<div class="empty-state">Ничего не найдено</div>'}
      </div>
    </aside>
  `;
}

function renderChatItem(chat) {
  const last = chat.lastMessage;
  const active = chat.id === state.activeChatId;
  const isSaved = chat.type === 'saved';
  return `
    <div class="${className(['chat-item-row', active && 'active'])}">
      <button class="${className(['chat-item', active && 'active'])}" data-chat-id="${escapeHtml(chat.id)}">
        <div class="avatar-wrap">
          <img src="${escapeHtml(chat.avatar)}" alt="" />
          <span class="type-badge">${isSaved ? icons.bookmark : chatIcon(chat)}</span>
        </div>
        <span class="chat-meta">
          <span class="chat-title-row">
            <strong>${isSaved ? 'Избранное' : escapeHtml(chat.title)}${chat.isPinnedByMe ? ` <span class="pin-dot" title="Закреплён">${icons.pin}</span>` : ''}</strong>
            <small>${formatTime(last?.createdAt || chat.updatedAt)}</small>
          </span>
          <span class="chat-preview">${escapeHtml(last?.text || chat.description || 'Нет сообщений')}</span>
          <span class="chat-labels">
            ${chat.isArchivedByMe ? '<em>Архив</em>' : ''}
            ${chat.folder ? `<em>${escapeHtml(chat.folder)}</em>` : ''}
          </span>
        </span>
        ${chat.unread ? `<em class="unread">${chat.unread}</em>` : ''}
      </button>
    </div>
  `;
}

function renderContactsSidebar() {
  return `
    <aside class="sidebar">
      ${renderSidebarHeader('Контакты', `<button class="icon-button" data-action="find-user" title="Найти пользователя">${icons.plus}</button>`)}
      <form id="userSearchForm" class="user-search-form">
        <label>
          Найти пользователя
          <div class="inline-search">
            <input name="query" value="${escapeHtml(state.userSearch)}" placeholder="email, телефон, никнейм или имя" />
            <button class="primary-icon" type="submit" title="Искать">${icons.search}</button>
          </div>
        </label>
      </form>
      ${state.userResults.length ? `
        <section class="search-results">
          <h3>Найденные аккаунты</h3>
          ${state.userResults.map((user) => `
            <article class="contact-card result-card">
              <img src="${escapeHtml(user.avatar)}" alt="" />
              <div class="contact-info">
                <strong>${escapeHtml(userName(user))}</strong>
                <p>@${escapeHtml(user.nickname)} · ${escapeHtml(user.email || user.phone || '')}</p>
              </div>
              <span class="${className(['status-chip', user.status])}">${escapeHtml(statusLabel(user.status))}</span>
              <div class="card-actions">
                <button class="secondary-button" data-action="add-contact" data-user-id="${escapeHtml(user.id)}">Добавить</button>
                <button class="primary-button" data-action="open-direct" data-user-id="${escapeHtml(user.id)}">Написать</button>
              </div>
            </article>
          `).join('')}
        </section>
      ` : ''}
      <section class="contact-grid">
        ${state.contacts.map((contact) => `
          <article class="contact-card">
            <img src="${escapeHtml(contact.user?.avatar)}" alt="" />
            <div class="contact-info">
              <strong>${escapeHtml(userName(contact.user))}</strong>
              <p>@${escapeHtml(contact.user?.nickname)}</p>
            </div>
            <span class="${className(['status-chip', contact.user?.status])}">${escapeHtml(statusLabel(contact.user?.status))}</span>
            <div class="card-actions">
              <button class="secondary-button" data-action="open-direct" data-user-id="${escapeHtml(contact.userId)}">Написать</button>
              <button class="icon-button ${contact.favorite ? 'selected' : ''}" data-action="favorite-contact" data-user-id="${escapeHtml(contact.userId)}" title="${contact.favorite ? 'Убрать из избранного' : 'В избранное'}">${contact.favorite ? icons.starFilled : icons.star}</button>
              <button class="icon-button ${contact.blocked ? 'danger selected' : ''}" data-action="block-contact" data-user-id="${escapeHtml(contact.userId)}" title="${contact.blocked ? 'Разблокировать' : 'Заблокировать'}">${icons.ban}</button>
            </div>
          </article>
        `).join('') || '<div class="empty-state">Контактов пока нет. Найдите пользователя выше.</div>'}
      </section>
    </aside>
  `;
}

function renderCallsSidebar() {
  return `
    <aside class="sidebar">
      ${renderSidebarHeader('Звонки')}
      <div class="metric-grid compact">
        <div><strong>HD</strong><span>аудио</span></div>
        <div><strong>Full HD</strong><span>видео</span></div>
        <div><strong>E2EE</strong><span>шифрование</span></div>
      </div>
      <div class="call-list">
        ${state.calls.map((call) => {
          const chat = state.chats.find((item) => item.id === call.chatId);
          return `
            <article class="call-card">
              <div>
                <strong>${escapeHtml(chat?.title || 'Звонок')}</strong>
                <p>${call.type === 'video' ? 'Видеозвонок' : 'Голосовой звонок'} · ${escapeHtml(call.quality)} · ${call.encrypted ? 'сквозное шифрование' : 'без шифрования'}</p>
              </div>
              <span class="${className(['status-chip', call.status])}">${escapeHtml(statusLabel(call.status))}</span>
            </article>
          `;
        }).join('') || '<div class="empty-state">История звонков пуста</div>'}
      </div>
    </aside>
  `;
}

function renderSettingsSidebar() {
  const s = state.settings || {};
  return `
    <aside class="sidebar settings-sidebar">
      ${renderSidebarHeader('Настройки')}
      <form id="settingsForm" class="settings-form">
        <label>Тема оформления
          <select name="theme">
            ${[['auto', 'Системная (авто)'], ['light', 'Светлая'], ['dark', 'Тёмная']].map(([value, title]) => `<option value="${value}" ${s.theme === value ? 'selected' : ''}>${title}</option>`).join('')}
          </select>
        </label>
      </form>
      <div class="settings-links">
        <button class="settings-link" data-action="open-notify-settings">${icons.bell}<span>Уведомления и звуки</span>${icons.chevronDown}</button>
        <button class="settings-link" data-action="open-privacy-settings">${icons.lock}<span>Конфиденциальность</span>${icons.chevronDown}</button>
      </div>
    </aside>
  `;
}

function renderAdminSidebar() {
  const admin = state.admin;
  return `
    <aside class="sidebar">
      ${renderSidebarHeader('Админ-панель')}
      <div class="metric-grid">
        <div><strong>${admin?.users ?? 0}</strong><span>пользователи</span></div>
        <div><strong>${admin?.chats ?? 0}</strong><span>чаты</span></div>
        <div><strong>${admin?.messages ?? 0}</strong><span>сообщения</span></div>
        <div><strong>${admin?.activeSessions ?? 0}</strong><span>сессии</span></div>
      </div>
      <section class="admin-block">
        <h3>Очереди</h3>
        ${(admin?.queues || []).map((queue) => `
          <div class="queue-row">
            <span>${escapeHtml(queue.name)}</span>
            <strong>${queue.pending}</strong>
            <em>${escapeHtml(queue.status)}</em>
          </div>
        `).join('')}
      </section>
      <section class="admin-block">
        <h3>Мониторинг</h3>
        <p>Prometheus: ${escapeHtml(admin?.monitoring?.prometheus || 'planned')}</p>
        <p>Средняя доставка: ${admin?.monitoring?.averageDeliveryMs || 0} мс</p>
        <p>Логи: ${admin?.monitoring?.logs || 0}</p>
      </section>
    </aside>
  `;
}

function renderNotificationsSidebar() {
  return `
    <aside class="sidebar">
      ${renderSidebarHeader('Уведомления', `<button class="secondary-button" data-action="read-notifications">Прочитать</button>`)}
      <div class="notification-list">
        ${state.notifications.map((item) => `
          <article class="${className(['notification-card', !item.read && 'unread-card'])}">
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.text)}</p>
            <small>${formatDateTime(item.createdAt)}</small>
          </article>
        `).join('') || '<div class="empty-state">Новых уведомлений нет</div>'}
      </div>
    </aside>
  `;
}

function renderMain(chat, messages) {
  if (!chat) {
    return `
      <main class="conversation empty-conversation">
        <button class="mobile-menu" data-action="open-sidebar" title="Меню">${icons.menu}</button>
        <div class="empty-hero">
          <div class="empty-hero-icon">${icons.send}</div>
          <h2>Выберите чат</h2>
          <p>Откройте диалог слева или начните новую переписку через «Контакты».</p>
        </div>
      </main>
    `;
  }
  const typingUser = state.typing[chat.id];
  const typingName = typingUser ? userName(chat.membersDetailed?.find((user) => user.id === typingUser)) : '';
  const searchMatches = chatSearchMatches(chat, messages);
  return `
    <main class="conversation">
      <header class="conversation-header">
        <button class="mobile-menu" data-action="open-sidebar" title="Меню">${icons.menu}</button>
        <img src="${escapeHtml(chat.avatar)}" alt="" />
        <div>
          <h1>${escapeHtml(chat.title)}</h1>
          <p>${escapeHtml(chat.description || chat.membersDetailed?.map(userName).join(', ') || '')}</p>
        </div>
        <div class="header-actions">
          <button class="icon-button ${state.chatSearchOpen ? 'selected' : ''}" data-action="toggle-chat-search" title="Поиск по чату">${icons.search}</button>
          ${chat.type === 'channel'
            ? `<button class="icon-button" data-action="start-conference" title="Конференция">${icons.video}</button>`
            : chat.type === 'saved' ? '' : `<button class="icon-button" data-action="start-voice" title="Голосовой звонок">${icons.phone}</button>
               <button class="icon-button" data-action="start-video" title="Видеозвонок">${icons.video}</button>`}
          <button class="icon-button" data-action="toggle-inspector" title="Информация">${icons.info}</button>
        </div>
      </header>
      ${state.chatSearchOpen ? `
        <div class="chat-search-bar">
          <span>${icons.search}</span>
          <input id="chatSearchInput" value="${escapeHtml(state.chatSearchQuery)}" placeholder="Поиск в этом чате" autocomplete="off" />
          <em>${searchMatches.length ? `${Math.min(state.chatSearchIndex + 1, searchMatches.length)} из ${searchMatches.length}` : (state.chatSearchQuery ? 'нет совпадений' : '')}</em>
          <button class="icon-button" data-action="chat-search-prev" title="Предыдущее" ${searchMatches.length ? '' : 'disabled'}>${icons.chevronUp}</button>
          <button class="icon-button" data-action="chat-search-next" title="Следующее" ${searchMatches.length ? '' : 'disabled'}>${icons.chevronDown}</button>
          <button class="icon-button" data-action="toggle-chat-search" title="Закрыть">${icons.close}</button>
        </div>
      ` : ''}
      ${chat.pinnedMessages?.length ? `
        <button class="pinned-bar" data-message-id="${escapeHtml(chat.pinnedMessages[0].id)}">
          <span>${icons.pin}</span>
          <strong>${escapeHtml(chat.pinnedMessages[0].author?.firstName || 'Закреплено')}</strong>
          <em>${escapeHtml(chat.pinnedMessages[0].text)}</em>
        </button>
      ` : ''}
      <section class="message-list" id="messageList">
        ${messages.map((message, index) => renderMessage(message, chat, searchMatches, messages[index - 1], messages[index + 1])).join('') || '<div class="empty-state">Напишите первое сообщение</div>'}
        ${typingName ? `<div class="typing-line">${escapeHtml(typingName)} печатает...</div>` : ''}
      </section>
      <button id="scrollDownBtn" class="scroll-down" data-action="scroll-to-bottom" title="К последним сообщениям">${icons.arrowDown}</button>
      ${state.uploadProgress ? `
        <div class="upload-progress">
          <span class="upload-progress-name">${icons.paperclip} ${escapeHtml(state.uploadProgress.name)}</span>
          <span class="upload-progress-track"><i id="uploadProgressBar" style="width:${Math.round(state.uploadProgress.percent)}%"></i></span>
          <em id="uploadProgressPct">${Math.round(state.uploadProgress.percent)}%</em>
        </div>
      ` : ''}
      ${state.replyTo ? renderReplyPreview() : ''}
      ${chat.type === 'channel' && !canPostToChannel(chat)
        ? '<div class="composer channel-readonly"><span>Только администраторы могут публиковать в канале</span></div>'
        : state.recording ? `
      <div class="composer recording-bar">
        <span class="rec-dot"></span>
        <strong id="recTimer">0:00</strong>
        <span class="rec-hint">Идёт запись голосового…</span>
        <button class="icon-button danger" type="button" data-action="cancel-recording" title="Отменить">${icons.close}</button>
        <button class="primary-icon" type="button" data-action="stop-recording" title="Отправить">${icons.send}</button>
      </div>` : `
      <form class="composer ${canChoosePostAs(chat) ? 'has-lead' : ''}" id="composerForm">
        <div class="composer-lead">
          <button class="icon-button" type="button" data-action="attach-file" title="Файл">${icons.paperclip}</button>
          ${canChoosePostAs(chat) ? `<select id="postAsSelect" class="post-as-select" title="От чьего имени публиковать">
            <option value="channel">${escapeHtml(chat.title)}</option>
            <option value="user">Я</option>
          </select>` : ''}
          <input id="fileInput" class="visually-hidden" type="file" />
        </div>
        <textarea id="composerInput" name="text" rows="1" placeholder="${chat.type === 'channel' ? 'Новая публикация…' : 'Сообщение, файл, ссылка или команда'}">${escapeHtml(state.composerText)}</textarea>
        <button class="icon-button" type="button" data-action="record-voice" title="Голосовое сообщение">${icons.mic}</button>
        <button class="primary-icon" type="submit" title="Отправить">${icons.send}</button>
      </form>`}
    </main>
  `;
}

// Messages (ids) matching the in-chat search query, in display order.
function chatSearchMatches(chat, messages) {
  const query = state.chatSearchOpen ? state.chatSearchQuery.trim().toLowerCase() : '';
  if (!query) return [];
  return messages.filter((message) => (message.text || '').toLowerCase().includes(query)).map((message) => message.id);
}

// Wraps matches in <mark>, skipping anything inside HTML tags.
function markMatches(html, query) {
  if (!query) return html;
  const escaped = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.replace(new RegExp(`(${escaped})(?![^<]*>)`, 'gi'), '<mark>$1</mark>');
}

function canPostToChannel(chat) {
  if (chat.ownerId === state.me.id || (chat.admins || []).includes(state.me.id)) return true;
  return Boolean(chat.postAsUser) && (chat.postAsUserAllowed || []).includes(state.me.id);
}

function canChoosePostAs(chat) {
  return chat.type === 'channel' && Boolean(chat.postAsUser) && canPostToChannel(chat);
}

function isImageFile(file) {
  return /^image\//.test(file.type || '') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name || '');
}

function isAudioFile(file) {
  return /^audio\//.test(file.type || '') || /\.(webm|ogg|mp3|m4a|wav)$/i.test(file.name || '');
}

function findChatMessage(chatId, messageId) {
  return (state.messages[chatId] || []).find((item) => item.id === messageId) || null;
}

function renderMessage(message, chat, searchMatches = [], prev = null, next = null) {
  const own = message.authorId === state.me.id;
  const reactions = Object.entries(message.reactions || {});
  const query = state.chatSearchOpen ? state.chatSearchQuery.trim() : '';
  const matchIndex = searchMatches.indexOf(message.id);
  const isCurrentMatch = matchIndex >= 0 && matchIndex === Math.min(state.chatSearchIndex, searchMatches.length - 1);
  // Message grouping (Telegram-style): a "run" is consecutive messages from the
  // same author. Direct/saved chats never show avatars or the author name.
  const isDirect = chat.type === 'direct' || chat.type === 'saved';
  const firstOfRun = !prev || prev.authorId !== message.authorId;
  const lastOfRun = !next || next.authorId !== message.authorId;
  const showAvatar = !own && !isDirect && lastOfRun && !message.author?.isChannel;
  const showName = !own && !isDirect && firstOfRun;
  const files = (message.attachments || []).map((file) => {
    if (isImageFile(file) && file.url && file.url !== '#') {
      const cached = state.imageBlobs[file.id] || '';
      return `
        <button class="attachment-image" data-action="view-image" data-file-id="${escapeHtml(file.id)}" data-file-name="${escapeHtml(file.name)}" title="${escapeHtml(file.name)}">
          <img data-img-file="${escapeHtml(file.id)}" ${cached ? `src="${cached}"` : ''} alt="${escapeHtml(file.name)}" />
        </button>`;
    }
    if (isAudioFile(file) && file.url && file.url !== '#') {
      const cachedAudio = state.audioBlobs[file.id] || '';
      return `
        <div class="attachment-audio">
          <audio controls preload="metadata" data-audio-file="${escapeHtml(file.id)}" ${cachedAudio ? `src="${cachedAudio}"` : ''}></audio>
          <em>${message.kind === 'voice' ? 'Голосовое сообщение' : escapeHtml(file.name)} · ${formatSize(file.size)}</em>
        </div>`;
    }
    return `
    <div class="attachment">
      <span>${icons.paperclip}</span>
      <strong>${escapeHtml(file.name)}</strong>
      <em>${formatSize(file.size)} · ${escapeHtml(file.scanStatus || 'pending')}</em>
      ${file.url && file.url !== '#' ? `<button data-action="download-file" data-file-id="${escapeHtml(file.id)}" data-file-name="${escapeHtml(file.name)}">Скачать</button>` : ''}
    </div>`;
  }).join('');
  const quoted = message.replyTo ? findChatMessage(message.chatId, message.replyTo) : null;
  const quoteHtml = message.replyTo ? `
    <button class="reply-chip" data-action="jump-to-message" data-target-id="${escapeHtml(message.replyTo)}">
      <strong>${escapeHtml(quoted ? (quoted.authorId === state.me.id ? 'Вы' : userName(quoted.author)) : 'Сообщение')}</strong>
      <span>${escapeHtml(quoted ? (quoted.text || 'Вложение').slice(0, 120) : 'недоступно')}</span>
    </button>` : '';
  // Channel posts keep a static logo/avatar; grouped runs share one avatar slot.
  const avatarSlot = own || isDirect ? '' : (showAvatar
    ? (message.author?.isChannel
        ? `<img class="msg-avatar" src="${escapeHtml(message.author?.avatar || '/assets/logo/twiftyz-mark-2a.png')}" alt="" />`
        : `<button class="avatar-button msg-avatar" data-action="view-user" data-user-id="${escapeHtml(message.authorId)}" title="Профиль"><img src="${escapeHtml(message.author?.avatar || '/assets/logo/twiftyz-mark-2a.png')}" alt="" /></button>`)
    : '<span class="msg-avatar-spacer"></span>');
  return `
    <article class="${className(['message', own && 'own', isDirect && 'no-avatar', !lastOfRun && 'grouped', isCurrentMatch && 'search-current'])}" data-message-id="${escapeHtml(message.id)}">
      ${avatarSlot}
      <div class="message-bubble">
        ${showName ? `<div class="message-top">
          <strong>${escapeHtml(userName(message.author))}</strong>
        </div>` : ''}
        ${quoteHtml}
        <p>${markMatches(linkify(message.text), query)}</p>
        ${files}
        ${renderLinkPreview(message.text)}
        ${reactions.length ? `<div class="message-actions">
          ${reactions.map(([emoji, users]) => `<button class="${users.includes(state.me.id) ? 'my-reaction' : ''}" data-action="react" data-emoji="${escapeHtml(emoji)}">${escapeHtml(emoji)} ${users.length}</button>`).join('')}
        </div>` : ''}
        <span class="msg-time">${formatTime(message.createdAt)}${message.editedAt ? ' · изм.' : ''}</span>
      </div>
    </article>
  `;
}

function linkify(text) {
  const escaped = escapeHtml(text || '');
  return escaped.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>');
}

function firstUrl(text) {
  const match = String(text || '').match(/https?:\/\/[^\s<]+/);
  return match ? match[0].replace(/[.,)]+$/, '') : '';
}

function renderLinkPreview(text) {
  const url = firstUrl(text);
  if (!url) return '';
  const preview = state.linkPreviews[url];
  if (!preview || (!preview.title && !preview.description && !preview.image)) return '';
  return `
    <a class="link-preview" href="${escapeHtml(preview.url || url)}" target="_blank" rel="noreferrer">
      ${preview.image ? `<img class="link-preview-image" src="${escapeHtml(preview.image)}" alt="" loading="lazy" onerror="this.remove()" />` : ''}
      <span class="link-preview-meta">
        <em>${escapeHtml(preview.site || new URL(url).hostname)}</em>
        ${preview.title ? `<strong>${escapeHtml(preview.title)}</strong>` : ''}
        ${preview.description ? `<span>${escapeHtml(preview.description)}</span>` : ''}
      </span>
    </a>`;
}

// Loads image/audio attachments as authorized blobs and injects them into the DOM.
async function ensureInlineMedia() {
  const targets = [
    ...Array.from(document.querySelectorAll('img[data-img-file]')).map((el) => ({ el, id: el.getAttribute('data-img-file'), cache: state.imageBlobs })),
    ...Array.from(document.querySelectorAll('audio[data-audio-file]')).map((el) => ({ el, id: el.getAttribute('data-audio-file'), cache: state.audioBlobs }))
  ].filter(({ el }) => !el.getAttribute('src'));
  for (const { el, id: fileId, cache } of targets) {
    if (cache[fileId]) { el.src = cache[fileId]; continue; }
    try {
      const response = await fetch(`/api/files/${encodeURIComponent(fileId)}/download`, {
        headers: { Authorization: `Bearer ${state.token}` }
      });
      if (!response.ok) continue;
      const objectUrl = URL.createObjectURL(await response.blob());
      cache[fileId] = objectUrl;
      el.src = objectUrl;
    } catch {
      // Ignore load failures; the file card link still works.
    }
  }
}

// Lazily fetches link metadata for URLs in the visible chat, then re-renders once.
async function ensureLinkPreviews(urls) {
  const pending = [...new Set(urls)].filter((url) => !(url in state.linkPreviews));
  if (!pending.length) return;
  pending.forEach((url) => { state.linkPreviews[url] = null; });
  const results = await Promise.all(pending.map((url) => request(`/api/link-preview?url=${encodeURIComponent(url)}`).catch(() => null)));
  let changed = false;
  pending.forEach((url, index) => {
    if (results[index] && (results[index].title || results[index].image || results[index].description)) {
      state.linkPreviews[url] = results[index];
      changed = true;
    }
  });
  if (changed) render();
}

function renderReplyPreview() {
  const message = findChatMessage(state.activeChatId, state.replyTo);
  const author = message ? (message.authorId === state.me.id ? 'Вы' : userName(message.author)) : 'Ответ';
  return `
    <div class="reply-preview">
      <span>Ответ</span>
      <span class="reply-preview-meta">
        <strong>${escapeHtml(author)}</strong>
        <em>${escapeHtml((message?.text || 'Вложение').slice(0, 140))}</em>
      </span>
      <button data-action="cancel-reply">×</button>
    </div>
  `;
}

function renderInspector(chat) {
  const visible = state.inspectorOpen && chat;
  if (!chat) return `<aside class="${className(['inspector', state.inspectorOpen && 'visible'])}"></aside>`;
  const isAdmin = chat.ownerId === state.me.id || (chat.admins || []).includes(state.me.id);
  const isChannelAdmin = chat.type === 'channel' && isAdmin;
  return `
    ${visible ? '<div class="inspector-backdrop" data-action="close-inspector"></div>' : ''}
    <aside class="${className(['inspector', visible && 'visible'])}">
      <div class="inspector-top">
        <strong>Информация</strong>
        <button class="icon-button" data-action="close-inspector" title="Закрыть">${icons.close}</button>
      </div>
      <section class="inspector-card profile-cover">
        <img src="${escapeHtml(chat.avatar)}" alt="" />
        <h2>${escapeHtml(chat.title)}</h2>
        <p>${escapeHtml(chat.description || 'Без описания')}</p>
        <span>${chat.members.length} участников · ${chat.isPublic ? 'публичный' : 'приватный'} ${chat.type}</span>
      </section>
      <button class="secondary-button inspector-settings" data-action="${isChannelAdmin ? 'channel-settings' : 'chat-notify-settings'}">
        ${icons.settings}<span>${isChannelAdmin ? 'Управление каналом' : 'Настройки уведомлений'}</span>
      </button>
      ${(chat.type === 'group' || chat.type === 'channel') ? (
        chat.ownerId === state.me.id
          ? `<button class="secondary-button danger inspector-settings" data-action="delete-chat">${icons.close}<span>Удалить ${chat.type === 'channel' ? 'канал' : 'группу'}</span></button>`
          : `<button class="secondary-button danger inspector-settings" data-action="leave-chat">${icons.back}<span>Покинуть ${chat.type === 'channel' ? 'канал' : 'группу'}</span></button>`
      ) : ''}
      ${(chat.type === 'group' || chat.type === 'channel') && chat.inviteLink ? `
        <section class="inspector-card">
          <h3>Ссылка-приглашение</h3>
          <div class="invite-row">
            <input class="invite-input" readonly value="${escapeHtml(chat.inviteLink)}" />
            <button class="secondary-button" data-action="copy-invite" data-link="${escapeHtml(chat.inviteLink)}">Копировать</button>
          </div>
          <p class="invite-hint">Отправьте ссылку — по ней присоединятся к ${chat.type === 'channel' ? 'каналу' : 'группе'}.</p>
        </section>
      ` : ''}
      <section class="inspector-card">
        <h3>Участники</h3>
        ${(chat.membersDetailed || []).map((user) => `
          <button class="member-row" data-action="view-user" data-user-id="${escapeHtml(user.id)}">
            <img src="${escapeHtml(user.avatar)}" alt="" />
            <div><strong>${escapeHtml(userName(user))}</strong><span>@${escapeHtml(user.nickname)}</span></div>
            <em class="${className(['presence', user.status])}"></em>
          </button>
        `).join('')}
      </section>
      <section class="inspector-card">
        <h3>Функции</h3>
        <div class="feature-tags">
          <span>${icons.lock} E2EE ready</span>
          <span>Файлы</span>
          <span>Поиск</span>
          <span>Реакции</span>
          <span>Закрепы</span>
          <span>WebRTC-ready</span>
        </div>
      </section>
      ${chat.analytics ? `
        <section class="inspector-card">
          <h3>Аналитика канала</h3>
          <div class="metric-grid compact">
            <div><strong>${chat.analytics.views}</strong><span>просмотры</span></div>
            <div><strong>${chat.analytics.reactions}</strong><span>реакции</span></div>
            <div><strong>+${chat.analytics.subscribersDelta}</strong><span>подписки</span></div>
          </div>
        </section>
      ` : ''}
    </aside>
  `;
}

function bindEvents() {
  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', async () => {
      state.view = button.dataset.view;
      state.sidebarOpen = true;
      if (state.view === 'settings') await loadSessions();
      render();
    });
  });

  document.querySelectorAll('[data-chat-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      state.activeChatId = button.dataset.chatId;
      state.view = 'chats';
      state.sidebarOpen = false;
      await loadActiveMessages();
      render();
      // Desktop: the composer is ready to type as soon as a chat opens.
      if (window.matchMedia('(pointer: fine)').matches) document.querySelector('#composerInput')?.focus();
    });
  });

  document.querySelector('#chatSearch')?.addEventListener('input', (event) => {
    state.search = event.target.value;
    render();
  });

  const chatSearchInput = document.querySelector('#chatSearchInput');
  if (chatSearchInput) {
    chatSearchInput.addEventListener('input', (event) => {
      state.chatSearchQuery = event.target.value;
      state.chatSearchIndex = 0;
      render();
      const next = document.querySelector('#chatSearchInput');
      if (next) {
        next.focus();
        next.setSelectionRange(next.value.length, next.value.length);
      }
      scrollToCurrentMatch();
    });
    chatSearchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        stepChatSearch(1);
      }
      if (event.key === 'Escape') closeChatSearch();
    });
  }

  const composerInput = document.querySelector('#composerInput');
  if (composerInput) {
    composerInput.addEventListener('input', (event) => {
      state.composerText = event.target.value;
      autosizeComposer();
      sendTyping(true);
    });
    // Enter sends the message; Shift+Enter inserts a line break.
    composerInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        document.querySelector('#composerForm')?.requestSubmit();
      }
    });
    // Ctrl+V with an image or a file in the clipboard — offer to send it as an attachment.
    composerInput.addEventListener('paste', (event) => {
      const file = Array.from(event.clipboardData?.files || [])[0];
      if (!file) return;
      event.preventDefault();
      const isImage = (file.type || '').startsWith('image/');
      if (isImage && (!file.name || file.name === 'image.png')) {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        pendingPasteFile = new File([file], `paste_${stamp}.png`, { type: file.type || 'image/png' });
      } else {
        pendingPasteFile = file;
      }
      openModal({
        kind: 'paste-image',
        blobUrl: isImage ? URL.createObjectURL(pendingPasteFile) : '',
        fileName: pendingPasteFile.name,
        fileSize: pendingPasteFile.size
      });
    });
    // Auto-grow up to ~12 lines, like Telegram.
    autosizeComposer();
  }
  document.querySelector('#fileInput')?.addEventListener('change', uploadSelectedFile);

  const pinnedBar = document.querySelector('.pinned-bar');
  pinnedBar?.addEventListener('click', () => jumpToMessage(pinnedBar.dataset.messageId));

  // Right click / long press on a chat in the list opens the chat menu.
  const chatList = document.querySelector('.chat-list');
  if (chatList) {
    chatList.addEventListener('contextmenu', (event) => {
      const chatEl = event.target.closest('[data-chat-id]');
      if (!chatEl) return;
      event.preventDefault();
      openChatMenu(chatEl.dataset.chatId, event.clientX, event.clientY);
    });
    let chatPressTimer = null;
    chatList.addEventListener('touchstart', (event) => {
      const chatEl = event.target.closest('[data-chat-id]');
      if (!chatEl) return;
      const touch = event.touches[0];
      chatPressTimer = window.setTimeout(() => openChatMenu(chatEl.dataset.chatId, touch.clientX, touch.clientY), 450);
    }, { passive: true });
    for (const type of ['touchend', 'touchmove', 'touchcancel']) {
      chatList.addEventListener(type, () => window.clearTimeout(chatPressTimer), { passive: true });
    }
  }

  // Right click (desktop) or long press (touch) opens the message menu.
  const messageList = document.querySelector('#messageList');
  if (messageList) {
    messageList.addEventListener('contextmenu', (event) => {
      const messageEl = event.target.closest('[data-message-id]');
      if (!messageEl) return;
      event.preventDefault();
      openMessageMenu(messageEl.dataset.messageId, event.clientX, event.clientY);
    });
    let pressTimer = null;
    messageList.addEventListener('touchstart', (event) => {
      const messageEl = event.target.closest('[data-message-id]');
      if (!messageEl) return;
      const touch = event.touches[0];
      pressTimer = window.setTimeout(() => openMessageMenu(messageEl.dataset.messageId, touch.clientX, touch.clientY), 450);
    }, { passive: true });
    for (const type of ['touchend', 'touchmove', 'touchcancel']) {
      messageList.addEventListener(type, () => window.clearTimeout(pressTimer), { passive: true });
    }
  }

  document.querySelector('#userSearchForm')?.addEventListener('submit', searchUsers);
  document.querySelector('#composerForm')?.addEventListener('submit', sendMessage);
  document.querySelector('#settingsForm')?.addEventListener('submit', (event) => event.preventDefault());
  // The theme applies immediately on change — no "save" button needed.
  document.querySelector('#settingsForm select[name="theme"]')?.addEventListener('change', async (event) => {
    try {
      state.settings = await request('/api/settings', { method: 'PATCH', body: { ...state.settings, theme: event.target.value } });
      applyAppearance(state.settings.theme, state.settings.fontSize);
    } catch (error) { setToast(error.message); }
  });

  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', handleAction);
  });
}

async function handleAction(event) {
  const button = event.currentTarget;
  const action = button.dataset.action;
  const messageEl = button.closest('[data-message-id]');
  const messageId = messageEl?.dataset.messageId;

  try {
    if (action === 'open-sidebar') {
      state.sidebarOpen = true;
      render();
    }
    if (action === 'set-chat-filter') {
      state.chatFilter = button.dataset.filter || 'all';
      render();
    }
    if (action === 'close-sidebar') {
      state.sidebarOpen = false;
      render();
    }
    if (action === 'toggle-inspector') {
      state.inspectorOpen = !state.inspectorOpen;
      render();
    }
    if (action === 'close-inspector') {
      state.inspectorOpen = false;
      render();
    }
    if (action === 'start-conference') {
      infoModal('Конференции', 'Групповые конференции в канале сейчас в разработке — скоро добавим.');
    }
    if (action === 'open-settings-view') {
      closeModal();
      state.view = 'settings';
      state.sidebarOpen = true;
      await loadSessions();
      render();
    }
    if (action === 'open-notify-settings') {
      openModal({ kind: 'notify-global' });
    }
    if (action === 'open-privacy-settings') {
      await loadSessions();
      openModal({ kind: 'privacy' });
    }
    if (action === 'open-password-change') {
      openModal({ kind: 'password-change', error: '' });
    }
    if (action === 'unblock-user') {
      const updated = await request(`/api/contacts/${button.dataset.userId}`, { method: 'PATCH', body: { blocked: false } });
      state.contacts = state.contacts.map((item) => item.userId === updated.userId ? updated : item);
      openModal({ kind: 'privacy' });
      render();
    }
    if (action === 'toggle-chat-search') {
      if (state.chatSearchOpen) {
        closeChatSearch();
      } else {
        state.chatSearchOpen = true;
        state.chatSearchQuery = '';
        state.chatSearchIndex = 0;
        render();
        document.querySelector('#chatSearchInput')?.focus();
      }
    }
    if (action === 'chat-search-prev') {
      stepChatSearch(-1);
    }
    if (action === 'chat-search-next') {
      stepChatSearch(1);
    }
    if (action === 'scroll-to-bottom') {
      const list = document.querySelector('#messageList');
      if (list) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
    }
    if (action === 'jump-to-message') {
      jumpToMessage(button.dataset.targetId);
    }
    if (action === 'message-menu') {
      const rect = button.getBoundingClientRect();
      openMessageMenu(messageId, rect.left, rect.bottom + 4);
    }
    if (action === 'open-create-menu') {
      const rect = button.getBoundingClientRect();
      openCreateMenu(rect.left, rect.bottom + 6);
    }
    if (action === 'mobile-tab') {
      state.view = button.dataset.tab;
      state.sidebarOpen = true;
      if (state.view === 'settings') await loadSessions();
      render();
    }
    if (action === 'view-user') {
      const user = await request(`/api/users/${button.dataset.userId}`);
      openModal({ kind: 'user-profile', user });
    }
    if (action === 'view-image') {
      openModal({ kind: 'lightbox', fileId: button.dataset.fileId, name: button.dataset.fileName || '' });
    }
    if (action === 'open-saved') {
      const chat = await request('/api/chats', { method: 'POST', body: { type: 'saved' } });
      if (!state.chats.some((item) => item.id === chat.id)) state.chats.unshift(chat);
      state.activeChatId = chat.id;
      state.view = 'chats';
      state.sidebarOpen = false;
      await loadActiveMessages();
      render();
    }
    if (action === 'leave-chat') {
      const chat = activeChat();
      if (chat) {
        const noun = chat.type === 'channel' ? 'канал' : 'группу';
        confirmAction({
          title: `Покинуть ${noun}`,
          message: `Вы выйдете из «${chat.title}» и перестанете получать сообщения. Вернуться можно по ссылке-приглашению.`,
          confirmLabel: 'Покинуть',
          danger: true,
          onConfirm: async () => {
            try {
              await request(`/api/chats/${chat.id}/leave`, { method: 'POST', body: {} });
              removeChatLocally(chat.id);
              setToast(`Вы покинули ${noun}`);
            } catch (error) {
              setToast(error.message);
            }
          }
        });
      }
    }
    if (action === 'delete-chat') {
      const chat = activeChat();
      if (chat) {
        const noun = chat.type === 'channel' ? 'Канал' : 'Группа';
        confirmAction({
          title: `Удалить ${chat.type === 'channel' ? 'канал' : 'группу'}`,
          message: `«${chat.title}» и вся история сообщений будут удалены у всех участников. Это действие нельзя отменить.`,
          confirmLabel: 'Удалить',
          danger: true,
          onConfirm: async () => {
            try {
              await request(`/api/chats/${chat.id}`, { method: 'DELETE' });
              removeChatLocally(chat.id);
              setToast(`${noun} удален${chat.type === 'channel' ? '' : 'а'}`);
            } catch (error) {
              setToast(error.message);
            }
          }
        });
      }
    }
    if (action === 'record-voice') {
      await startVoiceRecording();
    }
    if (action === 'stop-recording') {
      finishVoiceRecording(true);
    }
    if (action === 'cancel-recording') {
      finishVoiceRecording(false);
    }
    if (action === 'react') {
      const message = await request(`/api/messages/${messageId}/reactions`, {
        method: 'POST',
        body: { emoji: button.dataset.emoji }
      });
      updateMessage(message);
      render();
    }
    if (action === 'reply-message') {
      state.replyTo = messageId;
      render();
    }
    if (action === 'edit-message') {
      const message = (state.messages[state.activeChatId] || []).find((item) => item.id === messageId);
      if (message) openModal({ kind: 'edit-message', messageId, text: message.text || '' });
    }
    if (action === 'cancel-reply') {
      state.replyTo = null;
      render();
    }
    if (action === 'pin-message') {
      await request(`/api/messages/${messageId}/pin`, { method: 'POST', body: {} });
      await refreshChats();
    }
    if (action === 'delete-message') {
      confirmAction({
        title: 'Удалить сообщение',
        message: 'Сообщение будет удалено для всех участников. Это действие нельзя отменить.',
        confirmLabel: 'Удалить',
        danger: true,
        onConfirm: async () => {
          try {
            await request(`/api/messages/${messageId}?scope=everyone`, { method: 'DELETE' });
            await loadActiveMessages();
            render();
          } catch (error) {
            setToast(error.message);
          }
        }
      });
    }
    if (action === 'attach-file') {
      document.querySelector('#fileInput')?.click();
    }
    if (action === 'download-file') {
      await downloadFile(button.dataset.fileId, button.dataset.fileName);
    }
    if (action === 'toggle-chat-pin') {
      await updateChatState(button.dataset.chatId, { pinned: !state.chats.find((chat) => chat.id === button.dataset.chatId)?.isPinnedByMe });
    }
    if (action === 'toggle-chat-archive') {
      await updateChatState(button.dataset.chatId, { archived: !state.chats.find((chat) => chat.id === button.dataset.chatId)?.isArchivedByMe });
    }
    if (action === 'profile-call') {
      infoModal('Звонки', 'Звонки сейчас в разработке — совсем скоро можно будет звонить прямо из профиля.');
    }
    if (action === 'start-voice' || action === 'start-video') {
      infoModal(
        action === 'start-video' ? 'Видеозвонки' : 'Голосовые звонки',
        'Звонки сейчас в разработке — совсем скоро можно будет звонить прямо из чата.'
      );
    }
    if (action === 'read-notifications') {
      await request('/api/notifications', { method: 'PATCH', body: {} });
      state.notifications = state.notifications.map((item) => ({ ...item, read: true }));
      render();
    }
    if (action === 'favorite-contact') {
      const contact = state.contacts.find((item) => item.userId === button.dataset.userId);
      const updated = await request(`/api/contacts/${button.dataset.userId}`, { method: 'PATCH', body: { favorite: !contact.favorite } });
      state.contacts = state.contacts.map((item) => item.userId === updated.userId ? updated : item);
      render();
    }
    if (action === 'block-contact') {
      const contact = state.contacts.find((item) => item.userId === button.dataset.userId);
      const toggleBlock = async () => {
        try {
          const updated = await request(`/api/contacts/${button.dataset.userId}`, { method: 'PATCH', body: { blocked: !contact.blocked } });
          state.contacts = state.contacts.map((item) => item.userId === updated.userId ? updated : item);
          render();
        } catch (error) {
          setToast(error.message);
        }
      };
      if (contact?.blocked) {
        await toggleBlock();
      } else {
        confirmAction({
          title: 'Заблокировать пользователя',
          message: `${userName(contact?.user)} больше не сможет писать вам. Разблокировать можно в любой момент.`,
          confirmLabel: 'Заблокировать',
          danger: true,
          onConfirm: toggleBlock
        });
      }
    }
    if (action === 'open-direct') {
      if (state.modal) closeModal();
      await openDirect(button.dataset.userId);
    }
    if (action === 'add-contact') {
      await addContact(button.dataset.userId);
    }
    if (action === 'find-user') {
      findAndAddUser();
    }
    if (action === 'new-group') {
      createGroup();
    }
    if (action === 'new-channel') {
      createChannel();
    }
    if (action === 'join-by-link') {
      openModal({ kind: 'join-link', link: '', error: '' });
    }
    if (action === 'open-profile') {
      openModal({ kind: 'profile', error: '' });
    }
    if (action === 'channel-settings') {
      const chat = activeChat();
      if (chat) openModal({ kind: 'channel-settings', chatId: chat.id, title: chat.title, description: chat.description || '', postAsUser: Boolean(chat.postAsUser), allowed: [...(chat.postAsUserAllowed || [])], error: '' });
    }
    if (action === 'chat-notify-settings') {
      const chat = activeChat();
      if (chat) openModal({ kind: 'notify-settings', chatId: chat.id, muted: (chat.mutedBy || []).includes(state.me.id) });
    }
    if (action === 'copy-invite') {
      const link = button.dataset.link || '';
      try {
        await navigator.clipboard.writeText(link);
        setToast('Ссылка скопирована');
      } catch {
        setToast(link);
      }
    }
    if (action === 'load-sessions') {
      await loadSessions();
      render();
    }
    if (action === 'revoke-session') {
      const sessionId = button.dataset.sessionId;
      const fromPrivacy = state.modal?.kind === 'privacy';
      confirmAction({
        title: 'Завершить сессию',
        message: 'Устройство будет отключено и потребует повторного входа.',
        confirmLabel: 'Завершить',
        danger: true,
        onConfirm: async () => {
          try {
            await revokeSession(sessionId);
            if (fromPrivacy) openModal({ kind: 'privacy' });
          } catch (error) {
            setToast(error.message);
          }
        }
      });
    }
    if (action === 'logout') {
      confirmAction({
        title: 'Выйти из аккаунта',
        message: 'Вы выйдете из текущей сессии на этом устройстве.',
        confirmLabel: 'Выйти',
        danger: true,
        onConfirm: async () => {
          try {
            await request('/api/auth/logout', { method: 'POST', body: {} });
          } catch {
            // Local logout must still work if the session is already expired.
          }
          localStorage.removeItem(TOKEN_KEY);
          state.token = '';
          state.me = null;
          state.ws?.close();
          renderAuth();
        }
      });
    }
  } catch (error) {
    setToast(error.message);
  }
}

async function sendMessage(event) {
  event.preventDefault();
  const text = state.composerText.trim();
  if (!text) return;
  const postAs = document.querySelector('#postAsSelect')?.value;
  try {
    const message = await request(`/api/chats/${state.activeChatId}/messages`, {
      method: 'POST',
      body: { text, replyTo: state.replyTo, ...(postAs ? { postAs } : {}) }
    });
    const list = state.messages[state.activeChatId] || [];
    if (!list.some((item) => item.id === message.id)) state.messages[state.activeChatId] = [...list, message];
    state.composerText = '';
    state.replyTo = null;
    sendTyping(false);
    await refreshChats();
    render();
  } catch (error) {
    setToast(error.message);
  }
}

// Multipart upload through XHR — fetch cannot report upload progress.
function uploadWithProgress(formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/files');
    if (state.token) xhr.setRequestHeader('Authorization', `Bearer ${state.token}`);
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) onProgress((event.loaded / event.total) * 100);
    });
    xhr.addEventListener('load', () => {
      let data = null;
      try { data = xhr.responseText ? JSON.parse(xhr.responseText) : null; } catch { /* not JSON */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data?.error || `HTTP ${xhr.status}`));
    });
    xhr.addEventListener('error', () => reject(new Error('Сбой сети при загрузке файла')));
    xhr.addEventListener('abort', () => reject(new Error('Загрузка отменена')));
    xhr.send(formData);
  });
}

// Updates the visible progress bar without a full re-render (keeps input focus).
function setUploadProgress(percent) {
  if (!state.uploadProgress) return;
  state.uploadProgress.percent = percent;
  const bar = document.querySelector('#uploadProgressBar');
  const pct = document.querySelector('#uploadProgressPct');
  if (bar) bar.style.width = `${Math.round(percent)}%`;
  if (pct) pct.textContent = `${Math.round(percent)}%`;
}

async function sendFileMessage(file, { kind, text } = {}) {
  const postAs = document.querySelector('#postAsSelect')?.value;
  const message = await request(`/api/chats/${state.activeChatId}/messages`, {
    method: 'POST',
    body: {
      text: text ?? (state.composerText.trim() || ''),
      attachments: [file],
      replyTo: state.replyTo,
      ...(kind ? { kind } : {}),
      ...(postAs ? { postAs } : {})
    }
  });
  const list = state.messages[state.activeChatId] || [];
  if (!list.some((item) => item.id === message.id)) state.messages[state.activeChatId] = [...list, message];
  state.composerText = '';
  state.replyTo = null;
  await refreshChats();
  render();
}

async function uploadSelectedFile(event) {
  const selected = event.target.files?.[0];
  if (!selected) return;
  if (selected.size > 25 * 1024 * 1024) {
    setToast('Файл больше 25 МБ');
    event.target.value = '';
    return;
  }
  try {
    const body = new FormData();
    body.append('chatId', state.activeChatId);
    body.append('file', selected);
    state.uploadProgress = { name: selected.name, percent: 0 };
    render();
    const file = await uploadWithProgress(body, setUploadProgress);
    state.uploadProgress = null;
    await sendFileMessage(file);
  } catch (error) {
    state.uploadProgress = null;
    setToast(error.message);
    render();
  } finally {
    event.target.value = '';
  }
}

/* ---------- voice messages (MediaRecorder) ---------- */

let mediaRecorder = null;
let recordedChunks = [];
let recordingTimer = null;
let recordingShouldSend = false;

// Picks a recording format the current browser actually supports.
// Order matters: Opus/webm is best on Chrome/Firefox; Safari/iOS only does mp4.
function pickAudioMime() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/webm'
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(type)) return type;
  }
  return '';
}

function extForMime(mime) {
  if (/mp4|aac|m4a/i.test(mime)) return 'm4a';
  if (/ogg/i.test(mime)) return 'ogg';
  if (/wav/i.test(mime)) return 'wav';
  return 'webm';
}

async function startVoiceRecording() {
  if (state.recording) return;
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    setToast('Запись звука не поддерживается этим браузером');
    return;
  }
  let stream;
  try {
    // Clean voice: cancel echo, suppress noise, normalise gain, high sample rate.
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 48000
      }
    });
  } catch {
    setToast('Нет доступа к микрофону — разрешите его в браузере');
    return;
  }
  const mimeType = pickAudioMime();
  recordedChunks = [];
  recordingShouldSend = false;
  try {
    mediaRecorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: 128000
    });
  } catch {
    mediaRecorder = new MediaRecorder(stream);
  }
  mediaRecorder.addEventListener('dataavailable', (event) => {
    if (event.data.size) recordedChunks.push(event.data);
  });
  mediaRecorder.addEventListener('stop', async () => {
    stream.getTracks().forEach((track) => track.stop());
    const send = recordingShouldSend;
    const chunks = recordedChunks;
    // Use the recorder's real mimeType so the file matches what was recorded.
    const actualMime = (mediaRecorder?.mimeType || mimeType || 'audio/webm').split(';')[0];
    mediaRecorder = null;
    recordedChunks = [];
    state.recording = null;
    window.clearInterval(recordingTimer);
    render();
    if (!send || !chunks.length) return;
    try {
      const blob = new Blob(chunks, { type: actualMime });
      if (blob.size < 256) { setToast('Запись слишком короткая'); return; }
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const body = new FormData();
      body.append('chatId', state.activeChatId);
      body.append('file', new File([blob], `voice_${stamp}.${extForMime(actualMime)}`, { type: actualMime }));
      state.uploadProgress = { name: 'Голосовое сообщение', percent: 0 };
      render();
      const file = await uploadWithProgress(body, setUploadProgress);
      state.uploadProgress = null;
      await sendFileMessage(file, { kind: 'voice', text: '' });
    } catch (error) {
      state.uploadProgress = null;
      setToast(error.message);
      render();
    }
  });
  mediaRecorder.start();
  state.recording = { startedAt: Date.now() };
  render();
  recordingTimer = window.setInterval(() => {
    const el = document.querySelector('#recTimer');
    if (!el || !state.recording) return;
    const seconds = Math.floor((Date.now() - state.recording.startedAt) / 1000);
    el.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }, 500);
}

function finishVoiceRecording(send) {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
  recordingShouldSend = send;
  mediaRecorder.stop();
}

async function downloadFile(fileId, fileName) {
  const response = await fetch(`/api/files/${encodeURIComponent(fileId)}/download`, {
    headers: { Authorization: `Bearer ${state.token}` }
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Download failed: ${response.status}`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || 'download';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Grows the composer with the text, capped at ~12 lines.
function autosizeComposer() {
  const ta = document.querySelector('#composerInput');
  if (!ta) return;
  ta.style.height = 'auto';
  ta.style.height = `${Math.min(ta.scrollHeight, 300)}px`;
}

// Short two-tone "ding" through WebAudio — no sound files needed.
let audioCtx = null;
function playMessageSound() {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.setValueAtTime(1174, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.28);
  } catch {
    // Audio may be blocked before the first user gesture; that's fine.
  }
}

function sendTyping(isTyping) {
  if (state.ws?.readyState === WebSocket.OPEN && state.activeChatId) {
    state.ws.send(JSON.stringify({ type: 'typing', chatId: state.activeChatId, isTyping }));
  }
}

async function refreshChats() {
  state.chats = await request('/api/chats');
  const chat = activeChat();
  if (chat) state.activeChatId = chat.id;
}

// Removes a chat from local state (after leave/delete or a chat:removed event).
function removeChatLocally(chatId) {
  const existed = state.chats.some((chat) => chat.id === chatId);
  state.chats = state.chats.filter((chat) => chat.id !== chatId);
  delete state.messages[chatId];
  state.inspectorOpen = false;
  if (state.activeChatId === chatId) {
    state.activeChatId = state.chats[0]?.id || '';
    if (state.activeChatId) loadActiveMessages().then(render);
  }
  if (existed) render();
}

async function updateChatState(chatId, patch) {
  const updated = await request(`/api/chats/${chatId}/state`, {
    method: 'PATCH',
    body: patch
  });
  state.chats = state.chats.map((chat) => chat.id === updated.id ? updated : chat);
  if (updated.isArchivedByMe && state.activeChatId === updated.id && state.chatFilter !== 'archive') {
    const next = filteredChats().find((chat) => chat.id !== updated.id);
    state.activeChatId = next?.id || updated.id;
    if (next) await loadActiveMessages();
  }
  setToast(updated.isArchivedByMe ? 'Чат перемещен в архив' : updated.isPinnedByMe ? 'Чат закреплен' : 'Чат обновлен');
  render();
}

async function searchUsers(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  state.userSearch = String(form.get('query') || '').trim();
  if (!state.userSearch) {
    state.userResults = [];
    render();
    return;
  }
  state.userResults = await request(`/api/users/search?q=${encodeURIComponent(state.userSearch)}`);
  if (!state.userResults.length) setToast('Пользователи не найдены');
  render();
}

async function addContact(userId) {
  const contact = await request('/api/contacts', {
    method: 'POST',
    body: { userId }
  });
  if (!state.contacts.some((item) => item.userId === contact.userId)) state.contacts.unshift(contact);
  setToast(`Контакт добавлен: ${userName(contact.user)}`);
  render();
}

async function loadSessions() {
  try {
    state.sessions = await request('/api/sessions');
  } catch (error) {
    setToast(error.message);
  }
}

async function revokeSession(sessionId) {
  await request(`/api/sessions/${sessionId}`, { method: 'DELETE' });
  state.sessions = state.sessions.map((session) => session.id === sessionId ? { ...session, revokedAt: new Date().toISOString() } : session);
  setToast('Сессия отозвана');
  render();
}

async function openDirect(userId) {
  const chat = await request('/api/chats', {
    method: 'POST',
    body: { type: 'direct', memberIds: [userId] }
  });
  if (!state.chats.some((item) => item.id === chat.id)) state.chats.unshift(chat);
  state.activeChatId = chat.id;
  state.view = 'chats';
  await loadActiveMessages();
  render();
}

/* ============================================================
   Message context menu (right click / long press / "⋯" button).
   ============================================================ */

const menuRoot = document.createElement('div');
menuRoot.id = 'menuRoot';
document.body.appendChild(menuRoot);
let pendingPasteFile = null;

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '😢'];

function closeMessageMenu() {
  menuRoot.innerHTML = '';
}

function openMessageMenu(messageId, x, y) {
  const chat = activeChat();
  const message = findChatMessage(state.activeChatId, messageId);
  if (!chat || !message) return;
  const own = message.authorId === state.me.id;
  const isAdmin = chat.ownerId === state.me.id || (chat.admins || []).includes(state.me.id);
  const canPin = (chat.type === 'direct' || chat.type === 'saved') ? true : (isAdmin || own);
  const items = [
    { action: 'reply', label: 'Ответить', show: true },
    { action: 'copy', label: 'Копировать текст', show: Boolean(message.text) },
    { action: 'pin', label: message.isPinned ? 'Открепить' : 'Закрепить', show: canPin },
    { action: 'edit', label: 'Изменить', show: own && !message.deletedAt },
    { action: 'delete', label: 'Удалить', show: true, danger: true }
  ].filter((item) => item.show);
  menuRoot.innerHTML = `
    <div class="msg-menu-backdrop"></div>
    <div class="msg-menu" role="menu">
      <div class="msg-menu-reactions">
        ${QUICK_REACTIONS.map((emoji) => `<button data-menu-react="${emoji}">${emoji}</button>`).join('')}
      </div>
      ${items.map((item) => `<button class="msg-menu-item ${item.danger ? 'danger' : ''}" data-menu-action="${item.action}">${item.label}</button>`).join('')}
    </div>
  `;
  const menu = menuRoot.querySelector('.msg-menu');
  const { width, height } = menu.getBoundingClientRect();
  menu.style.left = `${Math.max(8, Math.min(x, innerWidth - width - 8))}px`;
  menu.style.top = `${Math.max(8, Math.min(y, innerHeight - height - 8))}px`;
  menuRoot.querySelector('.msg-menu-backdrop').addEventListener('pointerdown', closeMessageMenu);
  menuRoot.querySelectorAll('[data-menu-react]').forEach((button) => button.addEventListener('click', async () => {
    closeMessageMenu();
    try {
      const updated = await request(`/api/messages/${messageId}/reactions`, { method: 'POST', body: { emoji: button.dataset.menuReact } });
      updateMessage(updated);
      render();
    } catch (error) { setToast(error.message); }
  }));
  menuRoot.querySelectorAll('[data-menu-action]').forEach((button) => button.addEventListener('click', async () => {
    const action = button.dataset.menuAction;
    closeMessageMenu();
    try {
      if (action === 'reply') { state.replyTo = messageId; render(); document.querySelector('#composerInput')?.focus(); }
      if (action === 'copy') { await navigator.clipboard.writeText(message.text || ''); setToast('Текст скопирован'); }
      if (action === 'pin') {
        const updated = await request(`/api/messages/${messageId}/pin`, { method: 'POST', body: {} });
        updateMessage(updated);
        await refreshChats();
        render();
      }
      if (action === 'edit') { openModal({ kind: 'edit-message', messageId, text: message.text || '' }); }
      if (action === 'delete') { openDeleteDialog(messageId, chat, own); }
    } catch (error) { setToast(error.message); }
  }));
}

// Delete dialog with scope choice: "for me" always; "for everyone" when allowed.
function openDeleteDialog(messageId, chat, own) {
  const canEveryone = (chat.type === 'direct' || chat.type === 'saved') || own || chat.ownerId === state.me.id || (chat.admins || []).includes(state.me.id);
  const doDelete = async (scope) => {
    try {
      await request(`/api/messages/${messageId}?scope=${scope}`, { method: 'DELETE' });
      // The WS message:deleted event animates and removes it — no reload here.
    } catch (error) { setToast(error.message); }
  };
  const body = `<p class="modal-text">Удалить это сообщение?</p>`;
  const footer = `
    <button class="secondary-button" type="button" data-modal-close>Отмена</button>
    <button class="secondary-button" type="button" id="delSelf">Удалить у себя</button>
    ${canEveryone ? '<button class="secondary-button danger" type="button" id="delAll">Удалить у всех</button>' : ''}
  `;
  openModal({ kind: 'confirm-delete' });
  modalRoot.innerHTML = modalShell('Удаление сообщения', body, footer);
  bindModalEvents();
  modalRoot.querySelector('#delSelf')?.addEventListener('click', () => { closeModal(); doDelete('self'); });
  modalRoot.querySelector('#delAll')?.addEventListener('click', () => { closeModal(); doDelete('everyone'); });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMessageMenu();
});

// "+" menu in the chats sidebar: create/join actions in one place.
function openCreateMenu(x, y) {
  const items = [
    { icon: icons.group, label: 'Создать группу', run: () => createGroup() },
    { icon: icons.channel, label: 'Создать канал', run: () => createChannel() },
    { icon: icons.link, label: 'Присоединиться по ссылке', run: () => openModal({ kind: 'join-link', link: '', error: '' }) }
  ];
  menuRoot.innerHTML = `
    <div class="msg-menu-backdrop"></div>
    <div class="msg-menu" role="menu">
      ${items.map((item, index) => `<button class="msg-menu-item with-icon" data-create-index="${index}">${item.icon}<span>${item.label}</span></button>`).join('')}
    </div>
  `;
  const menu = menuRoot.querySelector('.msg-menu');
  const { width, height } = menu.getBoundingClientRect();
  menu.style.left = `${Math.max(8, Math.min(x, innerWidth - width - 8))}px`;
  menu.style.top = `${Math.max(8, Math.min(y, innerHeight - height - 8))}px`;
  menuRoot.querySelector('.msg-menu-backdrop').addEventListener('pointerdown', closeMessageMenu);
  menuRoot.querySelectorAll('[data-create-index]').forEach((button) => button.addEventListener('click', () => {
    const item = items[Number(button.dataset.createIndex)];
    closeMessageMenu();
    item.run();
  }));
}

// Context menu for a chat in the list (right click / long press), Telegram-style.
function openChatMenu(chatId, x, y) {
  const chat = state.chats.find((item) => item.id === chatId);
  if (!chat) return;
  const muted = (chat.mutedBy || []).includes(state.me.id);
  const isOwner = chat.ownerId === state.me.id;
  const isSaved = chat.type === 'saved';
  const isDirect = chat.type === 'direct';
  const leavable = (chat.type === 'group' || chat.type === 'channel') && !isOwner;
  const deletable = (chat.type === 'group' || chat.type === 'channel') && isOwner;
  const contact = isDirect ? state.contacts.find((c) => c.userId === chat.members.find((m) => m !== state.me.id)) : null;
  const blocked = Boolean(contact?.blocked);
  const items = [
    { label: chat.isPinnedByMe ? 'Открепить' : 'Закрепить', show: !isSaved, run: () => updateChatState(chatId, { pinned: !chat.isPinnedByMe }) },
    { label: chat.isArchivedByMe ? 'Вернуть из архива' : 'Архивировать', show: !isSaved, run: () => updateChatState(chatId, { archived: !chat.isArchivedByMe }) },
    { label: muted ? 'Включить уведомления' : 'Выключить уведомления', show: !isSaved, run: async () => {
      const updated = await request(`/api/chats/${chatId}/state`, { method: 'PATCH', body: { muted: !muted } });
      state.chats = state.chats.map((item) => item.id === updated.id ? updated : item);
      render();
    } },
    { label: 'Прочитать', show: Boolean(chat.unread), run: async () => {
      await request(`/api/chats/${chatId}/read`, { method: 'POST', body: {} });
      const target = state.chats.find((item) => item.id === chatId);
      if (target) target.unread = 0;
      render();
    } },
    { label: 'Пометить непрочитанным', show: !chat.unread, run: async () => {
      const updated = await request(`/api/chats/${chatId}/unread`, { method: 'POST', body: {} });
      state.chats = state.chats.map((item) => item.id === updated.id ? updated : item);
      render();
    } },
    { label: 'Добавить в папку', run: (x, y) => openFolderMenu(chatId, x, y) },
    { label: 'Очистить историю', danger: true, run: () => {
      confirmAction({
        title: 'Очистить историю',
        message: 'Все сообщения этого чата будут скрыты у вас. У собеседника они останутся.',
        confirmLabel: 'Очистить',
        danger: true,
        onConfirm: async () => {
          try {
            await request(`/api/chats/${chatId}/clear`, { method: 'POST', body: {} });
            state.messages[chatId] = [];
            const target = state.chats.find((item) => item.id === chatId);
            if (target) target.lastMessage = null;
            render();
          } catch (error) { setToast(error.message); }
        }
      });
    } },
    { label: blocked ? 'Разблокировать' : 'Заблокировать', show: isDirect && Boolean(contact), danger: !blocked, run: async () => {
      const updated = await request(`/api/contacts/${contact.userId}`, { method: 'PATCH', body: { blocked: !blocked } });
      state.contacts = state.contacts.map((item) => item.userId === updated.userId ? updated : item);
      setToast(blocked ? 'Разблокирован' : 'Заблокирован');
    } },
    { label: chat.type === 'channel' ? 'Покинуть канал' : 'Покинуть группу', show: leavable, danger: true, run: async () => {
      await request(`/api/chats/${chatId}/leave`, { method: 'POST', body: {} });
      removeChatLocally(chatId);
    } },
    { label: chat.type === 'channel' ? 'Удалить канал' : 'Удалить группу', show: deletable, danger: true, run: () => {
      confirmAction({
        title: `Удалить ${chat.type === 'channel' ? 'канал' : 'группу'}`,
        message: `«${chat.title}» и вся история будут удалены у всех участников.`,
        confirmLabel: 'Удалить',
        danger: true,
        onConfirm: async () => {
          try {
            await request(`/api/chats/${chatId}`, { method: 'DELETE' });
            removeChatLocally(chatId);
          } catch (error) { setToast(error.message); }
        }
      });
    } }
  ].filter((item) => item.show !== false);
  menuRoot.innerHTML = `
    <div class="msg-menu-backdrop"></div>
    <div class="msg-menu" role="menu">
      ${items.map((item, index) => `<button class="msg-menu-item ${item.danger ? 'danger' : ''}" data-chat-menu-index="${index}">${item.label}</button>`).join('')}
    </div>
  `;
  const menu = menuRoot.querySelector('.msg-menu');
  const { width, height } = menu.getBoundingClientRect();
  menu.style.left = `${Math.max(8, Math.min(x, innerWidth - width - 8))}px`;
  menu.style.top = `${Math.max(8, Math.min(y, innerHeight - height - 8))}px`;
  menuRoot.querySelector('.msg-menu-backdrop').addEventListener('pointerdown', closeMessageMenu);
  menuRoot.querySelectorAll('[data-chat-menu-index]').forEach((button) => button.addEventListener('click', async () => {
    const item = items[Number(button.dataset.chatMenuIndex)];
    const rect = button.getBoundingClientRect();
    closeMessageMenu();
    try { await item.run(rect.right, rect.top); } catch (error) { setToast(error.message); }
  }));
}

// Submenu for moving a chat into a folder.
function openFolderMenu(chatId, x, y) {
  const known = [...new Set(state.chats.map((chat) => chat.folder).filter(Boolean))];
  const chat = state.chats.find((item) => item.id === chatId);
  const setFolder = async (folder) => {
    const updated = await request(`/api/chats/${chatId}/state`, { method: 'PATCH', body: { folder } });
    state.chats = state.chats.map((item) => item.id === updated.id ? updated : item);
    render();
  };
  const items = [
    ...known.map((name) => ({ label: name, run: () => setFolder(chat?.folder === name ? '' : name), active: chat?.folder === name })),
    { label: '+ Новая папка', run: () => {
      const name = prompt('Название папки');
      if (name && name.trim()) setFolder(name.trim());
    } }
  ];
  if (chat?.folder) items.unshift({ label: `Убрать из «${chat.folder}»`, run: () => setFolder(''), danger: true });
  menuRoot.innerHTML = `
    <div class="msg-menu-backdrop"></div>
    <div class="msg-menu" role="menu">
      ${items.map((item, index) => `<button class="msg-menu-item ${item.danger ? 'danger' : ''} ${item.active ? 'active' : ''}" data-folder-index="${index}">${escapeHtml(item.label)}</button>`).join('')}
    </div>
  `;
  const menu = menuRoot.querySelector('.msg-menu');
  const rect = menu.getBoundingClientRect();
  menu.style.left = `${Math.max(8, Math.min(x, innerWidth - rect.width - 8))}px`;
  menu.style.top = `${Math.max(8, Math.min(y, innerHeight - rect.height - 8))}px`;
  menuRoot.querySelector('.msg-menu-backdrop').addEventListener('pointerdown', closeMessageMenu);
  menuRoot.querySelectorAll('[data-folder-index]').forEach((button) => button.addEventListener('click', async () => {
    const item = items[Number(button.dataset.folderIndex)];
    closeMessageMenu();
    try { await item.run(); } catch (error) { setToast(error.message); }
  }));
}

async function handleCreateAction(kind) {
  if (kind !== 'saved') return;
  try {
    const chat = await request('/api/chats', { method: 'POST', body: { type: 'saved' } });
    if (!state.chats.some((item) => item.id === chat.id)) state.chats.unshift(chat);
    state.activeChatId = chat.id;
    state.view = 'chats';
    state.sidebarOpen = false;
    await loadActiveMessages();
    render();
  } catch (error) {
    setToast(error.message);
  }
}

/* ============================================================
   Modal layer. Lives in its own #modalRoot so it survives the
   main app re-render and keeps input focus while typing.
   ============================================================ */

const modalRoot = document.createElement('div');
modalRoot.id = 'modalRoot';
document.body.appendChild(modalRoot);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.modal) closeModal();
});

let pendingConfirm = null;

function openModal(modal) {
  state.modal = modal;
  renderModal();
}

function closeModal() {
  state.modal = null;
  pendingConfirm = null;
  renderModal();
}

function modalShell(title, bodyHtml, footerHtml) {
  return `
    <div class="modal-overlay" data-modal-overlay>
      <div class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <header class="modal-head">
          <h2>${escapeHtml(title)}</h2>
          <button class="icon-button" type="button" data-modal-close title="Закрыть">${icons.close}</button>
        </header>
        <div class="modal-body">${bodyHtml}</div>
        ${footerHtml ? `<footer class="modal-foot">${footerHtml}</footer>` : ''}
      </div>
    </div>
  `;
}

function renderModal() {
  const modal = state.modal;
  if (!modal) {
    modalRoot.innerHTML = '';
    return;
  }

  if (modal.kind === 'find-user') {
    const results = modal.results || [];
    const body = `
      <form id="modalSearchForm" class="modal-search">
        <input id="modalSearchInput" value="${escapeHtml(modal.query || '')}" placeholder="email, телефон, никнейм или имя" autocomplete="off" />
        <button class="primary-button" type="submit">Найти</button>
      </form>
      <div class="modal-list">
        ${modal.searched && !results.length ? '<div class="empty-state">Никого не нашли. Попробуйте другой запрос.</div>' : ''}
        ${results.map((user) => `
          <article class="modal-row">
            <img src="${escapeHtml(user.avatar)}" alt="" />
            <div class="modal-row-meta">
              <strong>${escapeHtml(userName(user))}</strong>
              <span>@${escapeHtml(user.nickname || '')}</span>
            </div>
            <div class="modal-row-actions">
              <button class="secondary-button" data-action="add-contact" data-user-id="${escapeHtml(user.id)}">В контакты</button>
              <button class="primary-button" data-action="open-direct" data-user-id="${escapeHtml(user.id)}">Написать</button>
            </div>
          </article>
        `).join('')}
      </div>
    `;
    modalRoot.innerHTML = modalShell('Найти пользователя', body, '');
  }

  if (modal.kind === 'new-group') {
    const isChannel = modal.chatType === 'channel';
    const contacts = state.contacts.filter((contact) => !contact.blocked);
    const body = `
      <label class="modal-field">Название ${isChannel ? 'канала' : 'группы'}
        <input id="groupTitle" value="${escapeHtml(modal.title || '')}" placeholder="${isChannel ? 'Например, Новости проекта' : 'Например, Команда проекта'}" autocomplete="off" />
      </label>
      <label class="modal-field">Описание (необязательно)
        <input id="groupDescription" value="${escapeHtml(modal.description || '')}" placeholder="${isChannel ? 'О чём канал' : 'О чём группа'}" autocomplete="off" />
      </label>
      <div class="modal-field">
        <span class="modal-field-label">${isChannel ? 'Подписчики (можно добавить позже)' : 'Участники'}</span>
        <div class="modal-list modal-checklist">
          ${contacts.length ? contacts.map((contact) => `
            <label class="modal-check">
              <input type="checkbox" name="member" value="${escapeHtml(contact.userId)}" />
              <img src="${escapeHtml(contact.user?.avatar)}" alt="" />
              <span class="modal-row-meta">
                <strong>${escapeHtml(userName(contact.user))}</strong>
                <span>@${escapeHtml(contact.user?.nickname || '')}</span>
              </span>
            </label>
          `).join('') : `<div class="empty-state">Сначала добавьте контакты, чтобы пригласить их${isChannel ? ' в канал' : ''}.</div>`}
        </div>
      </div>
      ${isChannel ? '<p class="modal-text" style="font-size:0.85rem">В канале публиковать сообщения могут только администраторы. Подписчики видят ленту публикаций.</p>' : ''}
      ${modal.error ? `<div class="form-error">${escapeHtml(modal.error)}</div>` : ''}
    `;
    const footer = `
      <button class="secondary-button" type="button" data-modal-close>Отмена</button>
      <button class="primary-button" type="button" id="groupCreate">Создать ${isChannel ? 'канал' : 'группу'}</button>
    `;
    modalRoot.innerHTML = modalShell(isChannel ? 'Новый канал' : 'Новая группа', body, footer);
  }

  if (modal.kind === 'confirm') {
    const body = `<p class="modal-text">${escapeHtml(modal.message)}</p>`;
    const footer = `
      ${modal.single ? '' : '<button class="secondary-button" type="button" data-modal-close>Отмена</button>'}
      <button class="${modal.danger ? 'secondary-button danger' : 'primary-button'}" type="button" id="modalConfirm">${escapeHtml(modal.confirmLabel || 'Подтвердить')}</button>
    `;
    modalRoot.innerHTML = modalShell(modal.title, body, footer);
  }

  if (modal.kind === 'join-link') {
    const body = `
      <label class="modal-field">Ссылка-приглашение
        <input id="joinLinkInput" value="${escapeHtml(modal.link || '')}" placeholder="https://twiftyz.local/invite/…" autocomplete="off" />
      </label>
      ${modal.error ? `<div class="form-error">${escapeHtml(modal.error)}</div>` : ''}
    `;
    const footer = `
      <button class="secondary-button" type="button" data-modal-close>Отмена</button>
      <button class="primary-button" type="button" id="joinLinkSubmit">Присоединиться</button>
    `;
    modalRoot.innerHTML = modalShell('Присоединиться по ссылке', body, footer);
  }

  if (modal.kind === 'profile') {
    const me = state.me || {};
    if (!modal.edit) {
      // View mode first (like Telegram); editing is a separate step.
      const viewBody = `
        <div class="user-profile-card">
          <img class="user-profile-avatar" src="${escapeHtml(me.avatar || '')}" alt="" />
          <h3>${escapeHtml(userName(me))}</h3>
          <p class="user-profile-nick">@${escapeHtml(me.nickname || '')}</p>
          ${me.bio ? `<p class="user-profile-bio">${escapeHtml(me.bio)}</p>` : ''}
          <div class="profile-info-rows">
            ${me.phone ? `<div class="profile-info-row"><span>Телефон</span><strong>${escapeHtml(me.phone)}</strong></div>` : ''}
            ${me.email ? `<div class="profile-info-row"><span>Email</span><strong>${escapeHtml(me.email)}</strong></div>` : ''}
            ${me.birthDate ? `<div class="profile-info-row"><span>День рождения</span><strong>${escapeHtml(me.birthDate)}</strong></div>` : ''}
            ${me.personalChannel ? `<div class="profile-info-row"><span>Личный канал</span><strong>${escapeHtml(me.personalChannel)}</strong></div>` : ''}
          </div>
        </div>
      `;
      const viewFooter = `
        <button class="secondary-button" type="button" data-action="open-settings-view">${icons.settings}<span>Настройки</span></button>
        <button class="secondary-button danger" type="button" data-action="logout">Выйти</button>
        <button class="primary-button" type="button" id="profileEditBtn">Редактировать</button>
      `;
      modalRoot.innerHTML = modalShell('Профиль', viewBody, viewFooter);
      bindModalEvents();
      modalRoot.querySelector('#profileEditBtn')?.addEventListener('click', () => {
        state.modal = { kind: 'profile', edit: true, error: '' };
        renderModal();
      });
      return;
    }
    const body = `
      <div class="profile-avatar-edit">
        <img id="profileAvatarPreview" src="${escapeHtml(me.avatar || '')}" alt="" />
        <div>
          <button class="secondary-button" type="button" id="avatarUploadBtn">Загрузить фото</button>
          <input id="avatarFileInput" type="file" accept="image/*" class="visually-hidden" />
          <p class="modal-text" style="font-size:0.8rem;margin:6px 0 0">PNG/JPG, до 5 МБ. Или оставьте автоаватар.</p>
        </div>
      </div>
      <label class="modal-field">Имя<input id="profileFirstName" value="${escapeHtml(me.firstName || '')}" autocomplete="off" /></label>
      <label class="modal-field">Имя пользователя<input id="profileNickname" value="${escapeHtml(me.nickname || '')}" autocomplete="off" /></label>
      <label class="modal-field">Номер телефона<input id="profilePhone" type="tel" value="${escapeHtml(me.phone || '')}" placeholder="+79990000000" autocomplete="off" /></label>
      <label class="modal-field">День рождения<input id="profileBirthDate" type="date" value="${escapeHtml(me.birthDate || '')}" /></label>
      <label class="modal-field">Личный канал<input id="profileChannel" value="${escapeHtml(me.personalChannel || '')}" placeholder="Ссылка или @имя канала" autocomplete="off" /></label>
      <label class="modal-field">Описание<textarea id="profileBio" rows="3">${escapeHtml(me.bio || '')}</textarea></label>
      ${modal.error ? `<div class="form-error">${escapeHtml(modal.error)}</div>` : ''}
    `;
    const footer = `
      <button class="secondary-button" type="button" id="profileBackBtn">Назад</button>
      <button class="primary-button" type="button" id="profileSave">Сохранить</button>
    `;
    modalRoot.innerHTML = modalShell('Редактирование профиля', body, footer);
    bindModalEvents();
    modalRoot.querySelector('#profileBackBtn')?.addEventListener('click', () => {
      state.modal = { kind: 'profile', edit: false };
      renderModal();
    });
    return;
  }

  if (modal.kind === 'channel-settings') {
    const chat = state.chats.find((item) => item.id === modal.chatId);
    const members = (chat?.membersDetailed || []).filter((user) => user.id !== state.me.id);
    const body = `
      <label class="modal-field">Название канала<input id="channelTitle" value="${escapeHtml(modal.title || '')}" autocomplete="off" /></label>
      <label class="modal-field">Описание<textarea id="channelDescription" rows="2">${escapeHtml(modal.description || '')}</textarea></label>
      <label class="modal-check" style="grid-template-columns:20px 1fr">
        <input type="checkbox" id="channelPostAsUser" ${modal.postAsUser ? 'checked' : ''} />
        <span class="modal-row-meta"><strong>Разрешить писать от своего имени</strong><span>Выбранные участники смогут публиковать не от лица канала</span></span>
      </label>
      <div class="modal-field ${modal.postAsUser ? '' : 'is-hidden'}" id="allowedWrap">
        <span class="modal-field-label">Кому разрешено</span>
        <div class="modal-list modal-checklist">
          ${members.length ? members.map((user) => `
            <label class="modal-check">
              <input type="checkbox" name="allowed" value="${escapeHtml(user.id)}" ${modal.allowed.includes(user.id) ? 'checked' : ''} />
              <img src="${escapeHtml(user.avatar)}" alt="" />
              <span class="modal-row-meta"><strong>${escapeHtml(userName(user))}</strong><span>@${escapeHtml(user.nickname || '')}</span></span>
            </label>
          `).join('') : '<div class="empty-state">В канале пока нет других участников.</div>'}
        </div>
      </div>
      ${modal.error ? `<div class="form-error">${escapeHtml(modal.error)}</div>` : ''}
    `;
    const footer = `
      <button class="secondary-button" type="button" data-modal-close>Отмена</button>
      <button class="primary-button" type="button" id="channelSettingsSave">Сохранить</button>
    `;
    modalRoot.innerHTML = modalShell('Управление каналом', body, footer);
  }

  if (modal.kind === 'notify-settings') {
    const body = `
      <label class="modal-check" style="grid-template-columns:20px 1fr">
        <input type="checkbox" id="notifyMuted" ${modal.muted ? 'checked' : ''} />
        <span class="modal-row-meta"><strong>Без звука</strong><span>Отключить уведомления этого чата</span></span>
      </label>
    `;
    const footer = `
      <button class="secondary-button" type="button" data-modal-close>Отмена</button>
      <button class="primary-button" type="button" id="notifySave">Сохранить</button>
    `;
    modalRoot.innerHTML = modalShell('Настройки уведомлений', body, footer);
  }

  if (modal.kind === 'notify-global') {
    const prefs = state.settings?.notifications || {};
    const body = `
      <label class="modal-check" style="grid-template-columns:20px 1fr">
        <input type="checkbox" id="ngPush" ${prefs.push !== false ? 'checked' : ''} />
        <span class="modal-row-meta"><strong>Push-уведомления</strong><span>Всплывающее уведомление браузера, когда вкладка в фоне</span></span>
      </label>
      <label class="modal-check" style="grid-template-columns:20px 1fr">
        <input type="checkbox" id="ngSounds" ${prefs.sounds !== false ? 'checked' : ''} />
        <span class="modal-row-meta"><strong>Звуки</strong><span>Короткий звук при новом сообщении</span></span>
      </label>
    `;
    const footer = `
      <button class="secondary-button" type="button" data-modal-close>Отмена</button>
      <button class="primary-button" type="button" id="ngSave">Сохранить</button>
    `;
    modalRoot.innerHTML = modalShell('Уведомления и звуки', body, footer);
    bindModalEvents();
    modalRoot.querySelector('#ngSave')?.addEventListener('click', async () => {
      try {
        const next = {
          ...state.settings,
          notifications: {
            ...(state.settings?.notifications || {}),
            push: modalRoot.querySelector('#ngPush').checked,
            sounds: modalRoot.querySelector('#ngSounds').checked
          }
        };
        state.settings = await request('/api/settings', { method: 'PATCH', body: next });
        closeModal();
        setToast('Настройки сохранены');
      } catch (error) { setToast(error.message); }
    });
    return;
  }

  if (modal.kind === 'privacy') {
    const blocked = state.contacts.filter((contact) => contact.blocked);
    const body = `
      <div class="profile-info-rows">
        <div class="profile-info-row"><span>Почта для входа</span><strong>${escapeHtml(state.me?.email || '—')}</strong></div>
      </div>
      <div class="modal-field">
        <span class="modal-field-label">Заблокированные пользователи</span>
        <div class="modal-list modal-checklist">
          ${blocked.length ? blocked.map((contact) => `
            <div class="modal-row">
              <img src="${escapeHtml(contact.user?.avatar)}" alt="" />
              <div class="modal-row-meta"><strong>${escapeHtml(userName(contact.user))}</strong><span>@${escapeHtml(contact.user?.nickname || '')}</span></div>
              <button class="secondary-button" data-action="unblock-user" data-user-id="${escapeHtml(contact.userId)}">Разблокировать</button>
            </div>
          `).join('') : '<div class="empty-state">Никто не заблокирован</div>'}
        </div>
      </div>
      <div class="modal-field">
        <span class="modal-field-label">Активные сеансы</span>
        <div class="modal-list">
          ${(state.sessions || []).filter((session) => !session.revokedAt).map((session) => `
            <div class="modal-row">
              <div class="modal-row-meta"><strong>${escapeHtml(session.device || 'Устройство')}</strong><span>${escapeHtml(session.ip || 'local')} · ${formatDateTime(session.lastSeenAt || session.createdAt)}${session.current ? ' · это устройство' : ''}</span></div>
              ${session.current ? '' : `<button class="secondary-button danger" data-action="revoke-session" data-session-id="${escapeHtml(session.id)}">Завершить</button>`}
            </div>
          `).join('') || '<div class="empty-state">Нет активных сеансов</div>'}
        </div>
      </div>
    `;
    const footer = `
      <button class="secondary-button" type="button" id="privacyPassword" data-action="open-password-change">Сменить пароль</button>
      <button class="primary-button" type="button" data-modal-close>Готово</button>
    `;
    modalRoot.innerHTML = modalShell('Конфиденциальность', body, footer);
    bindModalEvents();
    return;
  }

  if (modal.kind === 'password-change') {
    const body = `
      <label class="modal-field">Текущий пароль<input id="pwCurrent" type="password" autocomplete="current-password" /></label>
      <label class="modal-field">Новый пароль<input id="pwNew" type="password" autocomplete="new-password" placeholder="Минимум 8 символов" /></label>
      <label class="modal-field">Повторите новый пароль<input id="pwConfirm" type="password" autocomplete="new-password" /></label>
      ${modal.error ? `<div class="form-error">${escapeHtml(modal.error)}</div>` : ''}
    `;
    const footer = `
      <button class="secondary-button" type="button" data-modal-close>Отмена</button>
      <button class="primary-button" type="button" id="pwSave">Обновить пароль</button>
    `;
    modalRoot.innerHTML = modalShell('Смена пароля', body, footer);
    bindModalEvents();
    modalRoot.querySelector('#pwSave')?.addEventListener('click', async () => {
      const currentPassword = modalRoot.querySelector('#pwCurrent').value;
      const newPassword = modalRoot.querySelector('#pwNew').value;
      const confirm = modalRoot.querySelector('#pwConfirm').value;
      if (newPassword !== confirm) {
        state.modal = { kind: 'password-change', error: 'Новые пароли не совпадают' };
        renderModal();
        return;
      }
      try {
        await request('/api/me/password', { method: 'PATCH', body: { currentPassword, newPassword } });
        await loadSessions();
        closeModal();
        setToast('Пароль обновлён, остальные сессии отозваны');
      } catch (error) {
        state.modal = { kind: 'password-change', error: error.message };
        renderModal();
      }
    });
    return;
  }

  if (modal.kind === 'user-profile') {
    const user = modal.user || {};
    const body = `
      <div class="user-profile-card">
        <img class="user-profile-avatar" src="${escapeHtml(user.avatar || '')}" alt="" />
        <h3>${escapeHtml(userName(user))}</h3>
        <p class="user-profile-nick">@${escapeHtml(user.nickname || '')} · <span class="${className(['status-chip', user.status])}">${escapeHtml(statusLabel(user.status))}</span></p>
        ${user.bio ? `<p class="user-profile-bio">${escapeHtml(user.bio)}</p>` : ''}
        <div class="profile-info-rows">
          ${user.phone ? `<div class="profile-info-row"><span>Телефон</span><strong>${escapeHtml(user.phone)}</strong></div>` : ''}
          ${user.birthDate ? `<div class="profile-info-row"><span>День рождения</span><strong>${escapeHtml(user.birthDate)}</strong></div>` : ''}
          ${user.personalChannel ? `<div class="profile-info-row"><span>Личный канал</span><strong>${escapeHtml(user.personalChannel)}</strong></div>` : ''}
        </div>
        ${user.createdAt ? `<p class="user-profile-meta">В Twiftyz с ${new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(user.createdAt))}</p>` : ''}
      </div>
    `;
    const footer = `
      <button class="icon-button" type="button" data-action="profile-call" title="Аудиозвонок">${icons.phone}</button>
      <button class="icon-button" type="button" data-action="profile-call" title="Видеозвонок">${icons.video}</button>
      ${user.isContact ? '' : `<button class="secondary-button" type="button" data-action="add-contact" data-user-id="${escapeHtml(user.id)}">В контакты</button>`}
      <button class="primary-button" type="button" data-action="open-direct" data-user-id="${escapeHtml(user.id)}">Написать</button>
    `;
    modalRoot.innerHTML = modalShell('Профиль', body, footer);
    bindModalEvents();
    return;
  }

  if (modal.kind === 'paste-image') {
    const body = modal.blobUrl ? `
      <div class="lightbox-body">
        <img src="${escapeHtml(modal.blobUrl)}" alt="" />
      </div>
      <p class="modal-text">Отправить изображение из буфера обмена в этот чат?</p>
    ` : `
      <div class="attachment" style="margin:0">
        <span>${icons.paperclip}</span>
        <strong>${escapeHtml(modal.fileName || 'Файл')}</strong>
        <em>${formatSize(modal.fileSize)}</em>
      </div>
      <p class="modal-text">Отправить файл из буфера обмена в этот чат?</p>
    `;
    const footer = `
      <button class="secondary-button" type="button" data-modal-close>Отмена</button>
      <button class="primary-button" type="button" id="pasteSend">Отправить</button>
    `;
    modalRoot.innerHTML = modalShell(modal.blobUrl ? 'Вставка изображения' : 'Вставка файла', body, footer);
    bindModalEvents();
    modalRoot.querySelector('#pasteSend')?.addEventListener('click', async () => {
      const file = pendingPasteFile;
      closeModal();
      if (!file) return;
      try {
        const body = new FormData();
        body.append('chatId', state.activeChatId);
        body.append('file', file);
        state.uploadProgress = { name: file.name, percent: 0 };
        render();
        const uploaded = await uploadWithProgress(body, setUploadProgress);
        state.uploadProgress = null;
        await sendFileMessage(uploaded, { text: '' });
      } catch (error) {
        state.uploadProgress = null;
        setToast(error.message);
        render();
      } finally {
        pendingPasteFile = null;
      }
    });
    return;
  }

  if (modal.kind === 'lightbox') {
    const cached = state.imageBlobs[modal.fileId] || '';
    modalRoot.innerHTML = `
      <div class="modal-overlay" data-modal-overlay>
        <div class="modal modal-lightbox" role="dialog" aria-modal="true" aria-label="${escapeHtml(modal.name || 'Изображение')}">
          <header class="modal-head">
            <h2>${escapeHtml(modal.name || 'Изображение')}</h2>
            <button class="icon-button" type="button" data-modal-close title="Закрыть">${icons.close}</button>
          </header>
          <div class="lightbox-body">
            <img data-img-file="${escapeHtml(modal.fileId)}" ${cached ? `src="${cached}"` : ''} alt="${escapeHtml(modal.name || '')}" />
          </div>
          <footer class="modal-foot">
            <button class="secondary-button" type="button" data-action="download-file" data-file-id="${escapeHtml(modal.fileId)}" data-file-name="${escapeHtml(modal.name || '')}">Скачать</button>
          </footer>
        </div>
      </div>
    `;
    bindModalEvents();
    ensureInlineMedia();
    return;
  }

  if (modal.kind === 'edit-message') {
    const body = `
      <label class="modal-field">Текст сообщения
        <textarea id="editMessageText" rows="4">${escapeHtml(modal.text || '')}</textarea>
      </label>
      ${modal.error ? `<div class="form-error">${escapeHtml(modal.error)}</div>` : ''}
    `;
    const footer = `
      <button class="secondary-button" type="button" data-modal-close>Отмена</button>
      <button class="primary-button" type="button" id="editMessageSave">Сохранить</button>
    `;
    modalRoot.innerHTML = modalShell('Изменить сообщение', body, footer);
  }

  bindModalEvents();
}

function bindModalEvents() {
  modalRoot.querySelector('[data-modal-overlay]')?.addEventListener('mousedown', (event) => {
    if (event.target === event.currentTarget) closeModal();
  });
  modalRoot.querySelectorAll('[data-modal-close]').forEach((button) => {
    button.addEventListener('click', closeModal);
  });
  modalRoot.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', handleAction);
  });

  modalRoot.querySelector('#modalSearchForm')?.addEventListener('submit', runModalUserSearch);
  modalRoot.querySelector('#modalSearchInput')?.focus();
  modalRoot.querySelector('#groupTitle')?.focus();
  modalRoot.querySelector('#groupCreate')?.addEventListener('click', submitNewGroup);
  modalRoot.querySelector('#editMessageText')?.focus();
  modalRoot.querySelector('#editMessageSave')?.addEventListener('click', submitEditMessage);
  modalRoot.querySelector('#joinLinkInput')?.focus();
  modalRoot.querySelector('#joinLinkSubmit')?.addEventListener('click', submitJoinByLink);
  modalRoot.querySelector('#avatarUploadBtn')?.addEventListener('click', () => modalRoot.querySelector('#avatarFileInput')?.click());
  modalRoot.querySelector('#avatarFileInput')?.addEventListener('change', uploadAvatar);
  modalRoot.querySelector('#profileSave')?.addEventListener('click', submitProfile);
  modalRoot.querySelector('#channelPostAsUser')?.addEventListener('change', (event) => {
    modalRoot.querySelector('#allowedWrap')?.classList.toggle('is-hidden', !event.target.checked);
  });
  modalRoot.querySelector('#channelSettingsSave')?.addEventListener('click', submitChannelSettings);
  modalRoot.querySelector('#notifySave')?.addEventListener('click', submitNotifySettings);
  modalRoot.querySelector('#modalConfirm')?.addEventListener('click', async () => {
    const fn = pendingConfirm;
    closeModal();
    if (fn) await fn();
  });
}

function confirmAction({ title, message, confirmLabel, danger, onConfirm }) {
  pendingConfirm = onConfirm;
  openModal({ kind: 'confirm', title, message, confirmLabel, danger: Boolean(danger) });
}

function infoModal(title, message, confirmLabel = 'Понятно') {
  pendingConfirm = null;
  openModal({ kind: 'confirm', title, message, confirmLabel, single: true });
}

async function runModalUserSearch(event) {
  event.preventDefault();
  const query = modalRoot.querySelector('#modalSearchInput')?.value.trim() || '';
  if (!query) return;
  try {
    const users = await request(`/api/users/search?q=${encodeURIComponent(query)}`);
    state.modal = { kind: 'find-user', query, results: users, searched: true };
    renderModal();
  } catch (error) {
    setToast(error.message);
  }
}

async function submitNewGroup() {
  const chatType = state.modal?.chatType === 'channel' ? 'channel' : 'group';
  const isChannel = chatType === 'channel';
  const title = modalRoot.querySelector('#groupTitle')?.value.trim() || '';
  const description = modalRoot.querySelector('#groupDescription')?.value.trim() || '';
  const memberIds = Array.from(modalRoot.querySelectorAll('input[name="member"]:checked')).map((input) => input.value);
  if (!title) {
    state.modal = { kind: 'new-group', chatType, title, description, error: `Введите название ${isChannel ? 'канала' : 'группы'}` };
    renderModal();
    return;
  }
  try {
    const chat = await request('/api/chats', {
      method: 'POST',
      body: isChannel
        ? { type: 'channel', title, description: description || 'Новый канал', memberIds, isPublic: true, commentsEnabled: true }
        : { type: 'group', title, description: description || 'Новая группа', memberIds, autoModeration: true, welcomeMessage: 'Добро пожаловать' }
    });
    closeModal();
    if (!state.chats.some((item) => item.id === chat.id)) state.chats.unshift(chat);
    state.activeChatId = chat.id;
    state.view = 'chats';
    state.sidebarOpen = false;
    await loadActiveMessages();
    render();
    setToast(`${isChannel ? 'Канал' : 'Группа'} «${title}» создан${isChannel ? '' : 'а'}`);
  } catch (error) {
    state.modal = { kind: 'new-group', chatType, title, description, error: error.message };
    renderModal();
  }
}

async function submitEditMessage() {
  const text = modalRoot.querySelector('#editMessageText')?.value.trim() || '';
  const messageId = state.modal?.messageId;
  if (!text) {
    state.modal = { ...state.modal, error: 'Сообщение не может быть пустым' };
    renderModal();
    return;
  }
  try {
    const updated = await request(`/api/messages/${messageId}`, { method: 'PATCH', body: { text } });
    updateMessage(updated);
    closeModal();
    render();
  } catch (error) {
    state.modal = { ...state.modal, error: error.message };
    renderModal();
  }
}

async function submitJoinByLink() {
  const link = modalRoot.querySelector('#joinLinkInput')?.value.trim() || '';
  if (!link) {
    state.modal = { kind: 'join-link', link, error: 'Вставьте ссылку-приглашение' };
    renderModal();
    return;
  }
  try {
    const chat = await request('/api/chats/join', { method: 'POST', body: { link } });
    closeModal();
    if (!state.chats.some((item) => item.id === chat.id)) state.chats.unshift(chat);
    state.activeChatId = chat.id;
    state.view = 'chats';
    state.sidebarOpen = false;
    await loadActiveMessages();
    render();
    setToast(`Вы присоединились: ${chat.title}`);
  } catch (error) {
    state.modal = { kind: 'join-link', link, error: error.message };
    renderModal();
  }
}

async function uploadAvatar(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const form = new FormData();
    form.append('file', file);
    const result = await request('/api/me/avatar', { method: 'POST', body: form });
    state.me = result.user;
    const preview = modalRoot.querySelector('#profileAvatarPreview');
    if (preview) preview.src = result.user.avatar;
    setToast('Аватар обновлён');
    render();
  } catch (error) {
    state.modal = { kind: 'profile', error: error.message };
    renderModal();
  } finally {
    event.target.value = '';
  }
}

async function submitProfile() {
  const firstName = modalRoot.querySelector('#profileFirstName')?.value.trim() || '';
  const nickname = modalRoot.querySelector('#profileNickname')?.value.trim() || '';
  const phone = modalRoot.querySelector('#profilePhone')?.value.trim() || '';
  const birthDate = modalRoot.querySelector('#profileBirthDate')?.value || '';
  const personalChannel = modalRoot.querySelector('#profileChannel')?.value.trim() || '';
  const bio = modalRoot.querySelector('#profileBio')?.value.trim() || '';
  try {
    const body = { firstName, nickname, bio, birthDate, personalChannel };
    if (phone) body.phone = phone;
    const result = await request('/api/me', { method: 'PATCH', body });
    state.me = result.user;
    state.modal = { kind: 'profile', edit: false };
    renderModal();
    render();
    setToast('Профиль обновлён');
  } catch (error) {
    state.modal = { kind: 'profile', edit: true, error: error.message };
    renderModal();
  }
}

async function submitChannelSettings() {
  const chatId = state.modal?.chatId;
  const title = modalRoot.querySelector('#channelTitle')?.value.trim() || '';
  const description = modalRoot.querySelector('#channelDescription')?.value.trim() || '';
  const postAsUser = modalRoot.querySelector('#channelPostAsUser')?.checked || false;
  const allowed = Array.from(modalRoot.querySelectorAll('input[name="allowed"]:checked')).map((input) => input.value);
  try {
    const chat = await request(`/api/chats/${chatId}/settings`, { method: 'PATCH', body: { title, description, postAsUser, postAsUserAllowed: allowed } });
    state.chats = state.chats.map((item) => item.id === chat.id ? chat : item);
    closeModal();
    render();
    setToast('Настройки канала сохранены');
  } catch (error) {
    state.modal = { ...state.modal, error: error.message };
    renderModal();
  }
}

async function submitNotifySettings() {
  const chatId = state.modal?.chatId;
  const muted = modalRoot.querySelector('#notifyMuted')?.checked || false;
  try {
    const chat = await request(`/api/chats/${chatId}/state`, { method: 'PATCH', body: { muted } });
    state.chats = state.chats.map((item) => item.id === chat.id ? chat : item);
    closeModal();
    setToast(muted ? 'Уведомления отключены' : 'Уведомления включены');
  } catch (error) {
    setToast(error.message);
  }
}

function findAndAddUser() {
  openModal({ kind: 'find-user', query: '', results: [], searched: false });
}

function createGroup() {
  openModal({ kind: 'new-group', chatType: 'group', title: '', description: '', error: '' });
}

function createChannel() {
  openModal({ kind: 'new-group', chatType: 'channel', title: '', description: '', error: '' });
}

// PWA: enables "Add to Home Screen" as a standalone app.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

boot();
