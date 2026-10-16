# Деплой Twiftyz Messenger на reg.ru

Проекту нужны: постоянный Node.js-процесс (18+), WebSocket, диск для `data/` и `uploads/`.

## Шаг 0. Проверьте, есть ли Node.js на вашем тарифе

1. Зайдите в **ISPmanager** вашего хостинга.
2. Откройте **Сайты → Создать сайт** (или свойства существующего).
3. В поле **«Обработчик» (Handler)** посмотрите список: есть ли там **Node.js**.

- **Есть Node.js** → идите по Сценарию A.
- **Нет** → на этом тарифе Node-приложение не запустить. Варианты: сменить тариф на поддерживающий Node.js или взять «Облачный сервер» reg.ru (дешёвый VPS) — Сценарий B, он же надёжнее для WebSocket.

## Сценарий A: виртуальный хостинг с Node.js (Passenger)

1. **Создайте сайт** в ISPmanager: домен `twiftyz.ru`, обработчик **Node.js**.
2. **Залейте файлы** в корень сайта (через «Менеджер файлов» ISPmanager или SFTP):
   - `server.js`, `package.json`
   - папку `public/` целиком (включая `assets/avatars`, `assets/logo`)
   - папки `data/` и `uploads/` можно не заливать — создадутся сами (но проверьте права на запись).
3. В настройках сайта укажите **файл запуска**: `server.js`.
4. **Переменные окружения** (в ISPmanager: настройки сайта → переменные окружения):

   ```
   SMTP_HOST=mail.hosting.reg.ru
   SMTP_PORT=465
   SMTP_USER=no-reply@twiftyz.ru
   SMTP_PASS=<пароль ящика>
   MAIL_FROM=no-reply@twiftyz.ru
   MAIL_FROM_NAME=Twiftyz
   ```

   `PORT` задаст сам Passenger — сервер его читает автоматически.
5. **SSL**: в ISPmanager → SSL-сертификаты → выпустить **Let's Encrypt** для twiftyz.ru и включить редирект на https.
6. **Проверка**: откройте `https://twiftyz.ru` — вход, отправьте сообщение.
   Критичный тест — **WebSocket**: откройте два браузера и проверьте, что сообщение из одного мгновенно приходит в другой. Если сообщения появляются только после обновления страницы — WebSocket через Passenger не проходит, переходите на Сценарий B.

## Сценарий B: VPS / «Облачный сервер» reg.ru (рекомендуется)

Подойдёт минимальный тариф (1 CPU / 1 ГБ RAM), Ubuntu 22.04/24.04.

```bash
# 1. Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs nginx

# 2. Код (загрузите scp/sftp в /opt/twiftyz)
sudo mkdir -p /opt/twiftyz && cd /opt/twiftyz
# ... залить server.js, package.json, public/

# 3. systemd-сервис
sudo tee /etc/systemd/system/twiftyz.service > /dev/null <<'EOF'
[Unit]
Description=Twiftyz Messenger
After=network.target

[Service]
WorkingDirectory=/opt/twiftyz
ExecStart=/usr/bin/node server.js
Restart=always
Environment=PORT=5174
Environment=SMTP_HOST=mail.hosting.reg.ru
Environment=SMTP_PORT=465
Environment=SMTP_USER=no-reply@twiftyz.ru
Environment=SMTP_PASS=ПАРОЛЬ_ЯЩИКА
Environment=MAIL_FROM=no-reply@twiftyz.ru
Environment=MAIL_FROM_NAME=Twiftyz

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl enable --now twiftyz

# 4. nginx reverse proxy c WebSocket
sudo tee /etc/nginx/sites-available/twiftyz > /dev/null <<'EOF'
server {
    server_name twiftyz.ru www.twiftyz.ru;
    client_max_body_size 30m;

    location / {
        proxy_pass http://127.0.0.1:5174;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 600s;
    }
}
EOF
sudo ln -s /etc/nginx/sites-available/twiftyz /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 5. SSL (Let's Encrypt)
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d twiftyz.ru -d www.twiftyz.ru
```

DNS: A-запись `twiftyz.ru` (и `www`) → IP сервера. Почтовые записи (MX, SPF, DKIM) не трогать — почта остаётся на хостинге reg.ru.

## После деплоя (любой сценарий)

- Проверить регистрацию с реальным email (код должен прийти письмом).
- Проверить WebSocket с двух устройств.
- Настроить резервную копию `data/store.json` и `uploads/` (cron или бэкапы панели).
