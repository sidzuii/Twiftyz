const http = require('http');
const https = require('https');
const tls = require('tls');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 5174);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const STORE_FILE = path.join(DATA_DIR, 'store.json');
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const PASSWORD_MIN_LENGTH = 8;
const DEMO_PASSWORD = 'demo12345';
const SERVICE_USER_ID = 'usr_twiftyz_service';
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

// Email delivery — zero-dependency. Two transports:
//   - 'smtp'  : your own domain mailbox over implicit TLS (e.g. reg.ru / ISPmanager, port 465)
//   - 'brevo' : Brevo transactional HTTP API
// Provider is auto-selected from env (SMTP_HOST wins), or forced via EMAIL_PROVIDER.
// When nothing is configured the server runs in dev mode and returns the code in
// the API response (devCode) instead of sending a real email.
const EMAIL = {
  provider: process.env.EMAIL_PROVIDER || (process.env.SMTP_HOST ? 'smtp' : (process.env.BREVO_API_KEY ? 'brevo' : '')),
  brevoKey: process.env.BREVO_API_KEY || '',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 465),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  },
  fromEmail: process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@twiftyz.local',
  fromName: process.env.MAIL_FROM_NAME || 'Twiftyz Messenger',
  get enabled() {
    if (this.provider === 'smtp') return Boolean(this.smtp.host && this.smtp.user && this.smtp.pass);
    if (this.provider === 'brevo') return Boolean(this.brevoKey);
    return false;
  }
};
const OTP_COOLDOWN_MS = 45_000;
const OTP_MAX_ATTEMPTS = 5;

const AVATAR_COLORS = ['#0d9488', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2', '#dc2626', '#4f46e5', '#c026d3'];
// Legacy placeholder files (removed from /assets) — treated as "no real avatar" so
// the startup migration replaces them with letter avatars.
const DEFAULT_AVATARS = [
  '/assets/avatar-default.png', '/assets/avatar-group.png', '/assets/avatar-channel.png',
  '/assets/avatar-anna.png', '/assets/avatar-ilya.png', '/assets/avatar-marat.png', '/assets/avatar-lena.png', ''
];
const LOGO_PNG = '/assets/logo/twiftyz-mark-2a.png';

// Letter avatar packs: /assets/avatars/<ru|eng>/<color folder>/<letter file>.png
const RU_AVATAR_FILES = {
  'а': '01_a', 'б': '02_b', 'в': '03_v', 'г': '04_g', 'д': '05_d', 'е': '06_e', 'ё': '06_e',
  'ж': '07_zh', 'з': '08_z', 'и': '09_i', 'й': '10_iy', 'к': '11_k', 'л': '12_l', 'м': '13_m',
  'н': '14_n', 'о': '15_o', 'п': '16_p', 'р': '17_r', 'с': '18_s', 'т': '19_t', 'у': '20_u',
  'ф': '21_f', 'х': '22_h', 'ц': '23_ts', 'ч': '24_ch', 'ш': '25_sh', 'щ': '26_sch',
  'ъ': '27_hard', 'ы': '28_y', 'ь': '29_soft', 'э': '30_ee', 'ю': '31_yu', 'я': '32_ya'
};
const RU_AVATAR_COLORS = ['png_darkblue', 'png_greeny', 'png_pink', 'png_purp'];
const EN_AVATAR_COLORS = ['png_blue', 'png_pink', 'png_purp', 'png_teal'];

// Letter avatar by the first letter of the name; the color is picked by hashing
// the seed (user/chat id), so it is random per account but stable across restarts.
function generateAvatar(seed, name) {
  let hash = 0;
  for (const ch of String(seed || 'x')) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const letter = (String(name || '').trim()[0] || '').toLowerCase();
  if (RU_AVATAR_FILES[letter]) {
    const color = RU_AVATAR_COLORS[hash % RU_AVATAR_COLORS.length];
    return `/assets/avatars/ru/${color}/${RU_AVATAR_FILES[letter]}.png`;
  }
  if (/^[a-z]$/.test(letter)) {
    const color = EN_AVATAR_COLORS[hash % EN_AVATAR_COLORS.length];
    return `/assets/avatars/eng/${color}/${letter.toUpperCase()}.png`;
  }
  // Digits and symbols have no letter file — draw an SVG initial as a fallback.
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  const initial = (String(name || '').trim()[0] || '?').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="20" fill="${color}"/><text x="40" y="52" font-family="Segoe UI,Arial,sans-serif" font-size="36" font-weight="700" fill="#ffffff" text-anchor="middle">${initial}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}

function isGeneratedOrDefaultAvatar(avatar) {
  const value = String(avatar || '');
  return DEFAULT_AVATARS.includes(value)
    || value.startsWith('data:image/svg+xml')
    || value.startsWith('/assets/avatars/');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.ico': 'image/x-icon',
  '.gif': 'image/gif',
  '.webm': 'audio/webm',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav'
};

const rateBuckets = new Map();
const wsClients = new Set();
const wsByUser = new Map();

function now() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function token() {
  return crypto.randomBytes(32).toString('base64url');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('base64url');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false;
  const [scheme, salt, hash] = storedHash.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const actual = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(hash, 'base64url');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function createSeedStore() {
  const createdAt = now();
  const users = [
    {
      id: 'usr_demo',
      email: 'demo@twiftyz.local',
      phone: '+70000000001',
      emailVerifiedAt: createdAt,
      phoneVerifiedAt: createdAt,
      passwordHash: hashPassword(DEMO_PASSWORD),
      role: 'admin',
      firstName: 'Илья',
      lastName: 'Смирнов',
      nickname: 'twiftyz',
      avatar: generateAvatar('usr_demo', 'Илья'),
      bio: 'Основатель рабочего пространства Twiftyz',
      language: 'ru',
      timezone: 'Europe/Moscow',
      status: 'online',
      birthDate: '',
      socialLinks: ['https://twiftyz.local'],
      createdAt,
      lastSeenAt: createdAt,
      privacy: {
        phone: 'contacts',
        email: 'contacts',
        lastSeen: 'contacts',
        online: 'everyone',
        avatar: 'everyone',
        contacts: 'nobody'
      },
      security: {
        twoFactorEnabled: true,
        trustedDevices: ['Windows Desktop', 'Web Browser']
      }
    },
    {
      id: 'usr_anna',
      email: 'anna@twiftyz.local',
      phone: '+70000000002',
      emailVerifiedAt: createdAt,
      phoneVerifiedAt: createdAt,
      passwordHash: hashPassword(DEMO_PASSWORD),
      role: 'user',
      firstName: 'Анна',
      lastName: 'Соколова',
      nickname: 'anna.design',
      avatar: generateAvatar('usr_anna', 'Анна'),
      bio: 'UI/UX, дизайн-системы, прототипы',
      language: 'ru',
      timezone: 'Europe/Moscow',
      status: 'online',
      birthDate: '',
      socialLinks: [],
      createdAt,
      lastSeenAt: createdAt,
      privacy: {
        phone: 'contacts',
        email: 'nobody',
        lastSeen: 'contacts',
        online: 'everyone',
        avatar: 'everyone',
        contacts: 'contacts'
      },
      security: {
        twoFactorEnabled: false,
        trustedDevices: ['iPhone']
      }
    },
    {
      id: 'usr_marat',
      email: 'marat@twiftyz.local',
      phone: '+70000000003',
      emailVerifiedAt: createdAt,
      phoneVerifiedAt: createdAt,
      passwordHash: hashPassword(DEMO_PASSWORD),
      role: 'user',
      firstName: 'Марат',
      lastName: 'Каримов',
      nickname: 'marat.ops',
      avatar: generateAvatar('usr_marat', 'Марат'),
      bio: 'Backend, инфраструктура, надежность',
      language: 'ru',
      timezone: 'Asia/Yekaterinburg',
      status: 'away',
      birthDate: '',
      socialLinks: [],
      createdAt,
      lastSeenAt: createdAt,
      privacy: {
        phone: 'contacts',
        email: 'contacts',
        lastSeen: 'everyone',
        online: 'contacts',
        avatar: 'everyone',
        contacts: 'nobody'
      },
      security: {
        twoFactorEnabled: true,
        trustedDevices: ['Linux Workstation']
      }
    },
    {
      id: 'usr_lena',
      email: 'lena@twiftyz.local',
      phone: '+70000000004',
      emailVerifiedAt: createdAt,
      phoneVerifiedAt: createdAt,
      passwordHash: hashPassword(DEMO_PASSWORD),
      role: 'user',
      firstName: 'Лена',
      lastName: 'Орлова',
      nickname: 'lena.media',
      avatar: generateAvatar('usr_lena', 'Лена'),
      bio: 'Каналы, комьюнити и контент',
      language: 'ru',
      timezone: 'Europe/Moscow',
      status: 'offline',
      birthDate: '',
      socialLinks: ['https://example.com/lena'],
      createdAt,
      lastSeenAt: createdAt,
      privacy: {
        phone: 'nobody',
        email: 'contacts',
        lastSeen: 'contacts',
        online: 'contacts',
        avatar: 'everyone',
        contacts: 'nobody'
      },
      security: {
        twoFactorEnabled: false,
        trustedDevices: []
      }
    }
  ];

  const chats = [
    {
      id: 'chat_anna',
      type: 'direct',
      title: 'Анна Соколова',
      description: 'Личная переписка',
      avatar: generateAvatar('usr_anna', 'Анна'),
      members: ['usr_demo', 'usr_anna'],
      admins: [],
      ownerId: null,
      isPublic: false,
      inviteLink: null,
      pinnedMessageIds: ['msg_anna_2'],
      mutedBy: [],
      archivedBy: [],
      folders: { usr_demo: 'Закрепленные' },
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'chat_product',
      type: 'group',
      title: 'Команда продукта',
      description: 'Планирование MVP, дизайн, backend и релизы',
      avatar: generateAvatar('chat_product', 'Команда продукта'),
      members: ['usr_demo', 'usr_anna', 'usr_marat'],
      admins: ['usr_demo', 'usr_marat'],
      ownerId: 'usr_demo',
      isPublic: false,
      inviteLink: 'https://twiftyz.local/invite/product',
      pinnedMessageIds: ['msg_product_1'],
      mutedBy: [],
      archivedBy: [],
      folders: { usr_demo: 'Работа' },
      createdAt,
      updatedAt: createdAt,
      moderation: {
        autoModeration: true,
        welcomeMessage: 'Добро пожаловать в рабочую группу Twiftyz.'
      }
    },
    {
      id: 'chat_channel',
      type: 'channel',
      title: 'Twiftyz Updates',
      description: 'Публичный канал обновлений продукта',
      avatar: generateAvatar('chat_channel', 'Twiftyz Updates'),
      members: ['usr_demo', 'usr_anna', 'usr_marat', 'usr_lena'],
      admins: ['usr_demo', 'usr_lena'],
      ownerId: 'usr_demo',
      isPublic: true,
      inviteLink: 'https://twiftyz.local/channel/updates',
      pinnedMessageIds: [],
      mutedBy: [],
      archivedBy: [],
      folders: { usr_demo: 'Каналы' },
      createdAt,
      updatedAt: createdAt,
      analytics: {
        views: 12840,
        reactions: 724,
        subscribersDelta: 14
      },
      commentsEnabled: true
    }
  ];

  const messages = [
    {
      id: 'msg_anna_1',
      chatId: 'chat_anna',
      authorId: 'usr_anna',
      kind: 'text',
      text: 'Привет. Я собрала первый экран мессенджера: список чатов, поиск и панель профиля.',
      attachments: [],
      replyTo: null,
      reactions: { '👍': ['usr_demo'] },
      receipts: { usr_demo: 'read', usr_anna: 'read' },
      status: 'read',
      isPinned: false,
      createdAt,
      editedAt: null,
      deletedAt: null,
      deletedFor: []
    },
    {
      id: 'msg_anna_2',
      chatId: 'chat_anna',
      authorId: 'usr_demo',
      kind: 'text',
      text: 'Закрепляю: в MVP должны быть авторизация, realtime, контакты, группы, каналы, файлы и настройки безопасности.',
      attachments: [],
      replyTo: 'msg_anna_1',
      reactions: {},
      receipts: { usr_demo: 'read', usr_anna: 'read' },
      status: 'read',
      isPinned: true,
      createdAt,
      editedAt: null,
      deletedAt: null,
      deletedFor: []
    },
    {
      id: 'msg_product_1',
      chatId: 'chat_product',
      authorId: 'usr_marat',
      kind: 'file',
      text: 'Добавил схему API и список очередей для фоновых задач.',
      attachments: [
        {
          id: 'file_seed_api',
          name: 'api-contract.pdf',
          type: 'application/pdf',
          size: 820000,
          scanStatus: 'clean',
          progress: 100,
          url: '#'
        }
      ],
      replyTo: null,
      reactions: { '🔥': ['usr_demo', 'usr_anna'] },
      receipts: { usr_demo: 'read', usr_anna: 'delivered', usr_marat: 'read' },
      status: 'delivered',
      isPinned: true,
      createdAt,
      editedAt: null,
      deletedAt: null,
      deletedFor: []
    },
    {
      id: 'msg_channel_1',
      chatId: 'chat_channel',
      authorId: 'usr_lena',
      kind: 'post',
      text: 'Twiftyz MVP получил базовый web-клиент, REST API, WebSocket-синхронизацию и админ-сводку.',
      attachments: [],
      replyTo: null,
      reactions: { '🚀': ['usr_demo', 'usr_anna', 'usr_marat'] },
      receipts: {},
      status: 'sent',
      isPinned: false,
      createdAt,
      editedAt: null,
      deletedAt: null,
      deletedFor: []
    }
  ];

  return {
    meta: {
      name: 'Twiftyz Messenger',
      version: '0.1.0',
      createdAt,
      updatedAt: createdAt
    },
    users,
    sessions: [],
    authCodes: [],
    contacts: [
      { ownerId: 'usr_demo', userId: 'usr_anna', favorite: true, blocked: false, tags: ['design'], createdAt },
      { ownerId: 'usr_demo', userId: 'usr_marat', favorite: true, blocked: false, tags: ['backend'], createdAt },
      { ownerId: 'usr_demo', userId: 'usr_lena', favorite: false, blocked: false, tags: ['channels'], createdAt }
    ],
    chats,
    messages,
    calls: [
      {
        id: 'call_seed',
        chatId: 'chat_product',
        type: 'voice',
        status: 'ended',
        participants: ['usr_demo', 'usr_anna', 'usr_marat'],
        startedBy: 'usr_demo',
        startedAt: createdAt,
        endedAt: createdAt,
        quality: 'HD',
        encrypted: true,
        recording: false
      }
    ],
    files: [],
    notifications: [
      {
        id: 'ntf_seed',
        userId: 'usr_demo',
        type: 'security',
        title: 'Новый вход',
        text: 'Вход в демо-аккаунт будет отмечен в журнале безопасности.',
        read: false,
        createdAt
      }
    ],
    settings: {
      usr_demo: defaultSettings()
    },
    logs: [
      { id: id('log'), level: 'info', actorId: 'system', action: 'seed.created', text: 'Seed data initialized', createdAt }
    ]
  };
}

function defaultSettings() {
  return {
    theme: 'auto',
    language: 'ru',
    fontSize: 15,
    colorScheme: 'balanced',
    mediaAutoDownload: 'wifi',
    autosave: true,
    callQuality: 'auto',
    videoQuality: 'auto',
    security: {
      twoFactorEnabled: false,
      newDeviceApproval: true,
      sessionCompromiseLogout: true
    },
    notifications: {
      push: true,
      email: true,
      desktop: true,
      webPush: true,
      sounds: true,
      doNotDisturb: false,
      schedule: '09:00-22:00'
    }
  };
}

/* ============================================================
   Persistence: SQLite (node:sqlite, zero dependencies).
   The store stays in memory for reads; saveStore() diffs each
   collection against the last persisted snapshot and writes only
   changed rows inside a transaction. Collections are stored as
   JSON documents keyed by id — the same model maps 1:1 onto
   PostgreSQL (jsonb) when the project outgrows a single node.
   ============================================================ */

const { DatabaseSync } = require('node:sqlite');
const DB_FILE = path.join(DATA_DIR, 'twiftyz.db');

const STORE_COLLECTIONS = [
  'users', 'contacts', 'chats', 'messages', 'notifications', 'files', 'calls',
  'logs', 'authCodes', 'sessions', 'loginChallenges', 'pendingRegistrations', 'resetChallenges'
];

// Contacts have no id of their own — they are keyed by the owner/user pair.
function collectionKey(coll, record) {
  return coll === 'contacts' ? `${record.ownerId}:${record.userId}` : String(record.id);
}

let db = null;
let dbUpsert = null;
let dbDelete = null;
const savedRows = new Map(); // coll -> Map(key -> serialized row)

function openDb() {
  if (db) return;
  ensureDir(DATA_DIR);
  db = new DatabaseSync(DB_FILE);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA synchronous = NORMAL');
  db.exec('CREATE TABLE IF NOT EXISTS docs (coll TEXT NOT NULL, id TEXT NOT NULL, doc TEXT NOT NULL, PRIMARY KEY (coll, id))');
  dbUpsert = db.prepare('INSERT INTO docs (coll, id, doc) VALUES (?, ?, ?) ON CONFLICT(coll, id) DO UPDATE SET doc = excluded.doc');
  dbDelete = db.prepare('DELETE FROM docs WHERE coll = ? AND id = ?');
}

function normalizeStore(store) {
  for (const coll of STORE_COLLECTIONS) store[coll] ||= [];
  store.settings ||= {};
  store.meta ||= {};
}

function readStoreFromDb() {
  const store = {};
  normalizeStore(store);
  for (const row of db.prepare('SELECT coll, id, doc FROM docs').all()) {
    const doc = JSON.parse(row.doc);
    if (row.coll === 'meta') {
      store.meta = doc;
      continue;
    }
    if (row.coll === 'settings') {
      store.settings[row.id] = doc.doc;
    } else if (STORE_COLLECTIONS.includes(row.coll)) {
      store[row.coll].push(doc);
    } else {
      continue;
    }
    // Pre-fill the snapshot cache so the next save only writes real changes.
    let cache = savedRows.get(row.coll);
    if (!cache) { cache = new Map(); savedRows.set(row.coll, cache); }
    cache.set(row.id, row.doc);
  }
  store.messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  store.logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return store;
}

function loadStore() {
  openDb();
  const populated = db.prepare('SELECT COUNT(*) AS n FROM docs').get().n > 0;
  let store;
  let migratedFromJson = false;
  if (populated) {
    store = readStoreFromDb();
  } else if (fs.existsSync(STORE_FILE)) {
    // One-time migration from the legacy JSON store.
    store = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
    migratedFromJson = true;
  } else {
    store = createSeedStore();
  }
  normalizeStore(store);
  migrateStore(store);
  saveStore(store);
  if (migratedFromJson) {
    fs.renameSync(STORE_FILE, `${STORE_FILE}.migrated`);
    console.log(`Legacy ${path.basename(STORE_FILE)} imported into ${path.basename(DB_FILE)}`);
  }
  return store;
}

function migrateStore(store) {
  let changed = false;
  store.users ||= [];
  store.contacts ||= [];
  store.chats ||= [];
  store.messages ||= [];
  store.settings ||= {};

  // Service account that delivers in-app login codes (Telegram-style "Twiftyz" chat).
  if (!store.users.some((user) => user.id === SERVICE_USER_ID)) {
    const createdAt = now();
    store.users.push({
      id: SERVICE_USER_ID,
      email: '',
      phone: '',
      emailVerifiedAt: '',
      phoneVerifiedAt: '',
      passwordHash: hashPassword(crypto.randomBytes(24).toString('hex')),
      role: 'service',
      accountStatus: 'active',
      firstName: 'Twiftyz',
      lastName: '',
      nickname: 'twiftyz',
      avatar: LOGO_PNG,
      bio: 'Служебные уведомления и коды входа',
      language: 'ru',
      timezone: 'Europe/Moscow',
      status: 'online',
      birthDate: '',
      socialLinks: [],
      createdAt,
      lastSeenAt: createdAt,
      privacy: {},
      security: { twoFactorEnabled: false, trustedDevices: [] }
    });
    changed = true;
  }

  for (const user of store.users) {
    if (!user.passwordHash) {
      user.passwordHash = hashPassword(DEMO_PASSWORD);
      changed = true;
    }
    if (!user.accountStatus) {
      user.accountStatus = 'active';
      changed = true;
    }
    if (!user.emailVerifiedAt && user.email) {
      user.emailVerifiedAt = user.createdAt || now();
      changed = true;
    }
    if (!user.phoneVerifiedAt && user.phone) {
      user.phoneVerifiedAt = user.createdAt || now();
      changed = true;
    }
    if (!store.settings[user.id]) {
      store.settings[user.id] = defaultSettings();
      changed = true;
    }
    if (user.id === SERVICE_USER_ID) {
      if (user.avatar !== LOGO_PNG) { user.avatar = LOGO_PNG; changed = true; }
    } else if (isGeneratedOrDefaultAvatar(user.avatar)) {
      const next = generateAvatar(user.id, user.firstName || user.nickname);
      if (user.avatar !== next) { user.avatar = next; changed = true; }
    }
  }

  for (const chat of store.chats) {
    if (!Array.isArray(chat.pinnedBy)) {
      chat.pinnedBy = [];
      changed = true;
    }
    if (!Array.isArray(chat.archivedBy)) {
      chat.archivedBy = [];
      changed = true;
    }
    chat.folders ||= {};
    if (isGeneratedOrDefaultAvatar(chat.avatar)) {
      // Service direct chat wears the logo; other chats get a letter avatar by title.
      const isServiceChat = chat.type === 'direct' && chat.members.includes(SERVICE_USER_ID);
      const next = isServiceChat ? LOGO_PNG : generateAvatar(chat.id, chat.title);
      if (chat.avatar !== next) { chat.avatar = next; changed = true; }
    }
  }

  return changed;
}

function syncCollection(coll, records) {
  let cache = savedRows.get(coll);
  if (!cache) { cache = new Map(); savedRows.set(coll, cache); }
  const seen = new Set();
  for (const record of records) {
    const key = collectionKey(coll, record);
    seen.add(key);
    const json = JSON.stringify(record);
    if (cache.get(key) !== json) {
      dbUpsert.run(coll, key, json);
      cache.set(key, json);
    }
  }
  for (const key of [...cache.keys()]) {
    if (!seen.has(key)) {
      dbDelete.run(coll, key);
      cache.delete(key);
    }
  }
}

function saveStore(store) {
  store.meta ||= {};
  store.meta.updatedAt = now();
  db.exec('BEGIN');
  try {
    for (const coll of STORE_COLLECTIONS) syncCollection(coll, store[coll] || []);
    syncCollection('settings', Object.entries(store.settings || {}).map(([id, doc]) => ({ id, doc })));
    dbUpsert.run('meta', 'meta', JSON.stringify(store.meta));
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

let store = loadStore();

function log(level, actorId, action, text, extra = {}) {
  store.logs.unshift({
    id: id('log'),
    level,
    actorId: actorId || 'system',
    action,
    text,
    extra,
    createdAt: now()
  });
  store.logs = store.logs.slice(0, 500);
}

// Dispatches an email through the configured transport.
function sendEmail(message) {
  if (EMAIL.provider === 'smtp') return sendEmailSmtp(message);
  return sendEmailBrevo(message);
}

// Brevo transactional HTTP API via built-in https (no npm dependency).
function sendEmailBrevo({ to, subject, html }) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      sender: { name: EMAIL.fromName, email: EMAIL.fromEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html
    });
    const request = https.request(
      {
        hostname: 'api.brevo.com',
        path: '/v3/smtp/email',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'api-key': EMAIL.brevoKey
        }
      },
      (response) => {
        let data = '';
        response.on('data', (chunk) => {
          data += chunk;
        });
        response.on('end', () => {
          if (response.statusCode >= 200 && response.statusCode < 300) resolve({ ok: true });
          else reject(new Error(`Brevo ${response.statusCode}: ${data.slice(0, 200)}`));
        });
      }
    );
    request.on('error', reject);
    request.setTimeout(10_000, () => request.destroy(new Error('Email request timeout')));
    request.end(payload);
  });
}

