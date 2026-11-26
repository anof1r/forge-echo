# Forge Echo

[English](#english) | [Русский](#russian)

Forge Echo is a local-first soundboard for D&D sessions. It follows the story slides shown by Battle Forge and plays the sounds assigned to each slide. Use it on a phone or tablet connected to your table speakers while Battle Forge runs on the game host.

The project is an independent companion to Battle Forge. It keeps its own sound library and slide bindings, and reads presentation state from Battle Forge without changing Battle Forge data.

---

<a id="english"></a>

## English

### What it does

- Assign ambient tracks to Battle Forge story slides and the battle screen.
- Follow the active slide and crossfade to its assigned track automatically.
- Switch to Hold mode to keep the current track while slides change.
- Pause and resume ambient playback without losing the current position.
- Trigger one-shot sound effects from large touch-friendly buttons.
- Organize one-shot effects into reusable groups and give each Stage tile its own image.
- Upload and manage audio tracks, trim their start and end, set volume, and choose whether ambient tracks loop.
- Install the client as a Progressive Web App (PWA) on a phone or tablet.

A slide without an assigned track leaves the current ambient track playing. Track bindings, uploaded audio, and Battle Forge presentation data are separate: Forge Echo owns its tracks and bindings, while Battle Forge remains the source of slide and presentation state.

### Run with Docker Compose

Docker Compose starts the Forge Echo app and its MongoDB database:

```sh
docker compose up --build -d
```

Open [http://localhost:8081](http://localhost:8081) on the host. By default, the app connects to Battle Forge at `http://host.docker.internal:8080`.

To change the Battle Forge address or the exposed port, create a `.env` file next to `docker-compose.yml`:

```dotenv
BATTLE_FORGE_URL=http://host.docker.internal:8080
FORGE_ECHO_PORT=8081
```

The Compose stack stores MongoDB data and uploaded audio in named volumes. Stop the stack without removing data with `docker compose down`. Do not use `docker compose down -v` unless you intend to delete those volumes.

Health endpoint: `GET /api/health`.

### Connect to Battle Forge

- Forge Echo reads the `dm-library/slides` and `settings/presentation` state through Socket.IO subscriptions.
- The only event Forge Echo sends to Battle Forge is `data:subscribe`. Forge Echo does not write to Battle Forge, access its MongoDB, or share its database.
- Incoming Battle Forge data is validated by strict parsers in `server/src/battle-forge/battle-forge.contract.ts`. Invalid data is discarded.
- Battle Forge reports the `contracts.forgeEcho` version from `/api/health`. Forge Echo checks compatibility and displays a warning when the versions differ.
- The live contract test is opt-in and requires a running Battle Forge:

```sh
cd server
BATTLE_FORGE_URL=http://localhost:8080 npm run test:contract
```

### Use during a session

1. Start Battle Forge and open the story presentation or battle screen.
2. Open Forge Echo on the device connected to the speakers and tap **Start session**. Browsers require a user gesture before audio can play.
3. In **Library**, upload ambient tracks and one-shot effects. Create effect groups, assign one-shot sounds to one or more groups, and upload an image for each sound tile.
4. Assign ambient tracks to the relevant slides. Set fade times for transitions if needed.
5. Return to **Stage**. In **Follow scenes** mode, ambient playback follows the active Battle Forge slide. Use **Hold** to keep the current track during manual slide changes.
6. Choose a sound effect group and tap an image tile to play it. Tap **Pause** or **Play** to pause or resume the current ambient track.

### Install the PWA

Open Forge Echo in Safari or Chrome and choose **Add to Home Screen** or **Install app**. The service worker caches the application shell; API requests and audio streams always use the network.

When opening Forge Echo from another device on the local network, browsers generally require HTTPS for PWA installation and reliable audio features. `localhost` is treated as a secure context for local development.

### Development

```sh
# Client
npm ci
npm start
npm test
npm run build

# Server
cd server
npm ci
npm test
npm run typecheck
npm run build
```

The client uses Angular. The server uses NestJS, MongoDB, REST endpoints, and Socket.IO. See [AGENTS.md](AGENTS.md) for repository development rules.

### Data and backups

MongoDB stores track metadata and slide bindings. Audio files are stored in the `forge-echo-media` Docker volume. Back up both the `forge-echo-mongo` and `forge-echo-media` volumes to preserve a complete library.

---

<a id="russian"></a>

## Русский

Forge Echo — локальный саундборд для игр в D&D. Он следит за слайдами истории в Battle Forge и включает звуки, назначенные каждому слайду. Приложение можно открыть на телефоне или планшете, подключённом к колонкам, пока Battle Forge работает на компьютере ведущего.

Это отдельный проект-компаньон для Battle Forge. Forge Echo хранит собственную библиотеку звуков и привязки к слайдам, а состояние презентации только читает из Battle Forge и не изменяет его данные.

### Возможности

- Назначать фоновые треки слайдам истории Battle Forge и боевому экрану.
- Создавать группы разовых эффектов, добавлять звук в несколько групп и назначать каждому звуку изображение для плитки на Stage.
- Автоматически переключать фоновый звук при смене активного слайда, используя плавный переход.
- Включать режим «Удержание», чтобы оставить текущую музыку при смене слайдов.
- Ставить фоновый звук на паузу и продолжать воспроизведение с того же места.
- Запускать разовые звуковые эффекты большими кнопками, удобными для сенсорного экрана.
- Загружать и упорядочивать звуки, обрезать начало и конец, настраивать громкость и зацикливание фоновых треков.
- Устанавливать приложение на телефон или планшет как PWA.

Если для слайда не назначен трек, текущая фоновая музыка продолжает играть. Библиотека звуков и привязки принадлежат Forge Echo, а источником слайдов и состояния презентации остаётся Battle Forge.

### Запуск через Docker Compose

Docker Compose запускает приложение Forge Echo и отдельную базу MongoDB:

```sh
docker compose up --build -d
```

На компьютере откройте [http://localhost:8081](http://localhost:8081). По умолчанию приложение подключается к Battle Forge по адресу `http://host.docker.internal:8080`.

Чтобы изменить адрес Battle Forge или внешний порт Forge Echo, создайте рядом с `docker-compose.yml` файл `.env`:

```dotenv
BATTLE_FORGE_URL=http://host.docker.internal:8080
FORGE_ECHO_PORT=8081
```

MongoDB и загруженные аудиофайлы хранятся в именованных Docker-томах. Остановить сервисы без удаления данных можно командой `docker compose down`. Не используйте `docker compose down -v`, если не собираетесь удалить эти тома.

Проверка состояния: `GET /api/health`.

### Связь с Battle Forge

- Forge Echo читает состояния `dm-library/slides` и `settings/presentation` через Socket.IO-подписки.
- Единственное событие, которое Forge Echo отправляет в Battle Forge, — `data:subscribe`. Приложение не записывает данные в Battle Forge, не подключается к его MongoDB и не использует общую базу.
- Входящие данные Battle Forge проверяются строгими парсерами из `server/src/battle-forge/battle-forge.contract.ts`. Некорректные данные отбрасываются.
- Battle Forge сообщает версию `contracts.forgeEcho` через `/api/health`. Forge Echo проверяет совместимость и показывает предупреждение, если версии различаются.
- Интеграционный тест контракта запускается отдельно и требует работающего Battle Forge:

```sh
cd server
BATTLE_FORGE_URL=http://localhost:8080 npm run test:contract
```

### Использование во время игры

1. Запустите Battle Forge и откройте презентацию истории или боевой экран.
2. Откройте Forge Echo на устройстве, подключённом к колонкам, и нажмите **Start session**. Браузер требует нажатия перед первым запуском звука.
3. Во вкладке **Library** загрузите фоновые треки и разовые эффекты. Создайте группы, распределите эффекты по одной или нескольким группам и загрузите изображение для каждой плитки.
4. Назначьте фоновые треки нужным слайдам. При необходимости настройте длительность плавных переходов.
5. Вернитесь во вкладку **Stage**. В режиме **Follow scenes** музыка следует за активным слайдом Battle Forge. Включите **Hold**, если нужно сохранить текущий звук при ручной смене слайдов.
6. Выберите группу эффектов и нажмите на плитку с изображением, чтобы запустить звук. Кнопкой **Pause** или **Play** приостанавливайте и продолжайте фоновый трек.

### Установка PWA

Откройте Forge Echo в Safari или Chrome и выберите **Добавить на экран «Домой»** или **Установить приложение**. Service worker кеширует оболочку приложения; запросы к API и аудиопотоки всегда загружаются по сети.

Для установки PWA и надёжной работы аудио браузерам обычно нужен HTTPS, если Forge Echo открывается на другом устройстве в локальной сети. `localhost` считается безопасным контекстом при локальной разработке.

### Разработка

```sh
# Клиент
npm ci
npm start
npm test
npm run build

# Сервер
cd server
npm ci
npm test
npm run typecheck
npm run build
```

Клиент написан на Angular. Сервер использует NestJS, MongoDB, REST и Socket.IO. Правила разработки находятся в [AGENTS.md](AGENTS.md).

### Данные и резервные копии

MongoDB хранит данные треков и привязки к слайдам. Аудиофайлы находятся в Docker-томе `forge-echo-media`. Для полной резервной копии библиотеки сохраните оба тома: `forge-echo-mongo` и `forge-echo-media`.
