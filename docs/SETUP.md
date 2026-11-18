# Установка и запуск GM Table

Полное руководство: от чистого сервера до играбельной комнаты.

## 📋 Требования

### Обязательно

| Инструмент | Версия | Зачем |
|---|---|---|
| **Node.js** | 20+ (рекомендую 22+) | Сервер и клиент |
| **pnpm** | 9+ | Пакетный менеджер (монорепа) |
| **Docker** | 24+ | Postgres |
| **Docker Compose** | V2+ | Оркестрация |
| **Git** | любая | Клонирование |

### Проверка

```bash
node -v          # v22.x.x
pnpm -v          # 9.x.x
docker -v        # 24.x.x
docker compose version  # v2.x.x
Если чего-то нет
Node.js — через nvm или Volta.

pnpm — corepack enable (встроен в Node 16+), или npm i -g pnpm.

Docker — docs.docker.com/engine/install.

📁 Структура после установки
text
gm-table/
├── client/          # React-приложение
├── server/          # Fastify-сервер
├── shared/          # Общие типы и константы
├── docs/            # Документация
├── docker/          # Docker-конфиги
├── uploads/         # (создастся) загруженные файлы
├── .env             # Локальные переменные (не в git)
├── .env.example     # Шаблон
├── docker-compose.yml
└── package.json
🚀 Установка
Шаг 1: Клонирование
bash
git clone <repo-url> gm-table
cd gm-table
Шаг 2: Установка зависимостей
bash
pnpm install
Установит зависимости для всех воркспейсов (root, client, server, shared). Может занять 2–3 минуты.

Шаг 3: Настройка окружения
Скопируй шаблон:

bash
cp .env.example .env
Открой .env и проверь/настрой:

bash
# === Общие ===
NODE_ENV=development
LOG_LEVEL=debug

# === Server ===
SERVER_PORT=40305
SERVER_HOST=0.0.0.0
CORS_ORIGINS=http://localhost:40310,http://192.168.1.100:40310

# === Client ===
CLIENT_PORT=40310
VITE_API_URL=http://localhost:40305
VITE_WS_URL=http://localhost:40305

# === Database ===
POSTGRES_USER=gm_table
POSTGRES_PASSWORD=<твой_пароль>
POSTGRES_DB=gm_table
POSTGRES_PORT=5432
POSTGRES_DATA_DIR=/home/<user>/gm-table-data/postgres
DATABASE_URL=postgresql://gm_table:<твой_пароль>@localhost:5432/gm_table

# === JWT ===
JWT_SECRET=<сгенерируй_ниже>
JWT_EXPIRES_IN=30d

# === Uploads ===
UPLOAD_DIR=./uploads
UPLOAD_MAX_SIZE_MB=5
Шаг 4: Генерация JWT_SECRET
bash
openssl rand -base64 64
Скопируй результат и вставь в .env в JWT_SECRET.

Шаг 5: Папка для данных Postgres
Создай вне проекта (чтобы данные не попадали в git):

bash
mkdir -p /home/<user>/gm-table-data/postgres
sudo chown -R 999:999 /home/<user>/gm-table-data/postgres
Почему 999: внутри контейнера Postgres работает под UID 999 (postgres).

Шаг 6: Запуск Postgres
bash
docker compose up -d postgres
Проверь:

bash
docker ps
Должен быть контейнер gm-table-postgres со статусом healthy.

Если unhealthy:

bash
docker compose logs postgres
Шаг 7: Миграции БД
Сначала собери shared:

bash
pnpm --filter @gm-table/shared build
Потом примени миграции:

bash
pnpm db:migrate
Проверь таблицы:

bash
docker exec -it gm-table-postgres psql -U gm_table -d gm_table -c "\dt"
Должны быть:

users, rooms, room_members

scenes, tokens

asset_folders, assets

statuses_library

room_state, action_requests

messages

_prisma_migrations

Шаг 8: Запуск приложения
Терминал 1 — сервер:

bash
pnpm dev:server
Ожидаемый вывод:

text
Server listening on http://0.0.0.0:40305
Socket.IO registered
Drawings cron started
Markers cron started
Online statuses reset
Терминал 2 — клиент:

bash
pnpm dev:client
Ожидаемый вывод:

text
VITE ready in 500ms
➜ Local:   http://localhost:40310/
Шаг 9: Открой в браузере
text
http://localhost:40310
Что должно быть:

Форма входа (email).

После ввода — Lobby.

Кнопка «+» → создание комнаты.

🎮 Первый запуск
Введи email → аккаунт создастся автоматически.

Создай комнату → получишь короткий shortId.

Пригласи друзей → поделись shortId.

Создай сцену (нужен фон).

Создай персонажа — модалка появится автоматически.

Играйте!

🔧 Скрипты
Root
Команда	Что делает
pnpm dev	Параллельный запуск клиента и сервера
pnpm dev:client	Только клиент
pnpm dev:server	Только сервер
pnpm build	Сборка всех пакетов
pnpm lint	ESLint
pnpm typecheck	Проверка типов
pnpm format	Prettier
pnpm db:migrate	Prisma migrate dev
pnpm db:studio	Prisma Studio (GUI для БД)
pnpm clean	Удалить node_modules
Отдельные пакеты
Сборка shared (после изменений в shared):

bash
pnpm --filter @gm-table/shared build
Typecheck сервера:

bash
pnpm --filter @gm-table/server typecheck
Typecheck клиента:

bash
pnpm --filter @gm-table/client typecheck
🐳 Docker
Postgres
bash
docker compose up -d postgres   # Запуск
docker compose stop postgres    # Стоп
docker compose down postgres    # Стоп + удалить контейнер
docker compose logs postgres    # Логи
Полный стек (позже — когда будет Dockerfile для клиента/сервера)
bash
docker compose up -d
🗄 Работа с БД
Prisma Studio (GUI)
bash
pnpm db:studio
Откроет http://localhost:5555.

Прямой доступ через psql
bash
docker exec -it gm-table-postgres psql -U gm_table -d gm_table
Сброс БД
bash
pnpm --filter @gm-table/server exec prisma migrate reset
Удалит всё, применит миграции заново. Используй с осторожностью.

Бэкап
bash
docker exec gm-table-postgres pg_dump -U gm_table gm_table > backup.sql
Восстановление
bash
cat backup.sql | docker exec -i gm-table-postgres psql -U gm_table -d gm_table
🐛 Troubleshooting
Cannot connect to database / P1001
Причины:

Postgres не запущен.

Неверный DATABASE_URL.

Проверь:

bash
docker ps
docker compose logs postgres
Убедись, что DATABASE_URL в .env:

localhost (не 127.0.0.1).

Правильный порт.

Правильный пароль (URL-encoded: + → %2B, = → %3D).

Environment variable not found: DATABASE_URL
Prisma ищет .env в server/. Решение — симлинк:

bash
ln -s ../.env server/.env
JWT_SECRET must be at least 32 characters
Причина: JWT_SECRET в .env короче 32 символов.

Решение:

bash
openssl rand -base64 64
Вставить в .env.

EADDRINUSE: address already in use :::40305
Причина: порт занят.

Решение: убить процесс:

bash
lsof -i :40305
kill <PID>
Или сменить порт в .env.

CORS-ошибка в браузере
Причина: CORS_ORIGINS в .env не совпадает с origin клиента.

Пример: клиент на http://192.168.1.100:40310, а в CORS_ORIGINS — http://localhost:40310.

Решение: добавь оба origin в CORS_ORIGINS (через запятую).

initdb: error: directory exists but is not empty
Причина: в папке POSTGRES_DATA_DIR уже есть файлы (не от Postgres).

Решение:

bash
docker compose down postgres
sudo rm -rf /home/<user>/gm-table-data/postgres/*
sudo chown -R 999:999 /home/<user>/gm-table-data/postgres
docker compose up -d postgres
Клиент не подключается к WebSocket
Проверь:

VITE_WS_URL в .env клиента (client/.env).

Сервер запущен.

В DevTools → Network → WS есть соединение.

Файлы не загружаются
Проверь:

Папка uploads/ существует.

Права на запись.

UPLOAD_MAX_SIZE_MB — не меньше размера файла.

Тип файла — PNG / JPEG / WebP / GIF.

Временные рисунки не исчезают
Причина: cron не работает.

Проверь логи сервера:

text
Drawings cron started
Markers cron started
Если нет — проверь server/src/index.ts — cron должен запускаться после registerWebSocket.

Игрок «зависает» в онлайне после закрытия вкладки
Причина: disconnecting не сработал.

Проверь логи:

text
Disconnecting: socket=... rooms=room:<uuid>
Если пусто — ws/index.ts использует disconnect (пустой socket.rooms). Нужно — disconnecting.

📦 Production (позже)
Пока не готово. План:

Dockerfile.server + Dockerfile.client.

Nginx в docker/nginx.conf.

docker-compose.prod.yml.

HTTPS через Let's Encrypt.

NODE_ENV=production.

📱 Доступ с других устройств
В локальной сети:

Узнай IP сервера: ip a (например, 192.168.1.100).

В .env:

text
CORS_ORIGINS=http://localhost:40310,http://192.168.1.100:40310
VITE_API_URL=http://192.168.1.100:40305
VITE_WS_URL=http://192.168.1.100:40305
Перезапусти клиент и сервер.

Открой на другом устройстве: http://192.168.1.100:40310.

ВАЖНО: localhost не работает между устройствами. Нужен реальный IP.

🎯 Checklist запуска
□ Node.js 20+, pnpm 9+, Docker.
□ .env заполнен.
□ JWT_SECRET ≥ 32 символов.
□ Папка POSTGRES_DATA_DIR создана и chown 999:999.
□ docker compose up -d postgres — healthy.
□ pnpm install — без ошибок.
□ pnpm --filter @gm-table/shared build.
□ pnpm db:migrate — успешно.
□ pnpm dev:server — слушает порт.
□ pnpm dev:client — открывается.
□ http://localhost:40310 — форма входа.
📞 Помощь
Если что-то не работает:

Логи сервера (pnpm dev:server).

Console в браузере (DevTools → Console).

Network в браузере (DevTools → Network).

Логи Postgres (docker compose logs postgres).