// Reads complete SMTP replies from a socket. Returns an `expect()` function that
// resolves with the next { code, text } reply (handles multiline 250- continuations).
function smtpReader(socket) {
  let buffer = '';
  const pending = [];
  const ready = [];
  const drain = () => {
    while (pending.length && ready.length) pending.shift()(ready.shift());
  };
  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    for (;;) {
      const lines = buffer.split('\r\n');
      let endIdx = -1;
      for (let i = 0; i < lines.length - 1; i += 1) {
        if (/^\d{3} /.test(lines[i])) {
          endIdx = i;
          break;
        }
      }
      if (endIdx === -1) break;
      const code = Number(lines[endIdx].slice(0, 3));
      ready.push({ code, text: lines.slice(0, endIdx + 1).join('\n') });
      buffer = lines.slice(endIdx + 1).join('\r\n');
    }
    drain();
  });
  return () => new Promise((resolve) => {
    pending.push(resolve);
    drain();
  });
}

function buildMimeMessage({ to, subject, html }) {
  const body = html.replace(/\r?\n/g, '\r\n').replace(/\r\n\./g, '\r\n..');
  return [
    `From: ${EMAIL.fromName} <${EMAIL.fromEmail}>`,
    `To: <${to}>`,
    `Subject: =?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${id('mail')}@${EMAIL.smtp.host}>`,
    '',
    body
  ].join('\r\n');
}

// Sends an email through your domain SMTP over implicit TLS (port 465) using
// AUTH LOGIN. Pure Node `tls` — no dependency. Resolves on 250 after DATA.
function sendEmailSmtp({ to, subject, html }) {
  const { host, port, user, pass } = EMAIL.smtp;
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port, servername: host });
    socket.setTimeout(15_000, () => socket.destroy(new Error('SMTP timeout')));
    socket.on('error', reject);

    const expect = smtpReader(socket);
    const say = (line) => socket.write(`${line}\r\n`);
    const need = async (codes) => {
      const reply = await expect();
      if (!codes.includes(reply.code)) throw new Error(`SMTP ${reply.code}: ${reply.text.trim()}`);
      return reply;
    };

    (async () => {
      await need([220]);
      say('EHLO twiftyz.local');
      await need([250]);
      say('AUTH LOGIN');
      await need([334]);
      say(Buffer.from(user, 'utf8').toString('base64'));
      await need([334]);
      say(Buffer.from(pass, 'utf8').toString('base64'));
      await need([235]);
      say(`MAIL FROM:<${EMAIL.fromEmail}>`);
      await need([250]);
      say(`RCPT TO:<${to}>`);
      await need([250, 251]);
      say('DATA');
      await need([354]);
      socket.write(`${buildMimeMessage({ to, subject, html })}\r\n.\r\n`);
      await need([250]);
      say('QUIT');
      socket.end();
      resolve({ ok: true });
    })().catch((error) => {
      socket.destroy();
      reject(error);
    });
  });
}

function verificationEmailHtml(code) {
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:480px;margin:0 auto;padding:28px;color:#111722">
      <div style="display:inline-block;width:46px;height:46px;line-height:46px;text-align:center;border-radius:12px;background:#0d9488;color:#fff;font-size:22px;font-weight:bold">T</div>
      <h2 style="margin:18px 0 6px;font-size:20px">Код подтверждения</h2>
      <p style="margin:0 0 18px;color:#475467;font-size:15px;line-height:1.5">Введите этот код, чтобы войти в Twiftyz Messenger:</p>
      <div style="font-size:34px;font-weight:800;letter-spacing:10px;color:#0d9488;background:#f0fdfa;border:1px solid #ccfbf1;border-radius:12px;padding:18px;text-align:center">${code}</div>
      <p style="margin:18px 0 0;color:#98a2b3;font-size:13px;line-height:1.5">Код действует 10 минут. Если вы не запрашивали вход — просто проигнорируйте это письмо.</p>
    </div>
  `;
}

function safeUser(user) {
  if (!user) return null;
  const { security, passwordHash, ...publicUser } = user;
  return publicUser;
}

function userName(user) {
  return `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.nickname || user?.email || 'Пользователь';
}

function getUser(id) {
  return store.users.find((user) => user.id === id);
}

function getChat(id) {
  return store.chats.find((chat) => chat.id === id);
}

