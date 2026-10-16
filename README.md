# Twiftyz Messenger

Рабочий локальный мессенджер: Node.js backend, REST API, native WebSocket realtime, аккаунты с паролями, пользовательские сессии, личные чаты, группы, каналы и web-клиент без внешних зависимостей.

## Запуск

```bash
npm start
```

Открыть:

```text
http://127.0.0.1:5174
```

Демо-админ:

```text
login: demo@twiftyz.local
password: demo12345
```

## Подтверждение по коду на почту

Вход по одноразовому коду (`/api/auth/start` → `/api/auth/verify`) отправляет 6-значный
код на email. Реализация **без npm-зависимостей** (встроенные модули `tls` / `https`) и
поддерживает два транспорта:

- **`smtp`** — почта вашего домена (reg.ru / ISPmanager и любой другой SMTP) по SSL, порт 465. Рекомендуется.
- **`brevo`** — Brevo Transactional API (если SMTP недоступен).

Транспорт выбирается автоматически: задан `SMTP_HOST` → SMTP, иначе задан `BREVO_API_KEY` → Brevo.

### Вариант 1. SMTP домена (reg.ru, почта для twiftyz.ru)

1. В панели **ISPmanager** (Почта → Почтовые ящики) создайте ящик, например `no-reply@twiftyz.ru`.
2. Узнайте SMTP-хост и порт (раздел настроек почтового клиента в ISPmanager). Обычно SSL-порт **465**.
3. Запустите сервер с переменными окружения (логин SMTP — это полный адрес ящика):

```bash
# Git Bash / Linux / macOS
SMTP_HOST=mail.hosting.reg.ru SMTP_PORT=465 \
SMTP_USER="no-reply@twiftyz.ru" SMTP_PASS="пароль_ящика" \
MAIL_FROM="no-reply@twiftyz.ru" MAIL_FROM_NAME="Twiftyz" npm start
```

```bat
:: Windows cmd.exe
set SMTP_HOST=mail.hosting.reg.ru
set SMTP_PORT=465
set SMTP_USER=no-reply@twiftyz.ru
set SMTP_PASS=пароль_ящика
set MAIL_FROM=no-reply@twiftyz.ru
set MAIL_FROM_NAME=Twiftyz
npm start
```

> Точный `SMTP_HOST` берите из ISPmanager — он зависит от сервера, на котором заведён домен
> (для reg.ru обычно `mail.hosting.reg.ru`, порт 465).
> Реализован транспорт для **порта 465 (implicit SSL)**; если в панели только 587 (STARTTLS) —
> нужно добавить поддержку STARTTLS.

#### Обязательно: DNS-записи домена (иначе письма отклоняются)

reg.ru примет письмо (`250`), но почта получателя (mail.ru, gmail и т.д.) **отклонит**
его с ошибкой `550 non-local sender verification failed`, пока для домена не настроены
SPF/DKIM/DMARC. Добавьте в DNS-зону `twiftyz.ru`:

- **SPF** — TXT на `@`: `v=spf1 redirect=_spf.hosting.reg.ru`
- **DKIM** — включить в ISPmanager (Почта → домен → DKIM); запись добавится автоматически.
- **DMARC** — TXT на `_dmarc`: `v=DMARC1; p=none; rua=mailto:no-reply@twiftyz.ru`

Проверка: `nslookup -type=txt twiftyz.ru` и сервис https://mail-tester.com (оценка 0–10).
Распространение DNS — от 15 минут до нескольких часов.

### Вариант 2. Brevo (HTTP API)

```bash
BREVO_API_KEY=xkeysib-xxxx MAIL_FROM="no-reply@twiftyz.ru" MAIL_FROM_NAME="Twiftyz" npm start
```

### Dev-режим (без настройки почты)

Если ни `SMTP_HOST`, ни `BREVO_API_KEY` не заданы — сервер не шлёт писем и возвращает код
прямо в ответе API (`devCode`). Удобно для локального демо.

### Безопасность кода

TTL 10 минут, один активный код на адрес, кулдаун 45 секунд между запросами (анти-спам),
максимум 5 попыток ввода (после — код гасится). При успешном подтверждении проставляется
`emailVerifiedAt` / `phoneVerifiedAt`.

Можно зарегистрировать новые аккаунты прямо на экране входа. После регистрации пользователь получает свою сессию, может найти другого пользователя по email/телефону/никнейму, добавить контакт, открыть личный чат и отправлять сообщения через WebSocket.

## Проверка

```bash
npm run check
node --check public/app.js
```

