# GoRustShop Plugin

Oxide/uMod плагин для доставки товаров из веб-магазина GO RUST.

## Возможности

- ✅ Автоматическая проверка товаров при входе игрока
- ✅ Периодическая проверка для онлайн игроков
- ✅ UI уведомление с кнопкой "Получить"
- ✅ Чат и консольные команды
- ✅ Поддержка EN/RU локализации
- ✅ API для других плагинов

## Установка

1. Скопируйте `GoRustShop.cs` в папку `/oxide/plugins/`
2. Плагин автоматически загрузится и создаст конфиг
3. Отредактируйте `/oxide/config/GoRustShop.json`
4. Перезагрузите плагин: `oxide.reload GoRustShop`

## Конфигурация

```json
{
  "API Base URL": "https://your-shop-domain.com",
  "API Key": "your-secret-api-key",
  "Check Interval (seconds)": 30.0,
  "Auto Deliver on Connect": true,
  "Show UI Notification": true,
  "UI Notification Duration (seconds)": 10.0,
  "Chat Command": "claim",
  "Console Command": "shop.claim",
  "Debug Mode": false
}
```

### Параметры

| Параметр | Описание |
|----------|----------|
| `API Base URL` | URL вашего магазина (без / в конце) |
| `API Key` | Секретный ключ API (из env.php на сервере) |
| `Check Interval` | Как часто проверять товары (сек) |
| `Auto Deliver on Connect` | Автоматически выдавать при входе |
| `Show UI Notification` | Показывать UI уведомление |
| `UI Notification Duration` | Длительность показа UI (сек) |
| `Chat Command` | Чат команда для получения |
| `Console Command` | Консольная команда |
| `Debug Mode` | Включить подробные логи |

## Команды

### Для игроков

| Команда | Описание |
|---------|----------|
| `/claim` | Получить ожидающие товары |
| `F1 → shop.claim` | То же через консоль |

### Для администраторов

| Команда | Описание |
|---------|----------|
| `gorustshop.check` | Принудительная проверка |

## Как работает

1. **Игрок покупает на сайте** → создаётся запись в `cart_entries`
2. **Плагин опрашивает API** → `/api/rust/pending.php?steam_id=XXX`
3. **Если есть товары** → показывает UI или сообщение в чат
4. **Игрок нажимает "Получить"** → плагин вызывает `/api/rust/claim.php`
5. **Плагин выполняет команды** → `inventory.giveto`, `grant user`, и т.д.
6. **Плагин обновляет статус** → `/api/rust/update.php`

## Примеры Rust команд (настраиваются в админке сайта)

```
# Выдача предмета
inventory.giveto {steamid} rifle.ak {qty}

# Выдача VIP привилегии (с плагином PermissionsManager)
grant user {steamid} vip.package

# Выдача кита (с плагином Kits)
kit.give {steamid} starter

# Выдача RP (с плагином ServerRewards)
sr add {steamid} {qty}

# Выдача экономики (с плагином Economics)
eco deposit {steamid} {qty}
```

## Плейсхолдеры

| Плейсхолдер | Описание |
|-------------|----------|
| `{steamid}` | Steam ID игрока (17 цифр) |
| `{qty}` | Количество |
| `{productId}` | ID товара |
| `{orderId}` | ID заказа |
| `{username}` | Ник игрока (очищенный) |

## API для других плагинов

```csharp
// Получить количество ожидающих товаров
int count = GoRustShop.Call<int>("GetPendingCount", player);

// Запустить получение товаров
GoRustShop.Call("TriggerClaim", player);

// Обновить список ожидающих
GoRustShop.Call("RefreshPending", player);
```

## Локализация

Плагин поддерживает EN и RU. Файлы локализации:
- `/oxide/lang/en/GoRustShop.json`
- `/oxide/lang/ru/GoRustShop.json`

## Безопасность

1. **Используйте API Key** — добавьте его в `env.php` на сервере:
   ```php
   "RUST_PLUGIN_API_KEY" => "your-secret-key-here"
   ```

2. **HTTPS** — используйте HTTPS для API URL

3. **Firewall** — ограничьте доступ к API по IP сервера

## Устранение неполадок

### Плагин не подключается к API

1. Проверьте URL в конфиге (без `/` в конце)
2. Проверьте API Key
3. Включите `Debug Mode: true`
4. Проверьте логи: `oxide.tail GoRustShop`

### Товары не выдаются

1. Проверьте формат команды в админке сайта
2. Убедитесь что нужные плагины установлены
3. Проверьте права на выполнение команд
4. Включите Debug Mode для просмотра команд

### UI не показывается

1. Проверьте `Show UI Notification: true`
2. Игрок может закрыть UI крестиком
3. UI автоматически скрывается через N секунд

## Требования

- Rust Server с Oxide/uMod
- GO RUST Shop веб-магазин
- PHP 7.4+ на веб-сервере
- SQLite на веб-сервере

## Поддержка

Discord: https://discord.gg/gorust