function isChatMember(chat, userId) {
  return Boolean(chat && chat.members.includes(userId));
}

function isChatAdmin(chat, userId) {
  return Boolean(chat && (chat.ownerId === userId || chat.admins.includes(userId)));
}

function publicChat(chat, userId) {
  const messages = visibleMessagesForChat(chat.id, userId);
  const lastMessage = messages.at(-1) || null;
  let unread = messages.filter((message) => message.authorId !== userId && message.receipts?.[userId] !== 'read').length;
  // Manual "mark as unread" shows a dot even with no genuinely unread messages.
  const manualUnread = (chat.manualUnreadBy || []).includes(userId);
  if (manualUnread && unread === 0) unread = 1;
  // Direct chats show the *other* participant's name and photo for each viewer
  // (the stored title is only a creation-time snapshot).
  let title = chat.title;
  let avatar = chat.avatar;
  if (chat.type === 'direct') {
    const peer = getUser(chat.members.find((memberId) => memberId !== userId) || userId);
    if (peer) {
      title = userName(peer);
      avatar = peer.avatar;
    }
  }
  return {
    ...chat,
    title,
    avatar,
    isPinnedByMe: chat.pinnedBy?.includes(userId) || false,
    isArchivedByMe: chat.archivedBy?.includes(userId) || false,
    folder: chat.folders?.[userId] || '',
    lastMessage,
    unread,
    membersDetailed: chat.members.map(getUser).filter(Boolean).map(safeUser),
    pinnedMessages: store.messages
      .filter((message) => chat.pinnedMessageIds.includes(message.id))
      .map((message) => publicMessage(message, userId))
  };
}

function publicMessage(message, viewerId) {
  if (!message || message.deletedFor?.includes(viewerId)) return null;
  let author = safeUser(getUser(message.authorId));
  // Channel posts shown "as the channel" carry the channel's name/avatar.
  if (message.displayAs === 'channel') {
    const chat = getChat(message.chatId);
    if (chat) author = { id: chat.id, firstName: chat.title, lastName: '', nickname: '', avatar: chat.avatar, isChannel: true };
  }
  return {
    ...message,
    author,
    attachments: message.attachments || []
  };
}

