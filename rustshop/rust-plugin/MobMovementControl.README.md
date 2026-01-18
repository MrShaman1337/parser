# MobMovementControl

Oxide/uMod плагин для Rust, который отключает движение мобов (животных и NPC) при достижении определённого онлайна, но **сохраняет способность ботов стрелять**.

## Возможности

- ✅ Отключение движения при определённом онлайне
- ✅ Сохранение AI стрельбы у ботов (RT, рейд-башни)
- ✅ Автоматическое включение/отключение по онлайну
- ✅ Исключение ботов от RaidableBases и BotSpawn
- ✅ Исключение ботов с владельцем (обычно RT боты)
- ✅ Ручное управление через команды
- ✅ Уведомления админам при смене состояния
- ✅ API для других плагинов

## Установка

1. Скопируйте `MobMovementControl.cs` в папку `/oxide/plugins/`
2. Плагин автоматически загрузится и создаст конфиг
3. Отредактируйте `/oxide/config/MobMovementControl.json`
4. Перезагрузите: `oxide.reload MobMovementControl`

## Конфигурация

```json
{
  "Player Threshold (disable movement when online >= this)": 50,
  "Check Interval (seconds)": 10.0,
  "Disable Animal Movement": true,
  "Disable NPC Movement": true,
  "Exclude Raidable Bases Bots": true,
  "Exclude BotSpawn Bots": true,
  "Exclude NPC from Plugins (prefab contains)": [
    "scientistnpc_roam",
    "scientistnpc_patrol"
  ],
  "Keep Bot Shooting AI": true,
  "Notify Admins on State Change": true,
  "Debug Mode": false
}
```

### Параметры

| Параметр | Описание |
|----------|----------|
| `Player Threshold` | При каком онлайне отключать движение (например, 50 игроков) |
| `Check Interval` | Как часто проверять онлайн (секунды) |
| `Disable Animal Movement` | Отключать движение животных (кабаны, олени, медведи, волки) |
| `Disable NPC Movement` | Отключать движение NPC (учёные, бандиты) |
| `Exclude Raidable Bases Bots` | НЕ отключать движение у ботов от плагина RaidableBases |
| `Exclude BotSpawn Bots` | НЕ отключать движение у ботов от плагина BotSpawn |
| `Exclude NPC from Plugins` | Список префабов для исключения |
| `Keep Bot Shooting AI` | Сохранять AI стрельбы (боты будут стрелять, но не двигаться) |
| `Notify Admins` | Уведомлять админов о смене состояния |
| `Debug Mode` | Подробные логи для отладки |

## Команды

### Чат команды (требуют права `mobmovementcontrol.admin`)

| Команда | Описание |
|---------|----------|
| `/mobcontrol` или `/mc` | Показать текущий статус |
| `/mobcontrol status` | Показать подробный статус |
| `/mobcontrol on` | Принудительно включить движение |
| `/mobcontrol off` | Принудительно отключить движение |
| `/mobcontrol auto` | Вернуться в автоматический режим |

### Консольные команды

| Команда | Описание |
|---------|----------|
| `mobcontrol` | Показать статус |
| `mobcontrol on` | Включить движение |
| `mobcontrol off` | Отключить движение |
| `mobcontrol auto` | Авто режим |

## Как работает

1. **Проверка онлайна** — каждые N секунд плагин проверяет количество игроков
2. **Пороговое значение** — если онлайн >= порога, движение отключается
3. **Отключение NavMesh** — у животных и NPC отключается компонент NavMeshAgent
4. **Сохранение AI** — у ботов сохраняется способность целиться и стрелять
5. **Исключения** — боты от RaidableBases, BotSpawn и с владельцем пропускаются

### Что отключается:

- ❌ Передвижение по карте (NavMeshAgent)
- ❌ Патрулирование
- ❌ Погоня за игроками
- ❌ Убегание

### Что сохраняется:

- ✅ Прицеливание
- ✅ Стрельба по игрокам
- ✅ Обнаружение угроз
- ✅ Агро-механики

## Поддержка RT (Raid Tower) ботов

Боты на рейд-башнях обычно:
- Созданы плагинами RaidableBases или BotSpawn
- Имеют `OwnerID` (владельца)
- Находятся в определённых префабах

Все эти боты **автоматически исключаются** из отключения движения, чтобы они продолжали:
- Стрелять по игрокам
- Защищать башню
- Поворачиваться к целям

## API для других плагинов

```csharp
// Проверить, отключено ли движение
bool isDisabled = MobMovementControl.Call<bool>("IsMovementDisabled");

// Получить количество замороженных мобов
var counts = MobMovementControl.Call<Dictionary<string, int>>("GetFrozenCounts");
int frozenAnimals = counts["animals"];
int frozenNPCs = counts["npcs"];

// Принудительно отключить движение
MobMovementControl.Call("ForceDisable");

// Принудительно включить движение
MobMovementControl.Call("ForceEnable");

// Вернуться в авто-режим
MobMovementControl.Call("SetAutoMode");

// Исключить конкретного NPC из контроля
MobMovementControl.Call("ExcludeNPC", myNpc);
```

## Совместимость

Плагин совместим с:
- ✅ RaidableBases
- ✅ BotSpawn
- ✅ NpcSpawn
- ✅ Другие плагины спавна ботов

## Права (Permissions)

| Право | Описание |
|-------|----------|
| `mobmovementcontrol.admin` | Управление плагином через команды |

Выдача прав:
```
oxide.grant user <SteamID> mobmovementcontrol.admin
oxide.grant group admin mobmovementcontrol.admin
```

## Примеры использования

### Сценарий 1: Снижение нагрузки при высоком онлайне

```json
{
  "Player Threshold (disable movement when online >= this)": 100,
  "Disable Animal Movement": true,
  "Disable NPC Movement": true
}
```

При 100+ игроках все животные и NPC перестанут двигаться, снижая нагрузку на сервер.

### Сценарий 2: Только животные

```json
{
  "Player Threshold (disable movement when online >= this)": 80,
  "Disable Animal Movement": true,
  "Disable NPC Movement": false
}
```

Только животные замораживаются, NPC продолжают действовать.

### Сценарий 3: Низкий порог для слабого сервера

```json
{
  "Player Threshold (disable movement when online >= this)": 30,
  "Check Interval (seconds)": 5.0
}
```

Быстрая реакция на изменение онлайна.

## Устранение неполадок

### Боты не стреляют

1. Убедитесь что `Keep Bot Shooting AI: true`
2. Проверьте что бот не заспавнен слишком далеко от игроков
3. Включите `Debug Mode: true` для логов

### Некоторые мобы всё ещё двигаются

1. Проверьте список исключений `Exclude NPC from Plugins`
2. Возможно это боты от плагина (RaidableBases, BotSpawn)
3. Боты с OwnerID автоматически исключаются

### Плагин не загружается

1. Проверьте логи: `oxide.tail MobMovementControl`
2. Убедитесь что Oxide/uMod актуален
3. Проверьте синтаксис конфига

## Логи

При `Debug Mode: true` в консоль выводятся:
- Какие мобы заморожены
- Какие мобы исключены
- Текущий онлайн и порог
- Ошибки при обработке

## Требования

- Rust Server с Oxide/uMod
- Oxide версии 2.0+

## Changelog

### v1.0.0
- Первый релиз
- Отключение движения животных и NPC
- Сохранение AI стрельбы
- Поддержка RaidableBases и BotSpawn
- Команды управления
- API для плагинов