Пример API-проверки логина:

```bash
curl -X POST http://127.0.0.1:5174/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"identifier\":\"demo@twiftyz.local\",\"password\":\"demo12345\"}"
```

## Что уже стало ближе к реальному мессенджеру

- Двухшаговая регистрация: форма → 6-значный код на email → аккаунт (`emailVerifiedAt`).
- Вход = пароль + код подтверждения (всегда). Код приходит **сообщением в служебный чат «Twiftyz»**, если есть активная сессия; иначе — экран восстановления (email+телефон+никнейм) → код на почту.
- Сброс пароля по коду на email (с отзывом всех активных сессий).
- Редактирование и удаление сообщений прямо в интерфейсе.
- Создание каналов из UI (публикуют только админы) и групп с выбором участников.
- Инвайты по ссылке: показ и копирование ссылки в инспекторе, вступление в группу/канал по ссылке.
- Превью ссылок (OpenGraph) под сообщениями — серверный `/api/link-preview`, zero-dependency.
- Инлайн-показ картинок-вложений прямо в чате.
- Звонки временно отложены: кнопка показывает модалку «в разработке».
- Пароли хранятся как `scrypt` hash + salt, открытый пароль не сохраняется.
- Bearer-сессии, список устройств, отзыв сессии и logout на сервере.
- Смена пароля с проверкой текущего пароля и отзывом остальных сессий.
- Миграция старых demo-пользователей на пароль `demo12345`.
- Поиск пользователей в интерфейсе без `prompt`, добавление контакта и создание direct chat между реальными аккаунтами.
- Отправка сообщений, реакции, ответы, закрепы, прочтение, typing и presence.
- Контакты: добавление, избранное, блокировка.
- Группы и каналы с ролями участников.
- Современный responsive UI: единая дизайн-система на CSS-переменных, rail + список чатов + диалог + инспектор, bubbles, composer, карточки и mobile layout.
- Тёмная и светлая темы с автоопределением системной (`prefers-color-scheme`), мгновенным переключением и без мигания при загрузке.
- Фильтры чатов, пользовательское закрепление чатов, архив и папка чата.
- Реальная загрузка файлов через multipart upload в локальное `uploads/`, скачивание с проверкой доступа и отправка вложений в сообщения.
- Голосовые и видео-звонки как signaling-ready модель.
- Уведомления и security notifications.
- Админ-сводка для demo-admin.

## Основные API

- `POST /api/auth/register` → `POST /api/auth/register/verify` (регистрация с кодом на email)
- `POST /api/auth/login` → `POST /api/auth/login/verify` (пароль + код)
- `POST /api/auth/recover` (восстановление: email+телефон+никнейм → код на почту)
- `POST /api/auth/password/reset/start` → `POST /api/auth/password/reset/verify` (сброс пароля по коду)
- `POST /api/chats/join` (вступление в группу/канал по ссылке-приглашению)
- `GET /api/link-preview?url=` (OpenGraph-превью ссылок)
- `POST /api/auth/logout`
- `GET /api/bootstrap`
- `GET/PATCH /api/me`
- `PATCH /api/me/password`
- `GET/PATCH /api/settings`
- `GET /api/sessions`
- `DELETE /api/sessions/:id`
- `GET/POST /api/chats`
- `PATCH /api/chats/:id/state`
- `GET/POST /api/chats/:id/messages`
- `GET/POST /api/contacts`
- `GET /api/users/search`
- `GET /api/search`
- `POST /api/files`
- `GET /api/files/:id/download`
- `POST /api/calls/start`
- `GET /api/admin/summary`

## Структура

```text
server.js              REST API, WebSocket, static server, JSON storage
public/index.html      Web shell
public/app.js          Client state, API calls, realtime handlers
public/styles.css      Responsive messenger UI
public/assets/*.png    Локальные bitmap-аватары
data/store.json        Runtime-хранилище, создается автоматически
uploads/               Runtime-хранилище загруженных файлов
docs/architecture.md   Архитектура и план production-перехода
docs/spec-gap.md       Сверка ТЗ с текущей реализацией (чек-лист)
```

## Ограничения текущей версии

Это все еще локальная реализация, не production-кластер. Нет PostgreSQL, Redis, S3, push-провайдеров, TURN/STUN, TLS reverse proxy и мобильных/desktop-клиентов. Следующие реальные шаги: вынести JSON в PostgreSQL, добавить Redis для presence/sessions, заменить локальное `uploads/` на S3-compatible storage и реализовать WebRTC signaling для звонков.