function visibleMessagesForChat(chatId, userId) {
  // Messages deleted "for everyone" stay in the DB (deletedAt) but are hidden from clients.
  return store.messages
    .filter((message) => message.chatId === chatId && !message.deletedAt && !message.deletedFor?.includes(userId))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 2_000_000) {
        reject(Object.assign(new Error('Payload is too large'), { status: 413 }));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(Object.assign(new Error('Invalid JSON'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function readBuffer(req, maxBytes = MAX_UPLOAD_BYTES + 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(Object.assign(new Error('Payload is too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function sanitizeFileName(name) {
  const base = path.basename(String(name || 'file')).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim();
  return base.slice(0, 160) || 'file';
}

function parseMultipart(buffer, contentType) {
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  const boundary = boundaryMatch?.[1] || boundaryMatch?.[2];
  if (!boundary) throw Object.assign(new Error('Multipart boundary is missing'), { status: 400 });

  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts = [];
  let cursor = buffer.indexOf(boundaryBuffer);
  while (cursor !== -1) {
    cursor += boundaryBuffer.length;
    if (buffer[cursor] === 45 && buffer[cursor + 1] === 45) break;
    if (buffer[cursor] === 13 && buffer[cursor + 1] === 10) cursor += 2;
    const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), cursor);
    if (headerEnd === -1) break;
    const rawHeaders = buffer.subarray(cursor, headerEnd).toString('utf8');
    let next = buffer.indexOf(boundaryBuffer, headerEnd + 4);
    if (next === -1) next = buffer.length;
    let bodyEnd = next;
    if (buffer[bodyEnd - 2] === 13 && buffer[bodyEnd - 1] === 10) bodyEnd -= 2;
    const body = buffer.subarray(headerEnd + 4, bodyEnd);
    const dispositionLine = rawHeaders.split(/\r\n/).find((line) => /^content-disposition:/i.test(line)) || '';
    const disposition = dispositionLine.slice(dispositionLine.indexOf(':') + 1);
    const name = /(?:^|;)\s*name=(?:"([^"]+)"|([^;]+))/i.exec(disposition)?.slice(1).find(Boolean)?.trim() || '';
    const filename = /(?:^|;)\s*filename=(?:"([^"]*)"|([^;]+))/i.exec(disposition)?.slice(1).find((value) => value !== undefined)?.trim() || '';
    const type = /content-type:\s*([^\r\n]+)/i.exec(rawHeaders)?.[1]?.trim() || 'application/octet-stream';
    parts.push({ name, filename, type, body });
    cursor = next;
  }
  return parts;
}

function sendJson(res, status, payload, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers
  });
  res.end(JSON.stringify(payload));
}

function sendError(res, status, message, details = {}) {
  sendJson(res, status, { error: message, ...details });
}

function notFound(res) {
  sendError(res, 404, 'Not found');
}

function getToken(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return '';
}

function getSession(req) {
  const bearer = getToken(req);
  if (!bearer) return null;
  const session = store.sessions.find((item) => item.token === bearer && !item.revokedAt);
  if (!session) return null;
  const user = getUser(session.userId);
  if (!user) return null;
  session.lastSeenAt = now();
  user.lastSeenAt = session.lastSeenAt;
  user.status = 'online';
  return { session, user };
}

function requireAuth(req, res) {
  const auth = getSession(req);
  if (!auth) {
    sendError(res, 401, 'Authorization required');
    return null;
  }
  return auth;
}

function requireAdmin(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return null;
  if (auth.user.role !== 'admin') {
    sendError(res, 403, 'Admin role required');
    return null;
  }
  return auth;
}

function rateLimit(req, res) {
  const ip = req.socket.remoteAddress || 'local';
  const key = `${ip}:${req.method}:${req.url.split('?')[0]}`;
  const windowMs = 60_000;
  const max = req.url.startsWith('/api/auth') ? 20 : 180;
  const current = Date.now();
  const bucket = rateBuckets.get(key) || { count: 0, resetAt: current + windowMs };
  if (current > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = current + windowMs;
  }
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  if (bucket.count > max) {
    sendError(res, 429, 'Too many requests');
    return false;
  }
  return true;
}

function createNotification(userId, type, title, text) {
  const notification = {
    id: id('ntf'),
    userId,
    type,
    title,
    text,
    read: false,
    createdAt: now()
  };
  store.notifications.unshift(notification);
  emitToUser(userId, 'notification:new', notification);
  return notification;
}

function normalizeIdentifier(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhone(value) {
  const raw = String(value || '').trim();
  const hasPlus = raw.startsWith('+');
  const digits = raw.replace(/[^\d]/g, '');
  return digits ? `${hasPlus ? '+' : ''}${digits}` : '';
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function isPhone(value) {
  const raw = String(value || '').trim();
  // Only digits with optional +, spaces, parentheses and dashes — letters are rejected outright.
  if (!/^\+?[\d\s()-]+$/.test(raw)) return false;
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

function publicAuthUser(user) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    nickname: user.nickname,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
    role: user.role,
    accountStatus: user.accountStatus
  };
}

function findUserByIdentifier(identifier) {
  const normalized = normalizeIdentifier(identifier);
  const phone = normalizePhone(identifier);
  return store.users.find((user) => (
    user.email?.toLowerCase() === normalized ||
    user.nickname?.toLowerCase() === normalized ||
    (phone && user.phone === phone)
  ));
}

function ensureUniqueAccount({ email, phone, nickname }) {
  const normalizedEmail = normalizeIdentifier(email);
  const normalizedNickname = normalizeIdentifier(nickname);
  const normalizedPhone = normalizePhone(phone);
  if (normalizedEmail && store.users.some((user) => user.email?.toLowerCase() === normalizedEmail)) {
    return 'Email already registered';
  }
  if (normalizedPhone && store.users.some((user) => user.phone === normalizedPhone)) {
    return 'Phone already registered';
  }
  if (normalizedNickname && store.users.some((user) => user.nickname?.toLowerCase() === normalizedNickname)) {
    return 'Nickname already taken';
  }
  return '';
}

function createSessionForUser(user, req) {
  const session = {
    id: id('ses'),
    userId: user.id,
    token: token(),
    device: req.headers['user-agent'] || 'Web Browser',
    ip: req.socket.remoteAddress || '',
    createdAt: now(),
    lastSeenAt: now(),
    revokedAt: null
  };
  store.sessions.push(session);
  user.lastSeenAt = session.lastSeenAt;
  user.status = 'online';
  user.security ||= {};
  user.security.trustedDevices ||= [];
  const deviceName = session.device.slice(0, 80);
  if (!user.security.trustedDevices.includes(deviceName)) user.security.trustedDevices.push(deviceName);
  return session;
}

function createAccount(body) {
  const email = normalizeIdentifier(body.email);
  const phone = normalizePhone(body.phone);
  const password = String(body.password || '');
  const firstName = String(body.firstName || '').trim();
  const lastName = String(body.lastName || '').trim();
  const nicknameSource = String(body.nickname || email.split('@')[0] || phone || '').trim();
  const nickname = normalizeIdentifier(nicknameSource).replace(/[^a-z0-9._-]/g, '').slice(0, 32);

  if (!email && !phone) return { error: 'Email or phone is required' };
  if (body.phone && !isPhone(body.phone)) return { error: 'Укажите корректный номер телефона (только цифры, 10–15 знаков)' };
  if (email && !isEmail(email)) return { error: 'Valid email is required' };
  if (!body.passwordHash && password.length < PASSWORD_MIN_LENGTH) return { error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` };
  if (!firstName) return { error: 'First name is required' };
  if (!nickname || nickname.length < 3) return { error: 'Nickname must be at least 3 latin characters, digits, dot, underscore or dash' };

  const duplicate = ensureUniqueAccount({ email, phone, nickname });
  if (duplicate) return { error: duplicate };

  const createdAt = now();
  const user = {
    id: id('usr'),
    email,
    phone,
    emailVerifiedAt: email ? null : '',
    phoneVerifiedAt: phone ? null : '',
    passwordHash: body.passwordHash || hashPassword(password),
    role: 'user',
    accountStatus: 'active',
    firstName,
    lastName,
    nickname,
    avatar: '/assets/avatar-default.png',
    bio: '',
    language: 'ru',
    timezone: body.timezone || 'Europe/Moscow',
    status: 'online',
    birthDate: '',
    socialLinks: [],
    createdAt,
    lastSeenAt: createdAt,
    privacy: {
      phone: 'contacts',
      email: 'contacts',
      lastSeen: 'contacts',
      online: 'everyone',
      avatar: 'everyone',
      contacts: 'nobody'
    },
    security: {
      twoFactorEnabled: false,
      trustedDevices: []
    }
  };
  user.avatar = generateAvatar(user.id, user.firstName);
  store.users.push(user);
  store.settings[user.id] = defaultSettings();
  log('info', user.id, 'user.registered', `Registered account ${user.nickname}`);
  return { user };
}

// Validates registration input without creating the account. Email is required
// because the confirmation code is delivered there. Returns { error } or { data }.
function prepareRegistration(body) {
  const email = normalizeIdentifier(body.email);
  const phone = normalizePhone(body.phone);
  const password = String(body.password || '');
  const firstName = String(body.firstName || '').trim();
  const lastName = String(body.lastName || '').trim();
  const nicknameSource = String(body.nickname || email.split('@')[0] || '').trim();
  const nickname = normalizeIdentifier(nicknameSource).replace(/[^a-z0-9._-]/g, '').slice(0, 32);

  if (!email || !isEmail(email)) return { error: 'Укажите корректный email — на него придёт код подтверждения' };
  if (!isPhone(body.phone)) return { error: 'Укажите корректный номер телефона (только цифры, 10–15 знаков)' };
  if (password.length < PASSWORD_MIN_LENGTH) return { error: `Пароль должен быть не короче ${PASSWORD_MIN_LENGTH} символов` };
  if (!firstName) return { error: 'Укажите имя' };
  if (!nickname || nickname.length < 3) return { error: 'Никнейм: минимум 3 латинских символа, цифры, точка, дефис или подчёркивание' };

  const duplicate = ensureUniqueAccount({ email, phone, nickname });
  if (duplicate) return { error: duplicate };

  return {
    data: {
      email,
      phone,
      nickname,
      firstName,
      lastName,
      timezone: body.timezone || 'Europe/Moscow',
      passwordHash: hashPassword(password)
    }
  };
}

// Returns the existing 1:1 service chat for a user (creating it on demand).
function getOrCreateServiceChat(userId) {
  const found = store.chats.find((chat) => chat.type === 'direct'
    && chat.members.length === 2
    && chat.members.includes(SERVICE_USER_ID)
    && chat.members.includes(userId));
  if (found) return found;
  const createdAt = now();
  const chat = {
    id: id('chat'),
    type: 'direct',
    title: 'Twiftyz',
    description: 'Служебный чат: коды входа и уведомления',
    avatar: LOGO_PNG,
    members: [userId, SERVICE_USER_ID],
    admins: [],
    ownerId: null,
    isPublic: false,
    inviteLink: null,
    pinnedMessageIds: [],
    mutedBy: [],
    archivedBy: [],
    folders: {},
    service: true,
    createdAt,
    updatedAt: createdAt
  };
  store.chats.push(chat);
  emitToUser(userId, 'chat:created', publicChat(chat, userId));
  return chat;
}

// Posts a message from the service account into the user's service chat.
function postServiceMessage(userId, text) {
  const chat = getOrCreateServiceChat(userId);
  const message = {
    id: id('msg'),
    chatId: chat.id,
    authorId: SERVICE_USER_ID,
    kind: 'text',
    text,
    attachments: [],
    replyTo: null,
    formatting: {},
    reactions: {},
    receipts: { [SERVICE_USER_ID]: 'read' },
    status: 'sent',
    isPinned: false,
    createdAt: now(),
    scheduledAt: null,
    editedAt: null,
    deletedAt: null,
    deletedFor: []
  };
  store.messages.push(message);
  chat.updatedAt = message.createdAt;
  emitToUser(userId, 'message:new', publicMessage(message, null));
  emitToUser(userId, 'chat:updated', publicChat(chat, userId));
  return message;
}

// Creates a single active login challenge (6-digit code) for a user.
function createLoginChallenge(userId, channel) {
  store.loginChallenges = (store.loginChallenges || [])
    .filter((item) => new Date(item.expiresAt) > new Date() && item.userId !== userId);
  const challenge = {
    id: id('lgn'),
    userId,
    code: String(crypto.randomInt(100000, 999999)),
    channel,
    attempts: 0,
    expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    createdAt: now()
  };
  store.loginChallenges.push(challenge);
  return challenge;
}

function hasActiveSession(userId) {
  return store.sessions.some((session) => session.userId === userId && !session.revokedAt);
}

function maskEmail(email) {
  const [name, domain] = String(email || '').split('@');
  if (!domain) return email;
  const visible = name.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(1, name.length - 2))}@${domain}`;
}

// ---- Link previews (zero-dependency OpenGraph fetcher) ----
const linkPreviewCache = new Map();

function decodeEntities(text) {
  return String(text || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;/gi, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function metaContent(html, key) {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`, 'i')
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match) return decodeEntities(match[1]);
  }
  return '';
}

// Basic SSRF guard: refuse obvious loopback / private ranges by hostname.
function isBlockedHost(hostname) {
  return hostname === '::1'
    || /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(hostname);
}

function buildPreview(html, targetUrl, parsed) {
  const head = html.slice(0, 300_000);
  const titleTag = (head.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '').trim();
  let image = metaContent(head, 'og:image') || metaContent(head, 'twitter:image');
  if (image) {
    try { image = new URL(image, targetUrl).href; } catch { image = ''; }
  }
  return {
    url: targetUrl,
    title: metaContent(head, 'og:title') || decodeEntities(titleTag),
    description: metaContent(head, 'og:description') || metaContent(head, 'description'),
    image,
    site: metaContent(head, 'og:site_name') || parsed.hostname
  };
}

function fetchLinkPreview(targetUrl, depth = 0) {
  return new Promise((resolve) => {
    let parsed;
    try { parsed = new URL(targetUrl); } catch { return resolve(null); }
    if (!['http:', 'https:'].includes(parsed.protocol) || isBlockedHost(parsed.hostname)) return resolve(null);
    const lib = parsed.protocol === 'https:' ? https : http;
    const request = lib.get(targetUrl, {
      headers: { 'User-Agent': 'TwiftyzBot/1.0 (+link-preview)', Accept: 'text/html,*/*' },
      timeout: 6000
    }, (response) => {
      const status = response.statusCode || 0;
      if (status >= 300 && status < 400 && response.headers.location && depth < 3) {
        response.resume();
        let next;
        try { next = new URL(response.headers.location, targetUrl).href; } catch { return resolve(null); }
        return resolve(fetchLinkPreview(next, depth + 1));
      }
      if (status >= 400) { response.resume(); return resolve(null); }
      const ctype = response.headers['content-type'] || '';
      if (!ctype.includes('text/html')) {
        response.resume();
        if (ctype.startsWith('image/')) return resolve({ url: targetUrl, title: '', description: '', image: targetUrl, site: parsed.hostname });
        return resolve(null);
      }
      let html = '';
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(buildPreview(html, targetUrl, parsed)); } };
      response.on('data', (chunk) => {
        html += chunk;
        if (html.length > 300_000) { html = html.slice(0, 300_000); response.destroy(); finish(); }
      });
      response.on('end', finish);
      response.on('close', finish);
    });
    request.on('error', () => resolve(null));
    request.on('timeout', () => { request.destroy(); resolve(null); });
  });
}

function findOrCreateUser(identifier, profile = {}) {
  const normalized = normalizeIdentifier(identifier);
  let user = store.users.find((item) => item.email?.toLowerCase() === normalized || item.phone === normalizePhone(identifier));
  if (user) return user;

  const isEmail = normalized.includes('@');
  const namePart = normalized.split('@')[0].replace(/[^a-z0-9._-]/gi, '') || 'user';
  user = {
    id: id('usr'),
    email: isEmail ? normalized : '',
    phone: isEmail ? '' : normalizePhone(identifier),
    emailVerifiedAt: isEmail ? now() : '',
    phoneVerifiedAt: isEmail ? '' : now(),
    passwordHash: hashPassword(token()),
    role: 'user',
    accountStatus: 'active',
    firstName: profile.firstName || profile.name || 'Новый',
    lastName: profile.lastName || 'Пользователь',
    nickname: profile.nickname || `${namePart}.${crypto.randomBytes(2).toString('hex')}`,
    avatar: '/assets/avatar-default.png',
    bio: '',
    language: 'ru',
    timezone: 'Europe/Moscow',
    status: 'online',
    birthDate: '',
    socialLinks: [],
    createdAt: now(),
    lastSeenAt: now(),
    privacy: {
      phone: 'contacts',
      email: 'contacts',
      lastSeen: 'contacts',
      online: 'everyone',
      avatar: 'everyone',
      contacts: 'nobody'
    },
    security: {
      twoFactorEnabled: false,
      trustedDevices: []
    }
  };
  user.avatar = generateAvatar(user.id, user.firstName);
  store.users.push(user);
  store.settings[user.id] = defaultSettings();
  log('info', user.id, 'user.created', `Created account for ${identifier}`);
  return user;
}

// "Saved Messages" chat — one per user, always present (like Telegram).
function getOrCreateSavedChat(userId) {
  const existing = store.chats.find((chat) => chat.type === 'saved' && chat.members.includes(userId));
  if (existing) return existing;
  const savedId = id('chat');
  const chat = {
    id: savedId,
    type: 'saved',
    title: 'Избранное',
    description: 'Ваши сохранённые сообщения, файлы и заметки',
    avatar: generateAvatar(savedId, 'Избранное'),
    members: [userId],
    admins: [userId],
    ownerId: userId,
    isPublic: false,
    inviteLink: null,
    pinnedMessageIds: [],
    mutedBy: [],
    archivedBy: [],
    pinnedBy: [userId], // keep it at the top of the list
    folders: {},
    createdAt: now(),
    updatedAt: now()
  };
  store.chats.push(chat);
  return chat;
}

function listUserChats(userId) {
  return store.chats
    .filter((chat) => chat.members.includes(userId))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map((chat) => publicChat(chat, userId));
}

function adminSummary() {
  const activeSessions = store.sessions.filter((session) => !session.revokedAt).length;
  const activeCalls = store.calls.filter((call) => call.status === 'active').length;
  return {
    users: store.users.length,
    chats: store.chats.length,
    messages: store.messages.length,
    files: store.files.length,
    activeSessions,
    activeCalls,
    queues: [
      { name: 'media-transcode', pending: 3, status: 'healthy' },
      { name: 'notification-push', pending: 8, status: 'healthy' },
      { name: 'antivirus-scan', pending: 1, status: 'healthy' }
    ],
    monitoring: {
      prometheus: 'configured',
      grafana: 'planned',
      logs: store.logs.length,
      averageDeliveryMs: 118
    },
    storage: {
      provider: 'S3-compatible',
      usedGb: 24.7,
      encryptedAtRest: true
    }
  };
}

function bootstrapFor(user) {
  store.settings[user.id] ||= defaultSettings();
  // Ensure the personal "Saved" chat exists so it always shows in the list.
  if (user.role !== 'service') getOrCreateSavedChat(user.id);
  return {
    app: {
      name: store.meta.name,
      version: store.meta.version,
      realtime: 'native-websocket',
      platforms: ['web', 'android', 'ios', 'windows', 'macos', 'linux']
    },
    me: safeUser(user),
    settings: store.settings[user.id],
    chats: listUserChats(user.id),
    contacts: store.contacts
      .filter((contact) => contact.ownerId === user.id)
      .map((contact) => ({ ...contact, user: safeUser(getUser(contact.userId)) })),
    calls: store.calls
      .filter((call) => call.participants.includes(user.id))
      .slice(0, 20),
    notifications: store.notifications
      .filter((notification) => notification.userId === user.id)
      .slice(0, 30),
    admin: user.role === 'admin' ? adminSummary() : null
  };
}

async function handleApi(req, res, url) {
  if (!rateLimit(req, res)) return;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS'
    });
    res.end();
    return;
  }

  try {
    const pathname = url.pathname;

    // Step 1 of registration: validate, stash pending account, email a code.
    if (req.method === 'POST' && pathname === '/api/auth/register') {
      const body = await readJson(req);
      const prepared = prepareRegistration(body);
      if (prepared.error) return sendError(res, 400, prepared.error);
      const email = prepared.data.email;

      store.pendingRegistrations = (store.pendingRegistrations || []).filter((item) => new Date(item.expiresAt) > new Date());
      const recent = store.pendingRegistrations.find((item) => item.email === email);
      if (recent && Date.now() - new Date(recent.createdAt).getTime() < OTP_COOLDOWN_MS) {
        return sendError(res, 429, 'Код уже отправлен. Запросите новый через минуту.');
      }
      store.pendingRegistrations = store.pendingRegistrations.filter((item) => item.email !== email);

      const code = String(crypto.randomInt(100000, 999999));
      const pending = {
        id: id('reg'),
        ...prepared.data,
        code,
        attempts: 0,
        expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        createdAt: now()
      };
      store.pendingRegistrations.push(pending);

      let emailed = false;
      if (EMAIL.enabled) {
        try {
          await sendEmail({ to: email, subject: 'Код подтверждения Twiftyz', html: verificationEmailHtml(code) });
          emailed = true;
        } catch (error) {
          store.pendingRegistrations = store.pendingRegistrations.filter((item) => item.id !== pending.id);
          log('error', 'system', 'auth.register.email_failed', `Email send failed for ${email}: ${error.message}`);
          saveStore(store);
          return sendError(res, 502, 'Не удалось отправить код на почту. Попробуйте позже.');
        }
      } else {
        log('warn', 'system', 'auth.register.email_disabled', `Email disabled. Registration code for ${email}: ${code}`);
      }

      log('info', 'system', 'auth.register.start', `Registration code requested for ${email}`);
      saveStore(store);
      const response = { challengeId: pending.id, email: maskEmail(email), delivery: 'email', expiresAt: pending.expiresAt };
      if (!emailed) response.devCode = code;
      return sendJson(res, 201, response);
    }

    // Step 2 of registration: verify the code and create the account.
    if (req.method === 'POST' && pathname === '/api/auth/register/verify') {
      const body = await readJson(req);
      const challengeId = String(body.challengeId || '');
      const code = String(body.code || '').trim();
      store.pendingRegistrations = (store.pendingRegistrations || []).filter((item) => new Date(item.expiresAt) > new Date());
      const pending = store.pendingRegistrations.find((item) => item.id === challengeId);
      if (!pending) return sendError(res, 410, 'Код истёк. Зарегистрируйтесь заново.');
      if (pending.attempts >= OTP_MAX_ATTEMPTS) {
        store.pendingRegistrations = store.pendingRegistrations.filter((item) => item.id !== pending.id);
        saveStore(store);
        return sendError(res, 429, 'Слишком много попыток. Зарегистрируйтесь заново.');
      }
      if (pending.code !== code) {
        pending.attempts += 1;
        saveStore(store);
        return sendError(res, 401, 'Неверный код');
      }
      const result = createAccount({
        email: pending.email,
        phone: pending.phone,
        nickname: pending.nickname,
        firstName: pending.firstName,
        lastName: pending.lastName,
        timezone: pending.timezone,
        passwordHash: pending.passwordHash
      });
      store.pendingRegistrations = store.pendingRegistrations.filter((item) => item.id !== pending.id);
      if (result.error) {
        saveStore(store);
        return sendError(res, 409, result.error);
      }
      result.user.emailVerifiedAt = now();
      const session = createSessionForUser(result.user, req);
      postServiceMessage(result.user.id, `Добро пожаловать в Twiftyz, ${result.user.firstName}! Это служебный чат — сюда приходят коды для входа на новых устройствах.`);
      createNotification(result.user.id, 'security', 'Аккаунт создан', `Создана сессия: ${session.device.slice(0, 80)}`);
      log('info', result.user.id, 'auth.register', `User ${userName(result.user)} registered`, { sessionId: session.id });
      saveStore(store);
      return sendJson(res, 201, {
        token: session.token,
        user: safeUser(result.user),
        account: publicAuthUser(result.user),
        bootstrap: bootstrapFor(result.user)
      });
    }

    // Step 1 of login: check password, then require a confirmation code.
    if (req.method === 'POST' && pathname === '/api/auth/login') {
      const body = await readJson(req);
      const identifier = String(body.identifier || '').trim();
      const password = String(body.password || '');
      if (!identifier || !password) return sendError(res, 400, 'Укажите логин и пароль');
      const user = findUserByIdentifier(identifier);
      if (!user || user.id === SERVICE_USER_ID || !verifyPassword(password, user.passwordHash)) {
        log('warn', 'system', 'auth.login.failed', `Failed login for ${identifier}`);
        saveStore(store);
        return sendError(res, 401, 'Неверный логин или пароль');
      }
      if (user.accountStatus && user.accountStatus !== 'active') {
        return sendError(res, 403, 'Аккаунт неактивен');
      }
      // No device to receive an in-app code → the code goes to the account email.
      // Recovery (email+phone+nickname) stays as the fallback for lost mailbox access.
      if (!hasActiveSession(user.id)) {
        if (!user.email || !isEmail(user.email)) {
          return sendJson(res, 200, { requiresRecovery: true });
        }
        const challenge = createLoginChallenge(user.id, 'email');
        let emailed = false;
        if (EMAIL.enabled) {
          try {
            await sendEmail({ to: user.email, subject: 'Код для входа в Twiftyz', html: verificationEmailHtml(challenge.code) });
            emailed = true;
          } catch (error) {
            store.loginChallenges = store.loginChallenges.filter((item) => item.id !== challenge.id);
            log('error', 'system', 'auth.login.email_failed', `Login code email failed for ${user.email}: ${error.message}`);
            saveStore(store);
            return sendError(res, 502, 'Не удалось отправить код на почту. Попробуйте позже.');
          }
        } else {
          log('warn', 'system', 'auth.login.email_disabled', `Email disabled. Login code for ${user.email}: ${challenge.code}`);
        }
        log('info', user.id, 'auth.login.code', `Email login code issued for ${userName(user)}`);
        saveStore(store);
        const response = { challengeId: challenge.id, delivery: 'email', email: maskEmail(user.email) };
        if (!emailed) response.devCode = challenge.code;
        return sendJson(res, 200, response);
      }
      const challenge = createLoginChallenge(user.id, 'in-app');
      postServiceMessage(user.id, `Код для входа: ${challenge.code}\nНикому не сообщайте этот код. Он действует 10 минут.`);
      log('info', user.id, 'auth.login.code', `In-app login code issued for ${userName(user)}`);
      saveStore(store);
      const response = { challengeId: challenge.id, delivery: 'in-app' };
      if (!EMAIL.enabled) response.devCode = challenge.code;
      return sendJson(res, 200, response);
    }

    // Recovery: prove identity (email + phone + nickname) to receive a code by email.
    if (req.method === 'POST' && pathname === '/api/auth/recover') {
      const body = await readJson(req);
      const email = normalizeIdentifier(body.email);
      const phone = normalizePhone(body.phone);
      const nickname = normalizeIdentifier(body.nickname);
      if (!email || !phone || !nickname) return sendError(res, 400, 'Заполните email, телефон и никнейм');
      const user = store.users.find((item) => item.id !== SERVICE_USER_ID
        && item.email?.toLowerCase() === email
        && item.phone === phone
        && item.nickname?.toLowerCase() === nickname);
      if (!user) return sendError(res, 401, 'Данные не совпадают ни с одним аккаунтом');
      if (!user.email || !isEmail(user.email)) return sendError(res, 400, 'У аккаунта нет email для отправки кода');

      const challenge = createLoginChallenge(user.id, 'email');
      let emailed = false;
      if (EMAIL.enabled) {
        try {
          await sendEmail({ to: user.email, subject: 'Код для входа в Twiftyz', html: verificationEmailHtml(challenge.code) });
          emailed = true;
        } catch (error) {
          store.loginChallenges = store.loginChallenges.filter((item) => item.id !== challenge.id);
          log('error', 'system', 'auth.recover.email_failed', `Email send failed: ${error.message}`);
          saveStore(store);
          return sendError(res, 502, 'Не удалось отправить код на почту. Попробуйте позже.');
        }
      } else {
        log('warn', 'system', 'auth.recover.email_disabled', `Email disabled. Recovery code for ${user.email}: ${challenge.code}`);
      }
      log('info', user.id, 'auth.recover', `Recovery code emailed for ${userName(user)}`);
      saveStore(store);
      const response = { challengeId: challenge.id, delivery: 'email', email: maskEmail(user.email) };
      if (!emailed) response.devCode = challenge.code;
      return sendJson(res, 200, response);
    }

    // Step 2 of login (and recovery): verify the code and open a session.
    if (req.method === 'POST' && pathname === '/api/auth/login/verify') {
      const body = await readJson(req);
      const challengeId = String(body.challengeId || '');
      const code = String(body.code || '').trim();
      store.loginChallenges = (store.loginChallenges || []).filter((item) => new Date(item.expiresAt) > new Date());
      const challenge = store.loginChallenges.find((item) => item.id === challengeId);
      if (!challenge) return sendError(res, 410, 'Код истёк. Войдите заново.');
      if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
        store.loginChallenges = store.loginChallenges.filter((item) => item.id !== challenge.id);
        saveStore(store);
        return sendError(res, 429, 'Слишком много попыток. Войдите заново.');
      }
      if (challenge.code !== code) {
        challenge.attempts += 1;
        saveStore(store);
        return sendError(res, 401, 'Неверный код');
      }
      const user = getUser(challenge.userId);
      if (!user) return sendError(res, 404, 'Аккаунт не найден');
      store.loginChallenges = store.loginChallenges.filter((item) => item.id !== challenge.id);
      const session = createSessionForUser(user, req);
      createNotification(user.id, 'security', 'Новый вход', `Создана сессия: ${session.device.slice(0, 80)}`);
      log('info', user.id, 'auth.login', `User ${userName(user)} signed in via code`, { sessionId: session.id });
      saveStore(store);
      return sendJson(res, 200, {
        token: session.token,
        user: safeUser(user),
        account: publicAuthUser(user),
        bootstrap: bootstrapFor(user)
      });
    }

    // Password reset step 1: email a code to the account owner.
    if (req.method === 'POST' && pathname === '/api/auth/password/reset/start') {
      const body = await readJson(req);
      const email = normalizeIdentifier(body.email);
      if (!email) return sendError(res, 400, 'Укажите email');
      const user = store.users.find((item) => item.id !== SERVICE_USER_ID && item.email?.toLowerCase() === email);
      if (!user || !user.email) return sendError(res, 404, 'Аккаунт с таким email не найден');

      store.resetChallenges = (store.resetChallenges || []).filter((item) => new Date(item.expiresAt) > new Date());
      const recent = store.resetChallenges.find((item) => item.userId === user.id);
      if (recent && Date.now() - new Date(recent.createdAt).getTime() < OTP_COOLDOWN_MS) {
        return sendError(res, 429, 'Код уже отправлен. Запросите новый через минуту.');
      }
      store.resetChallenges = store.resetChallenges.filter((item) => item.userId !== user.id);

      const challenge = {
        id: id('rst'),
        userId: user.id,
        code: String(crypto.randomInt(100000, 999999)),
        attempts: 0,
        expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        createdAt: now()
      };
      store.resetChallenges.push(challenge);

      let emailed = false;
      if (EMAIL.enabled) {
        try {
          await sendEmail({ to: user.email, subject: 'Сброс пароля Twiftyz', html: verificationEmailHtml(challenge.code) });
          emailed = true;
        } catch (error) {
          store.resetChallenges = store.resetChallenges.filter((item) => item.id !== challenge.id);
          log('error', 'system', 'auth.reset.email_failed', `Email send failed: ${error.message}`);
          saveStore(store);
          return sendError(res, 502, 'Не удалось отправить код на почту. Попробуйте позже.');
        }
      } else {
        log('warn', 'system', 'auth.reset.email_disabled', `Email disabled. Reset code for ${user.email}: ${challenge.code}`);
      }
      log('info', user.id, 'auth.reset.start', `Password reset code emailed for ${userName(user)}`);
      saveStore(store);
      const response = { challengeId: challenge.id, delivery: 'email', email: maskEmail(user.email) };
      if (!emailed) response.devCode = challenge.code;
      return sendJson(res, 200, response);
    }

    // Password reset step 2: verify code, set new password, revoke old sessions, sign in.
    if (req.method === 'POST' && pathname === '/api/auth/password/reset/verify') {
      const body = await readJson(req);
      const challengeId = String(body.challengeId || '');
      const code = String(body.code || '').trim();
      const newPassword = String(body.newPassword || '');
      store.resetChallenges = (store.resetChallenges || []).filter((item) => new Date(item.expiresAt) > new Date());
      const challenge = store.resetChallenges.find((item) => item.id === challengeId);
      if (!challenge) return sendError(res, 410, 'Код истёк. Запросите сброс заново.');
      if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
        store.resetChallenges = store.resetChallenges.filter((item) => item.id !== challenge.id);
        saveStore(store);
        return sendError(res, 429, 'Слишком много попыток. Запросите сброс заново.');
      }
      if (challenge.code !== code) {
        challenge.attempts += 1;
        saveStore(store);
        return sendError(res, 401, 'Неверный код');
      }
      if (newPassword.length < PASSWORD_MIN_LENGTH) {
        return sendError(res, 400, `Пароль должен быть не короче ${PASSWORD_MIN_LENGTH} символов`);
      }
      const user = getUser(challenge.userId);
      if (!user) return sendError(res, 404, 'Аккаунт не найден');
      user.passwordHash = hashPassword(newPassword);
      // Revoke every existing session — the password just changed.
      for (const session of store.sessions) {
        if (session.userId === user.id && !session.revokedAt) session.revokedAt = now();
      }
      store.resetChallenges = store.resetChallenges.filter((item) => item.id !== challenge.id);
      const session = createSessionForUser(user, req);
      postServiceMessage(user.id, 'Пароль изменён. Если это были не вы — немедленно смените пароль и завершите чужие сессии в настройках.');
      createNotification(user.id, 'security', 'Пароль изменён', 'Пароль вашего аккаунта был сброшен.');
      log('info', user.id, 'auth.reset', `Password reset for ${userName(user)}`, { sessionId: session.id });
      saveStore(store);
      return sendJson(res, 200, {
        token: session.token,
        user: safeUser(user),
        account: publicAuthUser(user),
        bootstrap: bootstrapFor(user)
      });
    }

    if (req.method === 'POST' && pathname === '/api/auth/logout') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      auth.session.revokedAt = now();
      log('info', auth.user.id, 'auth.logout', `Session ${auth.session.id} logged out`);
      saveStore(store);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && pathname === '/api/auth/start') {
      const body = await readJson(req);
      const identifier = String(body.identifier || '').trim();
      if (!identifier) return sendError(res, 400, 'Email or phone is required');

      // Drop expired challenges first.
      store.authCodes = store.authCodes.filter((item) => new Date(item.expiresAt) > new Date());

      // Per-identifier cooldown to prevent email bombing / spam.
      const existing = store.authCodes.find((item) => item.identifier === identifier);
      if (existing && Date.now() - new Date(existing.createdAt).getTime() < OTP_COOLDOWN_MS) {
        return sendError(res, 429, 'Код уже отправлен. Запросите новый через минуту.');
      }

      // Keep a single active code per identifier.
      store.authCodes = store.authCodes.filter((item) => item.identifier !== identifier);

      const code = String(crypto.randomInt(100000, 999999));
      const challenge = {
        id: id('otp'),
        identifier,
        code,
        expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        createdAt: now(),
        attempts: 0
      };
      store.authCodes.push(challenge);

      const isEmail = identifier.includes('@');
      let emailed = false;
      if (isEmail && EMAIL.enabled) {
        try {
          await sendEmail({
            to: identifier,
            subject: 'Код подтверждения Twiftyz',
            html: verificationEmailHtml(code)
          });
          emailed = true;
        } catch (error) {
          store.authCodes = store.authCodes.filter((item) => item.id !== challenge.id);
          log('error', 'system', 'auth.code.email_failed', `Email send failed for ${identifier}: ${error.message}`);
          saveStore(store);
          return sendError(res, 502, 'Не удалось отправить код на почту. Попробуйте позже.');
        }
      } else if (isEmail) {
        log('warn', 'system', 'auth.code.email_disabled', `Email delivery is not configured. Code for ${identifier}: ${code}`);
      }

      log('info', 'system', 'auth.code.created', `One-time code requested for ${identifier}`);
      saveStore(store);

      const response = {
        challengeId: challenge.id,
        delivery: isEmail ? 'email' : 'sms',
        expiresAt: challenge.expiresAt
      };
      // Only expose the code when no real delivery happened (dev/demo fallback).
      if (!emailed) response.devCode = code;
      return sendJson(res, 200, response);
    }

    if (req.method === 'POST' && pathname === '/api/auth/verify') {
      const body = await readJson(req);
      const identifier = String(body.identifier || '').trim();
      const code = String(body.code || '').trim();
      const challenge = store.authCodes.find((item) => item.identifier === identifier);
      if (!challenge || new Date(challenge.expiresAt) < new Date()) {
        return sendError(res, 401, 'Код неверный или истёк');
      }
      if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
        store.authCodes = store.authCodes.filter((item) => item.id !== challenge.id);
        saveStore(store);
        return sendError(res, 429, 'Слишком много попыток. Запросите новый код.');
      }
      if (challenge.code !== code) {
        challenge.attempts += 1;
        saveStore(store);
        return sendError(res, 401, 'Неверный код');
      }
      const user = findOrCreateUser(identifier, body.profile || {});
      // Mark the channel as verified now that the code is confirmed.
      if (identifier.includes('@')) user.emailVerifiedAt ||= now();
      else user.phoneVerifiedAt ||= now();
      const session = createSessionForUser(user, req);
      store.authCodes = store.authCodes.filter((item) => item.id !== challenge.id);
      createNotification(user.id, 'security', 'Новый вход', `Создана сессия: ${session.device.slice(0, 80)}`);
      log('info', user.id, 'auth.login', `User ${userName(user)} signed in`, { sessionId: session.id });
      saveStore(store);
      return sendJson(res, 200, { token: session.token, user: safeUser(user), bootstrap: bootstrapFor(user) });
    }

    if (req.method === 'GET' && pathname === '/api/bootstrap') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      saveStore(store);
      return sendJson(res, 200, bootstrapFor(auth.user));
    }

    if (req.method === 'GET' && pathname === '/api/me') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      return sendJson(res, 200, { user: safeUser(auth.user), settings: store.settings[auth.user.id] || defaultSettings() });
    }

    if (req.method === 'PATCH' && pathname === '/api/me') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const body = await readJson(req);
      // Nickname is unique — validate before applying.
      if (Object.prototype.hasOwnProperty.call(body, 'nickname')) {
        const nickname = normalizeIdentifier(body.nickname).replace(/[^a-z0-9._-]/g, '').slice(0, 32);
        if (!nickname || nickname.length < 3) return sendError(res, 400, 'Никнейм: минимум 3 латинских символа, цифры, точка, дефис или подчёркивание');
        const taken = store.users.some((item) => item.id !== auth.user.id && item.nickname?.toLowerCase() === nickname);
        if (taken) return sendError(res, 409, 'Этот никнейм уже занят');
        body.nickname = nickname;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'firstName')) {
        const firstName = String(body.firstName || '').trim();
        if (!firstName) return sendError(res, 400, 'Укажите имя');
        body.firstName = firstName;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'phone')) {
        if (!isPhone(body.phone)) return sendError(res, 400, 'Укажите корректный номер телефона (только цифры, 10–15 знаков)');
        const phone = normalizePhone(body.phone);
        const taken = store.users.some((item) => item.id !== auth.user.id && item.phone === phone);
        if (taken) return sendError(res, 409, 'Этот номер уже привязан к другому аккаунту');
        body.phone = phone;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'personalChannel')) {
        body.personalChannel = String(body.personalChannel || '').trim().slice(0, 120);
      }
      const hadGeneratedAvatar = isGeneratedOrDefaultAvatar(auth.user.avatar);
      const allowed = ['firstName', 'lastName', 'nickname', 'avatar', 'bio', 'language', 'timezone', 'birthDate', 'socialLinks', 'privacy', 'status', 'phone', 'personalChannel'];
      for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(body, key)) auth.user[key] = body[key];
      }
      // Letter avatars follow the name: regenerate unless the user uploaded a photo.
      const nameChanged = Object.prototype.hasOwnProperty.call(body, 'firstName') || Object.prototype.hasOwnProperty.call(body, 'nickname');
      if (hadGeneratedAvatar && nameChanged && !Object.prototype.hasOwnProperty.call(body, 'avatar')) {
        auth.user.avatar = generateAvatar(auth.user.id, auth.user.firstName || auth.user.nickname);
      }
      log('info', auth.user.id, 'profile.updated', 'Profile updated');
      saveStore(store);
      emitToUser(auth.user.id, 'profile:updated', safeUser(auth.user));
      return sendJson(res, 200, { user: safeUser(auth.user) });
    }

    // Upload a profile photo (image), stored and served publicly at /api/avatars/<name>.
    if (req.method === 'POST' && pathname === '/api/me/avatar') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const contentType = req.headers['content-type'] || '';
      if (!contentType.includes('multipart/form-data')) return sendError(res, 400, 'Ожидается multipart/form-data');
      const raw = await readBuffer(req);
      const parts = parseMultipart(raw, contentType);
      const filePart = parts.find((part) => part.name === 'file' && part.body.length);
      if (!filePart) return sendError(res, 400, 'Файл не передан');
      if (!/^image\//.test(filePart.type || '')) return sendError(res, 400, 'Нужен файл-изображение');
      if (filePart.body.length > 5 * 1024 * 1024) return sendError(res, 413, 'Аватар больше 5 МБ');
      const ext = (sanitizeFileName(filePart.filename || 'avatar.png').match(/\.[a-z0-9]+$/i)?.[0] || '.png').toLowerCase();
      const storedName = `avatar_${auth.user.id}_${crypto.randomBytes(4).toString('hex')}${ext}`;
      ensureDir(UPLOAD_DIR);
      fs.writeFileSync(path.join(UPLOAD_DIR, storedName), filePart.body);
      auth.user.avatar = `/api/avatars/${storedName}`;
      log('info', auth.user.id, 'avatar.uploaded', 'Avatar updated');
      saveStore(store);
      emitToUser(auth.user.id, 'profile:updated', safeUser(auth.user));
      return sendJson(res, 200, { user: safeUser(auth.user) });
    }

    // Public avatar serving (no auth — avatars are not sensitive).
    const avatarMatch = pathname.match(/^\/api\/avatars\/([A-Za-z0-9._-]+)$/);
    if (avatarMatch && req.method === 'GET') {
      const name = avatarMatch[1];
      if (!name.startsWith('avatar_')) return notFound(res);
      const absolute = path.join(UPLOAD_DIR, name);
      if (!absolute.startsWith(UPLOAD_DIR) || !fs.existsSync(absolute)) return notFound(res);
      const ext = path.extname(name).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'public, max-age=86400' });
      return fs.createReadStream(absolute).pipe(res);
    }

    if (req.method === 'PATCH' && pathname === '/api/me/password') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const body = await readJson(req);
      const currentPassword = String(body.currentPassword || '');
      const newPassword = String(body.newPassword || '');
      if (!verifyPassword(currentPassword, auth.user.passwordHash)) {
        return sendError(res, 401, 'Current password is incorrect');
      }
      if (newPassword.length < PASSWORD_MIN_LENGTH) {
        return sendError(res, 400, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
      }
      if (currentPassword === newPassword) {
        return sendError(res, 400, 'New password must be different');
      }
      auth.user.passwordHash = hashPassword(newPassword);
      for (const session of store.sessions.filter((item) => item.userId === auth.user.id && item.id !== auth.session.id && !item.revokedAt)) {
        session.revokedAt = now();
      }
      createNotification(auth.user.id, 'security', 'Password changed', 'All other sessions were revoked.');
      log('warn', auth.user.id, 'password.changed', 'User changed password and revoked other sessions');
      saveStore(store);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'GET' && pathname === '/api/settings') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      store.settings[auth.user.id] ||= defaultSettings();
      return sendJson(res, 200, store.settings[auth.user.id]);
    }

    if (req.method === 'PATCH' && pathname === '/api/settings') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const body = await readJson(req);
      store.settings[auth.user.id] = deepMerge(store.settings[auth.user.id] || defaultSettings(), body);
      log('info', auth.user.id, 'settings.updated', 'Settings updated');
      saveStore(store);
      return sendJson(res, 200, store.settings[auth.user.id]);
    }

    if (req.method === 'GET' && pathname === '/api/sessions') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      return sendJson(res, 200, store.sessions.filter((session) => session.userId === auth.user.id).map((session) => ({
        id: session.id,
        device: session.device,
        ip: session.ip,
        createdAt: session.createdAt,
        lastSeenAt: session.lastSeenAt,
        revokedAt: session.revokedAt,
        current: session.id === auth.session.id
      })));
    }

    const sessionRevokeMatch = pathname.match(/^\/api\/sessions\/([^/]+)$/);
    if (req.method === 'DELETE' && sessionRevokeMatch) {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const session = store.sessions.find((item) => item.id === sessionRevokeMatch[1] && item.userId === auth.user.id);
      if (!session) return notFound(res);
      session.revokedAt = now();
      log('warn', auth.user.id, 'session.revoked', `Session ${session.id} revoked`);
      saveStore(store);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'GET' && pathname === '/api/chats') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      return sendJson(res, 200, listUserChats(auth.user.id));
    }

    if (req.method === 'POST' && pathname === '/api/chats') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const body = await readJson(req);
      const type = ['direct', 'group', 'channel', 'saved'].includes(body.type) ? body.type : 'direct';

      // "Saved Messages" — a personal chat with yourself, one per user.
      if (type === 'saved') {
        const savedChat = getOrCreateSavedChat(auth.user.id);
        saveStore(store);
        return sendJson(res, 200, publicChat(savedChat, auth.user.id));
      }

      const memberIds = Array.from(new Set([auth.user.id, ...(body.memberIds || [])])).filter(getUser);
      if (type === 'direct' && memberIds.length !== 2) return sendError(res, 400, 'Direct chat requires exactly one peer');
      if (type !== 'direct' && !body.title) return sendError(res, 400, 'Title is required');

      if (type === 'direct') {
        const existing = store.chats.find((chat) => chat.type === 'direct' && memberIds.every((memberId) => chat.members.includes(memberId)) && chat.members.length === 2);
        if (existing) return sendJson(res, 200, publicChat(existing, auth.user.id));
      }

      const peer = type === 'direct' ? getUser(memberIds.find((memberId) => memberId !== auth.user.id)) : null;
      const chatId = id('chat');
      const chat = {
        id: chatId,
        type,
        title: type === 'direct' ? userName(peer) : body.title,
        description: body.description || '',
        avatar: body.avatar || (type === 'direct' ? (peer?.avatar || generateAvatar(chatId, userName(peer))) : generateAvatar(chatId, body.title)),
        members: memberIds,
        admins: type === 'direct' ? [] : [auth.user.id],
        ownerId: type === 'direct' ? null : auth.user.id,
        isPublic: Boolean(body.isPublic),
        inviteLink: type === 'direct' ? null : `https://twiftyz.local/invite/${crypto.randomBytes(4).toString('hex')}`,
        pinnedMessageIds: [],
        mutedBy: [],
        archivedBy: [],
        folders: { [auth.user.id]: type === 'channel' ? 'Каналы' : 'Работа' },
        createdAt: now(),
        updatedAt: now(),
        analytics: type === 'channel' ? { views: 0, reactions: 0, subscribersDelta: 0 } : undefined,
        commentsEnabled: type === 'channel' ? Boolean(body.commentsEnabled ?? true) : undefined,
        postAsUser: type === 'channel' ? false : undefined,
        postAsUserAllowed: type === 'channel' ? [] : undefined,
        moderation: type === 'group' ? { autoModeration: Boolean(body.autoModeration), welcomeMessage: body.welcomeMessage || '' } : undefined
      };
      store.chats.push(chat);
      log('info', auth.user.id, 'chat.created', `${type} ${chat.title} created`);
      saveStore(store);
      for (const memberId of chat.members) emitToUser(memberId, 'chat:created', publicChat(chat, memberId));
      return sendJson(res, 201, publicChat(chat, auth.user.id));
    }

    // Join a group/channel by its invite link (full URL or just the code).
    if (req.method === 'POST' && pathname === '/api/chats/join') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const body = await readJson(req);
      const raw = String(body.link || body.code || '').trim();
      const code = raw.split('/').filter(Boolean).pop() || '';
      if (!code) return sendError(res, 400, 'Укажите ссылку-приглашение');
      const chat = store.chats.find((item) => item.inviteLink && item.inviteLink.split('/').filter(Boolean).pop() === code);
      if (!chat || (chat.type !== 'group' && chat.type !== 'channel')) return sendError(res, 404, 'Приглашение недействительно');
      if (chat.members.includes(auth.user.id)) return sendJson(res, 200, publicChat(chat, auth.user.id));
      chat.members.push(auth.user.id);
      chat.updatedAt = now();
      if (chat.analytics) chat.analytics.subscribersDelta = (chat.analytics.subscribersDelta || 0) + 1;
      log('info', auth.user.id, 'chat.joined', `${userName(auth.user)} joined ${chat.title} via invite`);
      saveStore(store);
      emitToUser(auth.user.id, 'chat:created', publicChat(chat, auth.user.id));
      for (const memberId of chat.members) {
        if (memberId !== auth.user.id) emitToUser(memberId, 'chat:updated', publicChat(chat, memberId));
      }
      return sendJson(res, 200, publicChat(chat, auth.user.id));
    }

    const chatStateMatch = pathname.match(/^\/api\/chats\/([^/]+)\/state$/);
    if (chatStateMatch && req.method === 'PATCH') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const chat = getChat(chatStateMatch[1]);
      if (!isChatMember(chat, auth.user.id)) return sendError(res, 403, 'Chat access denied');
      const body = await readJson(req);
      chat.pinnedBy ||= [];
      chat.archivedBy ||= [];
      chat.folders ||= {};
      if (Object.prototype.hasOwnProperty.call(body, 'pinned')) {
        if (body.pinned && !chat.pinnedBy.includes(auth.user.id)) chat.pinnedBy.push(auth.user.id);
        if (!body.pinned) chat.pinnedBy = chat.pinnedBy.filter((id) => id !== auth.user.id);
      }
      if (Object.prototype.hasOwnProperty.call(body, 'archived')) {
        if (body.archived && !chat.archivedBy.includes(auth.user.id)) chat.archivedBy.push(auth.user.id);
        if (!body.archived) chat.archivedBy = chat.archivedBy.filter((id) => id !== auth.user.id);
      }
      if (Object.prototype.hasOwnProperty.call(body, 'folder')) {
        const folder = String(body.folder || '').trim().slice(0, 40);
        if (folder) chat.folders[auth.user.id] = folder;
        else delete chat.folders[auth.user.id];
      }
      if (Object.prototype.hasOwnProperty.call(body, 'muted')) {
        chat.mutedBy ||= [];
        if (body.muted && !chat.mutedBy.includes(auth.user.id)) chat.mutedBy.push(auth.user.id);
        if (!body.muted) chat.mutedBy = chat.mutedBy.filter((memberId) => memberId !== auth.user.id);
      }
      log('info', auth.user.id, 'chat.state.updated', `Chat state updated for ${chat.title}`);
      saveStore(store);
      return sendJson(res, 200, publicChat(chat, auth.user.id));
    }

    // Channel/group management by admins: title, description, post-as-user settings.
    const chatSettingsMatch = pathname.match(/^\/api\/chats\/([^/]+)\/settings$/);
    if (chatSettingsMatch && req.method === 'PATCH') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const chat = getChat(chatSettingsMatch[1]);
      if (!chat) return notFound(res);
      if (!isChatAdmin(chat, auth.user.id)) return sendError(res, 403, 'Только администратор может менять настройки');
      const body = await readJson(req);
      if (Object.prototype.hasOwnProperty.call(body, 'title')) {
        const title = String(body.title || '').trim().slice(0, 80);
        if (title) chat.title = title;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'description')) {
        chat.description = String(body.description || '').trim().slice(0, 300);
      }
      if (chat.type === 'channel') {
        if (Object.prototype.hasOwnProperty.call(body, 'postAsUser')) chat.postAsUser = Boolean(body.postAsUser);
        if (Object.prototype.hasOwnProperty.call(body, 'postAsUserAllowed')) {
          const ids = Array.isArray(body.postAsUserAllowed) ? body.postAsUserAllowed : [];
          chat.postAsUserAllowed = ids.filter((memberId) => chat.members.includes(memberId));
        }
      }
      chat.updatedAt = now();
      log('info', auth.user.id, 'chat.settings.updated', `Settings updated for ${chat.title}`);
      saveStore(store);
      for (const memberId of chat.members) emitToUser(memberId, 'chat:updated', publicChat(chat, memberId));
      return sendJson(res, 200, publicChat(chat, auth.user.id));
    }

    // Leave a group/channel (any member except the owner).
    const chatLeaveMatch = pathname.match(/^\/api\/chats\/([^/]+)\/leave$/);
    if (chatLeaveMatch && req.method === 'POST') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const chat = getChat(chatLeaveMatch[1]);
      if (!isChatMember(chat, auth.user.id)) return sendError(res, 403, 'Chat access denied');
      if (chat.type !== 'group' && chat.type !== 'channel') return sendError(res, 400, 'Покинуть можно только группу или канал');
      if (chat.ownerId === auth.user.id) return sendError(res, 400, 'Владелец не может покинуть — удалите группу/канал');
      chat.members = chat.members.filter((memberId) => memberId !== auth.user.id);
      chat.admins = (chat.admins || []).filter((memberId) => memberId !== auth.user.id);
      if (Array.isArray(chat.postAsUserAllowed)) chat.postAsUserAllowed = chat.postAsUserAllowed.filter((memberId) => memberId !== auth.user.id);
      chat.updatedAt = now();
      log('info', auth.user.id, 'chat.left', `${userName(auth.user)} left ${chat.title}`);
      saveStore(store);
      emitToUser(auth.user.id, 'chat:removed', { id: chat.id });
      for (const memberId of chat.members) emitToUser(memberId, 'chat:updated', publicChat(chat, memberId));
      return sendJson(res, 200, { ok: true });
    }

    // Delete a group/channel entirely (owner only) with its messages and file records.
    const chatDeleteMatch = pathname.match(/^\/api\/chats\/([^/]+)$/);
    if (chatDeleteMatch && req.method === 'DELETE') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const chat = getChat(chatDeleteMatch[1]);
      if (!isChatMember(chat, auth.user.id)) return sendError(res, 403, 'Chat access denied');
      if (chat.type !== 'group' && chat.type !== 'channel') return sendError(res, 400, 'Удалить можно только группу или канал');
      if (chat.ownerId !== auth.user.id) return sendError(res, 403, 'Удалить может только владелец');
      const memberIds = [...chat.members];
      for (const file of store.files.filter((item) => item.chatId === chat.id && item.storedName)) {
        try { fs.unlinkSync(path.join(UPLOAD_DIR, file.storedName)); } catch { /* file may be missing */ }
      }
      store.chats = store.chats.filter((item) => item.id !== chat.id);
      store.messages = store.messages.filter((item) => item.chatId !== chat.id);
      store.files = store.files.filter((item) => item.chatId !== chat.id);
      log('warn', auth.user.id, 'chat.deleted', `${chat.type} ${chat.title} deleted by owner`);
      saveStore(store);
      for (const memberId of memberIds) emitToUser(memberId, 'chat:removed', { id: chat.id });
      return sendJson(res, 200, { ok: true });
    }

    const chatMessagesMatch = pathname.match(/^\/api\/chats\/([^/]+)\/messages$/);
    if (chatMessagesMatch && req.method === 'GET') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const chat = getChat(chatMessagesMatch[1]);
      if (!isChatMember(chat, auth.user.id)) return sendError(res, 403, 'Chat access denied');
      const messages = visibleMessagesForChat(chat.id, auth.user.id).map((message) => publicMessage(message, auth.user.id)).filter(Boolean);
      return sendJson(res, 200, messages);
    }

    if (chatMessagesMatch && req.method === 'POST') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const chat = getChat(chatMessagesMatch[1]);
      if (!isChatMember(chat, auth.user.id)) return sendError(res, 403, 'Chat access denied');
      const body = await readJson(req);
      let displayAs = null;
      if (chat.type === 'channel') {
        const isAdmin = isChatAdmin(chat, auth.user.id);
        const canPostAsUser = Boolean(chat.postAsUser) && (chat.postAsUserAllowed || []).includes(auth.user.id);
        if (!isAdmin && !canPostAsUser) return sendError(res, 403, 'Публиковать в канале могут только администраторы');
        // Default identity is the channel; posting as user requires the feature to be on.
        displayAs = body.postAs === 'user' && chat.postAsUser ? 'user' : 'channel';
      }
      const text = String(body.text || '').trim();
      const attachments = Array.isArray(body.attachments) ? body.attachments : [];
      if (!text && attachments.length === 0) return sendError(res, 400, 'Message text or attachment is required');
      const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
      const message = {
        id: id('msg'),
        chatId: chat.id,
        authorId: auth.user.id,
        displayAs,
        kind: body.kind || (attachments.length ? 'file' : chat.type === 'channel' ? 'post' : 'text'),
        text,
        attachments,
        replyTo: body.replyTo || null,
        formatting: body.formatting || {},
        reactions: {},
        receipts: { [auth.user.id]: 'read' },
        status: scheduledAt && scheduledAt > new Date() ? 'scheduled' : 'sent',
        isPinned: false,
        createdAt: now(),
        scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
        editedAt: null,
        deletedAt: null,
        deletedFor: []
      };
      store.messages.push(message);
      chat.updatedAt = message.createdAt;
      if (attachments.length) {
        for (const attachment of attachments) {
          store.files.push({
            id: attachment.id || id('file'),
            ownerId: auth.user.id,
            chatId: chat.id,
            name: attachment.name,
            type: attachment.type || 'application/octet-stream',
            size: Number(attachment.size || 0),
            scanStatus: attachment.scanStatus || 'pending',
            createdAt: now(),
            url: attachment.url || '#'
          });
        }
      }
      log('info', auth.user.id, 'message.created', `Message sent to ${chat.title}`);
      saveStore(store);
      emitToChat(chat.id, 'message:new', publicMessage(message, null));
      emitChatUpdated(chat);
      return sendJson(res, 201, publicMessage(message, auth.user.id));
    }

    const chatReadMatch = pathname.match(/^\/api\/chats\/([^/]+)\/read$/);
    if (chatReadMatch && req.method === 'POST') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const chat = getChat(chatReadMatch[1]);
      if (!isChatMember(chat, auth.user.id)) return sendError(res, 403, 'Chat access denied');
      for (const message of store.messages.filter((item) => item.chatId === chat.id)) {
        message.receipts ||= {};
        message.receipts[auth.user.id] = 'read';
      }
      chat.manualUnreadBy = (chat.manualUnreadBy || []).filter((memberId) => memberId !== auth.user.id);
      saveStore(store);
      emitToChat(chat.id, 'chat:read', { chatId: chat.id, userId: auth.user.id });
      return sendJson(res, 200, { ok: true });
    }

    // Mark a chat as unread manually (dot without a real new message).
    const chatUnreadMatch = pathname.match(/^\/api\/chats\/([^/]+)\/unread$/);
    if (chatUnreadMatch && req.method === 'POST') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const chat = getChat(chatUnreadMatch[1]);
      if (!isChatMember(chat, auth.user.id)) return sendError(res, 403, 'Chat access denied');
      chat.manualUnreadBy ||= [];
      if (!chat.manualUnreadBy.includes(auth.user.id)) chat.manualUnreadBy.push(auth.user.id);
      saveStore(store);
      return sendJson(res, 200, publicChat(chat, auth.user.id));
    }

    // Clear chat history for the current user only (hides all existing messages).
    const chatClearMatch = pathname.match(/^\/api\/chats\/([^/]+)\/clear$/);
    if (chatClearMatch && req.method === 'POST') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const chat = getChat(chatClearMatch[1]);
      if (!isChatMember(chat, auth.user.id)) return sendError(res, 403, 'Chat access denied');
      for (const message of store.messages.filter((item) => item.chatId === chat.id)) {
        message.deletedFor ||= [];
        if (!message.deletedFor.includes(auth.user.id)) message.deletedFor.push(auth.user.id);
      }
      saveStore(store);
      emitToUser(auth.user.id, 'chat:cleared', { chatId: chat.id });
      return sendJson(res, 200, { ok: true });
    }

    const messageMatch = pathname.match(/^\/api\/messages\/([^/]+)$/);
    if (messageMatch && req.method === 'PATCH') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const message = store.messages.find((item) => item.id === messageMatch[1]);
      if (!message) return notFound(res);
      const chat = getChat(message.chatId);
      if (message.authorId !== auth.user.id && !isChatAdmin(chat, auth.user.id)) return sendError(res, 403, 'Message edit denied');
      const body = await readJson(req);
      if (Object.prototype.hasOwnProperty.call(body, 'text')) message.text = String(body.text || '').trim();
      message.editedAt = now();
      log('info', auth.user.id, 'message.updated', `Message ${message.id} updated`);
      saveStore(store);
      emitToChat(chat.id, 'message:updated', publicMessage(message, null));
      return sendJson(res, 200, publicMessage(message, auth.user.id));
    }

    if (messageMatch && req.method === 'DELETE') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const message = store.messages.find((item) => item.id === messageMatch[1]);
      if (!message) return notFound(res);
      const chat = getChat(message.chatId);
      const scope = url.searchParams.get('scope') || 'self';
      if (scope === 'everyone') {
        // In direct/saved chats either side may delete for everyone (Telegram-style);
        // in groups/channels only the author or an admin.
        const canEveryone = (chat.type === 'direct' || chat.type === 'saved')
          ? isChatMember(chat, auth.user.id)
          : (message.authorId === auth.user.id || isChatAdmin(chat, auth.user.id));
        if (!canEveryone) return sendError(res, 403, 'Message delete denied');
        // Kept in the DB with the original content for the audit trail; hidden from all clients.
        message.deletedAt = now();
        chat.pinnedMessageIds = (chat.pinnedMessageIds || []).filter((id) => id !== message.id);
        emitToChat(chat.id, 'message:deleted', { id: message.id, chatId: chat.id, scope });
      } else {
        message.deletedFor ||= [];
        if (!message.deletedFor.includes(auth.user.id)) message.deletedFor.push(auth.user.id);
        emitToUser(auth.user.id, 'message:deleted', { id: message.id, chatId: chat.id, scope });
      }
      log('warn', auth.user.id, 'message.deleted', `Message ${message.id} deleted with scope ${scope}`);
      saveStore(store);
      return sendJson(res, 200, { ok: true });
    }

    const messageReactionMatch = pathname.match(/^\/api\/messages\/([^/]+)\/reactions$/);
    if (messageReactionMatch && req.method === 'POST') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const message = store.messages.find((item) => item.id === messageReactionMatch[1]);
      if (!message) return notFound(res);
      const chat = getChat(message.chatId);
      if (!isChatMember(chat, auth.user.id)) return sendError(res, 403, 'Chat access denied');
      const body = await readJson(req);
      const emoji = String(body.emoji || '👍').slice(0, 4);
      message.reactions ||= {};
      message.reactions[emoji] ||= [];
      if (message.reactions[emoji].includes(auth.user.id)) {
        message.reactions[emoji] = message.reactions[emoji].filter((id) => id !== auth.user.id);
      } else {
        message.reactions[emoji].push(auth.user.id);
      }
      // A reaction nobody holds disappears from under the message entirely.
      if (message.reactions[emoji].length === 0) delete message.reactions[emoji];
      saveStore(store);
      emitToChat(chat.id, 'message:updated', publicMessage(message, null));
      return sendJson(res, 200, publicMessage(message, auth.user.id));
    }

    const messagePinMatch = pathname.match(/^\/api\/messages\/([^/]+)\/pin$/);
    if (messagePinMatch && req.method === 'POST') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const message = store.messages.find((item) => item.id === messagePinMatch[1]);
      if (!message) return notFound(res);
      const chat = getChat(message.chatId);
      // In direct/saved chats any participant can pin; in groups/channels — admins or the author.
      const canPin = (chat.type === 'direct' || chat.type === 'saved')
        ? isChatMember(chat, auth.user.id)
        : (isChatAdmin(chat, auth.user.id) || message.authorId === auth.user.id);
      if (!canPin) return sendError(res, 403, 'Pin denied');
      message.isPinned = !message.isPinned;
      if (message.isPinned && !chat.pinnedMessageIds.includes(message.id)) chat.pinnedMessageIds.push(message.id);
      if (!message.isPinned) chat.pinnedMessageIds = chat.pinnedMessageIds.filter((id) => id !== message.id);
      saveStore(store);
      // Everyone sees the pin state change live — including the actor's own UI.
      emitToChat(chat.id, 'message:updated', publicMessage(message, null));
      emitChatUpdated(chat);
      return sendJson(res, 200, publicMessage(message, auth.user.id));
    }

    if (req.method === 'GET' && pathname === '/api/contacts') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      return sendJson(res, 200, store.contacts.filter((contact) => contact.ownerId === auth.user.id).map((contact) => ({
        ...contact,
        user: safeUser(getUser(contact.userId))
      })));
    }

    if (req.method === 'POST' && pathname === '/api/contacts') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const body = await readJson(req);
      const user = getUser(body.userId);
      if (!user || user.id === auth.user.id) return sendError(res, 400, 'Valid userId is required');
      let contact = store.contacts.find((item) => item.ownerId === auth.user.id && item.userId === user.id);
      if (!contact) {
        contact = { ownerId: auth.user.id, userId: user.id, favorite: false, blocked: false, tags: [], createdAt: now() };
        store.contacts.push(contact);
      }
      saveStore(store);
      return sendJson(res, 201, { ...contact, user: safeUser(user) });
    }

    const contactMatch = pathname.match(/^\/api\/contacts\/([^/]+)$/);
    if (contactMatch && req.method === 'PATCH') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const contact = store.contacts.find((item) => item.ownerId === auth.user.id && item.userId === contactMatch[1]);
      if (!contact) return notFound(res);
      const body = await readJson(req);
      if (Object.prototype.hasOwnProperty.call(body, 'favorite')) contact.favorite = Boolean(body.favorite);
      if (Object.prototype.hasOwnProperty.call(body, 'blocked')) contact.blocked = Boolean(body.blocked);
      if (Array.isArray(body.tags)) contact.tags = body.tags.slice(0, 10);
      saveStore(store);
      return sendJson(res, 200, { ...contact, user: safeUser(getUser(contact.userId)) });
    }

    if (req.method === 'GET' && pathname === '/api/users/search') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const q = normalizeIdentifier(url.searchParams.get('q'));
      const found = store.users
        .filter((user) => user.id !== auth.user.id && user.id !== SERVICE_USER_ID)
        .filter((user) => !q || [user.firstName, user.lastName, user.nickname, user.email, user.phone].join(' ').toLowerCase().includes(q))
        .slice(0, 20)
        .map(safeUser);
      return sendJson(res, 200, found);
    }

    // Public profile card of a single user.
    const userProfileMatch = pathname.match(/^\/api\/users\/([^/]+)$/);
    if (userProfileMatch && req.method === 'GET') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const user = getUser(userProfileMatch[1]);
      if (!user || user.id === SERVICE_USER_ID) return notFound(res);
      const contact = store.contacts.find((item) => item.ownerId === auth.user.id && item.userId === user.id);
      return sendJson(res, 200, { ...safeUser(user), isContact: Boolean(contact), createdAt: user.createdAt });
    }

    if (req.method === 'GET' && pathname === '/api/link-preview') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const target = url.searchParams.get('url') || '';
      if (!target) return sendError(res, 400, 'url is required');
      if (!linkPreviewCache.has(target)) {
        const preview = await fetchLinkPreview(target);
        linkPreviewCache.set(target, preview || { url: target, title: '', description: '', image: '', site: '' });
        if (linkPreviewCache.size > 500) linkPreviewCache.delete(linkPreviewCache.keys().next().value);
      }
      return sendJson(res, 200, linkPreviewCache.get(target));
    }

    if (req.method === 'GET' && pathname === '/api/search') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const q = normalizeIdentifier(url.searchParams.get('q'));
      const chats = store.chats
        .filter((chat) => isChatMember(chat, auth.user.id))
        .filter((chat) => !q || `${chat.title} ${chat.description}`.toLowerCase().includes(q))
        .map((chat) => publicChat(chat, auth.user.id));
      const messages = store.messages
        .filter((message) => isChatMember(getChat(message.chatId), auth.user.id))
        .filter((message) => !message.deletedFor?.includes(auth.user.id))
        .filter((message) => !q || `${message.text} ${message.attachments?.map((file) => file.name).join(' ')}`.toLowerCase().includes(q))
        .slice(0, 50)
        .map((message) => publicMessage(message, auth.user.id));
      const users = store.users
        .filter((user) => user.id !== auth.user.id)
        .filter((user) => !q || [user.firstName, user.lastName, user.nickname, user.email].join(' ').toLowerCase().includes(q))
        .slice(0, 20)
        .map(safeUser);
      const files = store.files
        .filter((file) => isChatMember(getChat(file.chatId), auth.user.id))
        .filter((file) => !q || file.name.toLowerCase().includes(q))
        .slice(0, 20);
      return sendJson(res, 200, { chats, messages, users, files });
    }

    if (req.method === 'GET' && pathname === '/api/notifications') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      return sendJson(res, 200, store.notifications.filter((item) => item.userId === auth.user.id));
    }

    if (req.method === 'PATCH' && pathname === '/api/notifications') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const body = await readJson(req);
      for (const notification of store.notifications.filter((item) => item.userId === auth.user.id)) {
        if (!body.id || notification.id === body.id) notification.read = true;
      }
      saveStore(store);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && pathname === '/api/files') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('multipart/form-data')) {
        const raw = await readBuffer(req);
        const parts = parseMultipart(raw, contentType);
        const filePart = parts.find((part) => part.name === 'file' && part.body.length);
        if (!filePart) return sendError(res, 400, 'File field is required');
        if (filePart.body.length > MAX_UPLOAD_BYTES) return sendError(res, 413, 'File is too large');
        const chatId = parts.find((part) => part.name === 'chatId')?.body.toString('utf8').trim() || null;
        if (chatId) {
          const chat = getChat(chatId);
          if (!isChatMember(chat, auth.user.id)) return sendError(res, 403, 'Chat access denied');
        }
        const fileId = id('file');
        const originalName = sanitizeFileName(filePart.filename || 'upload.bin');
        const storedName = `${fileId}_${originalName}`;
        ensureDir(UPLOAD_DIR);
        fs.writeFileSync(path.join(UPLOAD_DIR, storedName), filePart.body);
        const file = {
          id: fileId,
          ownerId: auth.user.id,
          chatId,
          name: originalName,
          storedName,
          type: filePart.type || 'application/octet-stream',
          size: filePart.body.length,
          scanStatus: 'clean',
          progress: 100,
          createdAt: now(),
          url: `/api/files/${fileId}/download`
        };
        store.files.push(file);
        log('info', auth.user.id, 'file.uploaded', `Uploaded ${originalName}`, { fileId, chatId });
        saveStore(store);
        return sendJson(res, 201, file);
      }

      const body = await readJson(req);
      if (!body.name) return sendError(res, 400, 'File name is required');
      const file = {
        id: id('file'),
        ownerId: auth.user.id,
        chatId: body.chatId || null,
        name: String(body.name),
        type: String(body.type || 'application/octet-stream'),
        size: Number(body.size || 0),
        scanStatus: 'clean',
        progress: 100,
        createdAt: now(),
        url: '#'
      };
      store.files.push(file);
      saveStore(store);
      return sendJson(res, 201, file);
    }

    const fileDownloadMatch = pathname.match(/^\/api\/files\/([^/]+)\/download$/);
    if (req.method === 'GET' && fileDownloadMatch) {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const file = store.files.find((item) => item.id === fileDownloadMatch[1]);
      if (!file) return notFound(res);
      const chat = file.chatId ? getChat(file.chatId) : null;
      if (file.ownerId !== auth.user.id && (!chat || !isChatMember(chat, auth.user.id))) {
        return sendError(res, 403, 'File access denied');
      }
      if (!file.storedName) return sendError(res, 404, 'File binary is not available');
      const absolute = path.join(UPLOAD_DIR, file.storedName);
      if (!absolute.startsWith(UPLOAD_DIR) || !fs.existsSync(absolute)) return sendError(res, 404, 'File binary is missing');
      const fallbackName = sanitizeFileName(file.name).replace(/[^\x20-\x7e]/g, '_');
      res.writeHead(200, {
        'Content-Type': file.type || 'application/octet-stream',
        'Content-Length': file.size,
        'Content-Disposition': `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        'Cache-Control': 'private, max-age=60'
      });
      fs.createReadStream(absolute).pipe(res);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/calls/start') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const body = await readJson(req);
      const chat = getChat(body.chatId);
      if (!isChatMember(chat, auth.user.id)) return sendError(res, 403, 'Chat access denied');
      const call = {
        id: id('call'),
        chatId: chat.id,
        type: body.type === 'video' ? 'video' : 'voice',
        status: 'active',
        participants: Array.from(new Set([auth.user.id, ...(body.participants || chat.members)])),
        startedBy: auth.user.id,
        startedAt: now(),
        endedAt: null,
        quality: body.type === 'video' ? 'Full HD' : 'HD',
        encrypted: true,
        recording: Boolean(body.recording)
      };
      store.calls.unshift(call);
      log('info', auth.user.id, 'call.started', `${call.type} call started in ${chat.title}`);
      saveStore(store);
      emitToChat(chat.id, 'call:started', call);
      return sendJson(res, 201, call);
    }

    const callEndMatch = pathname.match(/^\/api\/calls\/([^/]+)\/end$/);
    if (callEndMatch && req.method === 'POST') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const call = store.calls.find((item) => item.id === callEndMatch[1]);
      if (!call || !call.participants.includes(auth.user.id)) return notFound(res);
      call.status = 'ended';
      call.endedAt = now();
      saveStore(store);
      emitToChat(call.chatId, 'call:ended', call);
      return sendJson(res, 200, call);
    }

    if (req.method === 'GET' && pathname === '/api/admin/summary') {
      const auth = requireAdmin(req, res);
      if (!auth) return;
      return sendJson(res, 200, adminSummary());
    }

    if (req.method === 'GET' && pathname === '/api/admin/logs') {
      const auth = requireAdmin(req, res);
      if (!auth) return;
      return sendJson(res, 200, store.logs.slice(0, 100));
    }

    const adminUserMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (adminUserMatch && req.method === 'PATCH') {
      const auth = requireAdmin(req, res);
      if (!auth) return;
      const user = getUser(adminUserMatch[1]);
      if (!user) return notFound(res);
      const body = await readJson(req);
      if (Object.prototype.hasOwnProperty.call(body, 'status')) user.status = body.status;
      if (Object.prototype.hasOwnProperty.call(body, 'role')) user.role = body.role === 'admin' ? 'admin' : 'user';
      log('warn', auth.user.id, 'admin.user.updated', `Admin updated ${user.id}`);
      saveStore(store);
      emitToUser(user.id, 'profile:updated', safeUser(user));
      return sendJson(res, 200, safeUser(user));
    }

    notFound(res);
  } catch (error) {
    const status = error.status || 500;
    sendError(res, status, error.message || 'Internal server error');
  }
}

function deepMerge(target, source) {
  const result = Array.isArray(target) ? [...target] : { ...target };
  for (const [key, value] of Object.entries(source || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = deepMerge(result[key] || {}, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function serveStatic(req, res, url) {
  let filePath = decodeURIComponent(url.pathname);
  if (filePath === '/') filePath = '/index.html';
  const absolute = path.normalize(path.join(PUBLIC_DIR, filePath));
  if (!absolute.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(absolute, (error, data) => {
    if (error) {
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (fallbackError, fallbackData) => {
        if (fallbackError) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': MIME['.html'] });
        res.end(fallbackData);
      });
      return;
    }
    const ext = path.extname(absolute).toLowerCase();
    // App code (js/css/html) must not be cached — users were getting stale UI
    // for up to an hour after deploys. Static assets (avatars, logo) may cache.
    const isAsset = absolute.startsWith(path.join(PUBLIC_DIR, 'assets'));
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': isAsset ? 'public, max-age=3600' : 'no-cache'
    });
    res.end(data);
  });
}

function sendWs(client, type, payload) {
  if (client.socket.destroyed) return;
  const body = Buffer.from(JSON.stringify({ type, payload, ts: now() }), 'utf8');
  let header;
  if (body.length < 126) {
    header = Buffer.from([0x81, body.length]);
  } else if (body.length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(body.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(body.length), 2);
  }
  client.socket.write(Buffer.concat([header, body]));
}

function emitToUser(userId, type, payload) {
  const clients = wsByUser.get(userId);
  if (!clients) return;
  for (const client of clients) sendWs(client, type, payload);
}

function emitToChat(chatId, type, payload) {
  const chat = getChat(chatId);
  if (!chat) return;
  for (const memberId of chat.members) emitToUser(memberId, type, payload);
}

// chat:updated carries per-viewer fields (unread, isPinnedByMe, folder) —
// each member must get their own serialization, not the sender's.
function emitChatUpdated(chat) {
  for (const memberId of chat.members) emitToUser(memberId, 'chat:updated', publicChat(chat, memberId));
}

function addWsClient(socket, user, session) {
  const client = { socket, userId: user.id, sessionId: session.id, buffer: Buffer.alloc(0) };
  wsClients.add(client);
  if (!wsByUser.has(user.id)) wsByUser.set(user.id, new Set());
  wsByUser.get(user.id).add(client);

  sendWs(client, 'connection:ready', { user: safeUser(user), serverTime: now() });
  for (const chat of store.chats.filter((item) => item.members.includes(user.id))) {
    emitToChat(chat.id, 'presence:update', { userId: user.id, status: 'online', chatId: chat.id });
  }

  socket.on('data', (chunk) => {
    client.buffer = Buffer.concat([client.buffer, chunk]);
    const frames = parseWsFrames(client);
    for (const frame of frames) handleWsMessage(client, frame);
  });

  socket.on('close', () => removeWsClient(client));
  socket.on('error', () => removeWsClient(client));
}

function removeWsClient(client) {
  if (!wsClients.has(client)) return;
  wsClients.delete(client);
  const clients = wsByUser.get(client.userId);
  if (clients) {
    clients.delete(client);
    if (!clients.size) wsByUser.delete(client.userId);
  }
  const user = getUser(client.userId);
  if (user && !wsByUser.has(client.userId)) {
    user.status = 'offline';
    user.lastSeenAt = now();
    for (const chat of store.chats.filter((item) => item.members.includes(user.id))) {
      emitToChat(chat.id, 'presence:update', { userId: user.id, status: 'offline', chatId: chat.id, lastSeenAt: user.lastSeenAt });
    }
    saveStore(store);
  }
}

function parseWsFrames(client) {
  const frames = [];
  let offset = 0;
  const buffer = client.buffer;
  while (offset + 2 <= buffer.length) {
    const byte1 = buffer[offset];
    const byte2 = buffer[offset + 1];
    const opcode = byte1 & 0x0f;
    const masked = (byte2 & 0x80) === 0x80;
    let length = byte2 & 0x7f;
    let headerLength = 2;
    if (length === 126) {
      if (offset + 4 > buffer.length) break;
      length = buffer.readUInt16BE(offset + 2);
      headerLength = 4;
    } else if (length === 127) {
      if (offset + 10 > buffer.length) break;
      length = Number(buffer.readBigUInt64BE(offset + 2));
      headerLength = 10;
    }
    const maskLength = masked ? 4 : 0;
    const frameEnd = offset + headerLength + maskLength + length;
    if (frameEnd > buffer.length) break;
    if (opcode === 0x8) {
      client.socket.end();
      offset = frameEnd;
      continue;
    }
    if (opcode === 0x9) {
      client.socket.write(Buffer.from([0x8a, 0x00]));
      offset = frameEnd;
      continue;
    }
    let payload = buffer.subarray(offset + headerLength + maskLength, frameEnd);
    if (masked) {
      const mask = buffer.subarray(offset + headerLength, offset + headerLength + 4);
      payload = Buffer.from(payload.map((byte, index) => byte ^ mask[index % 4]));
    }
    if (opcode === 0x1) frames.push(payload.toString('utf8'));
    offset = frameEnd;
  }
  client.buffer = buffer.subarray(offset);
  return frames;
}

function handleWsMessage(client, raw) {
  let message;
  try {
    message = JSON.parse(raw);
  } catch {
    return sendWs(client, 'error', { message: 'Invalid WebSocket JSON' });
  }
  const user = getUser(client.userId);
  if (!user) return;
  if (message.type === 'typing') {
    const chat = getChat(message.chatId);
    if (isChatMember(chat, user.id)) {
      emitToChat(chat.id, 'typing:update', {
        chatId: chat.id,
        userId: user.id,
        isTyping: Boolean(message.isTyping)
      });
    }
    return;
  }
  if (message.type === 'presence') {
    user.status = message.status || 'online';
    user.lastSeenAt = now();
    for (const chat of store.chats.filter((item) => item.members.includes(user.id))) {
      emitToChat(chat.id, 'presence:update', { userId: user.id, status: user.status, chatId: chat.id });
    }
    saveStore(store);
    return;
  }
  sendWs(client, 'error', { message: `Unsupported event ${message.type}` });
}

function handleUpgrade(req, socket) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname !== '/ws') {
    socket.destroy();
    return;
  }
  const bearer = url.searchParams.get('token') || '';
  const session = store.sessions.find((item) => item.token === bearer && !item.revokedAt);
  const user = session ? getUser(session.userId) : null;
  if (!session || !user) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }
  const accept = crypto.createHash('sha1').update(`${key}${WS_GUID}`).digest('base64');
  socket.write([
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${accept}`,
    '\r\n'
  ].join('\r\n'));
  addWsClient(socket, user, session);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (url.pathname.startsWith('/api/')) {
    handleApi(req, res, url);
    return;
  }
  serveStatic(req, res, url);
});

server.on('upgrade', handleUpgrade);

server.listen(PORT, () => {
  console.log(`Twiftyz Messenger is running on http://127.0.0.1:${PORT}`);
});
