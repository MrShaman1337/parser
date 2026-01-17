// GoRustShop.cs - Oxide/uMod Plugin for GO RUST Shop
// Reads pending cart entries from website API and delivers items to players

using Newtonsoft.Json;
using Oxide.Core;
using Oxide.Core.Libraries;
using Oxide.Core.Libraries.Covalence;
using Oxide.Core.Plugins;
using Oxide.Game.Rust.Cui;
using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace Oxide.Plugins
{
    [Info("GoRustShop", "GO RUST", "1.0.0")]
    [Description("Delivers purchased items from GO RUST web shop")]
    public class GoRustShop : RustPlugin
    {
        #region Configuration

        private Configuration config;

        private class Configuration
        {
            [JsonProperty("API Base URL")]
            public string ApiBaseUrl { get; set; } = "http://your-shop-domain.com";

            [JsonProperty("API Key")]
            public string ApiKey { get; set; } = "";

            [JsonProperty("Check Interval (seconds)")]
            public float CheckInterval { get; set; } = 30f;

            [JsonProperty("Auto Deliver on Connect")]
            public bool AutoDeliverOnConnect { get; set; } = true;

            [JsonProperty("Show UI Notification")]
            public bool ShowUINotification { get; set; } = true;

            [JsonProperty("UI Notification Duration (seconds)")]
            public float UINotificationDuration { get; set; } = 10f;

            [JsonProperty("Chat Command")]
            public string ChatCommand { get; set; } = "claim";

            [JsonProperty("Console Command")]
            public string ConsoleCommand { get; set; } = "shop.claim";

            [JsonProperty("Debug Mode")]
            public bool DebugMode { get; set; } = false;
        }

        protected override void LoadDefaultConfig()
        {
            config = new Configuration();
            SaveConfig();
        }

        protected override void LoadConfig()
        {
            base.LoadConfig();
            try
            {
                config = Config.ReadObject<Configuration>();
                if (config == null)
                {
                    LoadDefaultConfig();
                }
            }
            catch
            {
                LoadDefaultConfig();
            }
        }

        protected override void SaveConfig() => Config.WriteObject(config);

        #endregion

        #region Localization

        protected override void LoadDefaultMessages()
        {
            lang.RegisterMessages(new Dictionary<string, string>
            {
                ["NoItems"] = "You have no items to claim.",
                ["ClaimingItems"] = "Claiming {0} item(s)...",
                ["ItemDelivered"] = "✓ Delivered: {0} x{1}",
                ["ItemFailed"] = "✗ Failed to deliver: {0} - {1}",
                ["AllDelivered"] = "All items have been delivered!",
                ["SomeDelivered"] = "{0} of {1} items delivered. Some failed.",
                ["PendingItems"] = "You have {0} item(s) waiting! Type /{1} to claim.",
                ["UITitle"] = "SHOP DELIVERY",
                ["UIClaimButton"] = "CLAIM ITEMS",
                ["UIItemsWaiting"] = "{0} item(s) waiting",
                ["Error"] = "An error occurred. Please try again later.",
                ["Cooldown"] = "Please wait {0} seconds before claiming again."
            }, this);

            lang.RegisterMessages(new Dictionary<string, string>
            {
                ["NoItems"] = "У вас нет товаров для получения.",
                ["ClaimingItems"] = "Получение {0} товар(ов)...",
                ["ItemDelivered"] = "✓ Доставлено: {0} x{1}",
                ["ItemFailed"] = "✗ Ошибка доставки: {0} - {1}",
                ["AllDelivered"] = "Все товары доставлены!",
                ["SomeDelivered"] = "{0} из {1} товаров доставлено. Некоторые не удались.",
                ["PendingItems"] = "У вас {0} товар(ов) ожидает! Введите /{1} чтобы получить.",
                ["UITitle"] = "ДОСТАВКА",
                ["UIClaimButton"] = "ПОЛУЧИТЬ",
                ["UIItemsWaiting"] = "{0} товар(ов) ожидает",
                ["Error"] = "Произошла ошибка. Попробуйте позже.",
                ["Cooldown"] = "Подождите {0} секунд перед повторной попыткой."
            }, this, "ru");
        }

        private string Lang(string key, string userId = null, params object[] args)
        {
            return string.Format(lang.GetMessage(key, this, userId), args);
        }

        #endregion

        #region Data Classes

        private class CartEntry
        {
            [JsonProperty("id")]
            public string Id { get; set; }

            [JsonProperty("steam_id")]
            public string SteamId { get; set; }

            [JsonProperty("order_id")]
            public string OrderId { get; set; }

            [JsonProperty("product_id")]
            public string ProductId { get; set; }

            [JsonProperty("product_name")]
            public string ProductName { get; set; }

            [JsonProperty("quantity")]
            public int Quantity { get; set; }

            [JsonProperty("rust_command")]
            public string RustCommand { get; set; }

            [JsonProperty("created_at")]
            public string CreatedAt { get; set; }
        }

        private class PendingResponse
        {
            [JsonProperty("ok")]
            public bool Ok { get; set; }

            [JsonProperty("steam_id")]
            public string SteamId { get; set; }

            [JsonProperty("entries")]
            public List<CartEntry> Entries { get; set; }

            [JsonProperty("count")]
            public int Count { get; set; }

            [JsonProperty("error")]
            public string Error { get; set; }
        }

        private class ClaimResponse
        {
            [JsonProperty("ok")]
            public bool Ok { get; set; }

            [JsonProperty("entries")]
            public List<CartEntry> Entries { get; set; }

            [JsonProperty("count")]
            public int Count { get; set; }

            [JsonProperty("error")]
            public string Error { get; set; }
        }

        private class UpdateResponse
        {
            [JsonProperty("ok")]
            public bool Ok { get; set; }

            [JsonProperty("error")]
            public string Error { get; set; }
        }

        #endregion

        #region Fields

        private Dictionary<ulong, float> playerCooldowns = new Dictionary<ulong, float>();
        private Dictionary<ulong, int> playerPendingCount = new Dictionary<ulong, int>();
        private const float COOLDOWN_SECONDS = 5f;
        private Timer checkTimer;

        #endregion

        #region Oxide Hooks

        private void Init()
        {
            cmd.AddChatCommand(config.ChatCommand, this, nameof(CmdClaim));
            cmd.AddConsoleCommand(config.ConsoleCommand, this, nameof(ConsoleCmdClaim));
        }

        private void OnServerInitialized()
        {
            // Start periodic check for all online players
            checkTimer = timer.Every(config.CheckInterval, () =>
            {
                foreach (var player in BasePlayer.activePlayerList)
                {
                    CheckPendingItems(player, false);
                }
            });

            // Check all currently online players
            foreach (var player in BasePlayer.activePlayerList)
            {
                CheckPendingItems(player, false);
            }
        }

        private void Unload()
        {
            checkTimer?.Destroy();

            // Destroy UI for all players
            foreach (var player in BasePlayer.activePlayerList)
            {
                DestroyUI(player);
            }
        }

        private void OnPlayerConnected(BasePlayer player)
        {
            if (player == null) return;

            // Check for pending items after a short delay
            timer.Once(3f, () =>
            {
                if (player != null && player.IsConnected)
                {
                    CheckPendingItems(player, config.AutoDeliverOnConnect);
                }
            });
        }

        private void OnPlayerDisconnected(BasePlayer player)
        {
            if (player == null) return;

            DestroyUI(player);
            playerPendingCount.Remove(player.userID);
            playerCooldowns.Remove(player.userID);
        }

        #endregion

        #region Commands

        private void CmdClaim(BasePlayer player, string command, string[] args)
        {
            if (player == null) return;
            ClaimItems(player);
        }

        private void ConsoleCmdClaim(ConsoleSystem.Arg arg)
        {
            var player = arg.Player();
            if (player == null) return;
            ClaimItems(player);
        }

        [ConsoleCommand("gorustshop.check")]
        private void ConsoleCmdCheck(ConsoleSystem.Arg arg)
        {
            var player = arg.Player();
            if (player == null) return;
            CheckPendingItems(player, false);
        }

        [ConsoleCommand("gorustshop.ui.claim")]
        private void ConsoleCmdUIClaim(ConsoleSystem.Arg arg)
        {
            var player = arg.Player();
            if (player == null) return;
            DestroyUI(player);
            ClaimItems(player);
        }

        [ConsoleCommand("gorustshop.ui.close")]
        private void ConsoleCmdUIClose(ConsoleSystem.Arg arg)
        {
            var player = arg.Player();
            if (player == null) return;
            DestroyUI(player);
        }

        #endregion

        #region Core Logic

        private void CheckPendingItems(BasePlayer player, bool autoDeliver)
        {
            if (player == null || !player.IsConnected) return;

            string steamId = player.UserIDString;
            string url = $"{config.ApiBaseUrl}/api/rust/pending.php?steam_id={steamId}";

            if (!string.IsNullOrEmpty(config.ApiKey))
            {
                url += $"&api_key={config.ApiKey}";
            }

            DebugLog($"Checking pending items for {player.displayName} ({steamId})");

            webrequest.Enqueue(url, null, (code, response) =>
            {
                if (player == null || !player.IsConnected) return;

                if (code != 200 || string.IsNullOrEmpty(response))
                {
                    DebugLog($"API error: code={code}, response={response}");
                    return;
                }

                try
                {
                    var data = JsonConvert.DeserializeObject<PendingResponse>(response);

                    if (!data.Ok)
                    {
                        DebugLog($"API returned error: {data.Error}");
                        return;
                    }

                    int count = data.Count;
                    playerPendingCount[player.userID] = count;

                    DebugLog($"Player {player.displayName} has {count} pending items");

                    if (count > 0)
                    {
                        if (autoDeliver)
                        {
                            ClaimItems(player);
                        }
                        else if (config.ShowUINotification)
                        {
                            ShowNotificationUI(player, count);
                            SendReply(player, Lang("PendingItems", player.UserIDString, count, config.ChatCommand));
                        }
                    }
                    else
                    {
                        DestroyUI(player);
                    }
                }
                catch (Exception ex)
                {
                    DebugLog($"Error parsing response: {ex.Message}");
                }
            }, this, RequestMethod.GET);
        }

        private void ClaimItems(BasePlayer player)
        {
            if (player == null || !player.IsConnected) return;

            // Check cooldown
            if (playerCooldowns.TryGetValue(player.userID, out float lastClaim))
            {
                float remaining = COOLDOWN_SECONDS - (Time.realtimeSinceStartup - lastClaim);
                if (remaining > 0)
                {
                    SendReply(player, Lang("Cooldown", player.UserIDString, Math.Ceiling(remaining)));
                    return;
                }
            }

            playerCooldowns[player.userID] = Time.realtimeSinceStartup;
            DestroyUI(player);

            string steamId = player.UserIDString;
            string url = $"{config.ApiBaseUrl}/api/rust/claim.php";

            if (!string.IsNullOrEmpty(config.ApiKey))
            {
                url += $"?api_key={config.ApiKey}";
            }

            string body = JsonConvert.SerializeObject(new { steam_id = steamId });

            DebugLog($"Claiming items for {player.displayName} ({steamId})");

            webrequest.Enqueue(url, body, (code, response) =>
            {
                if (player == null || !player.IsConnected) return;

                if (code != 200 || string.IsNullOrEmpty(response))
                {
                    SendReply(player, Lang("Error", player.UserIDString));
                    DebugLog($"Claim API error: code={code}, response={response}");
                    return;
                }

                try
                {
                    var data = JsonConvert.DeserializeObject<ClaimResponse>(response);

                    if (!data.Ok)
                    {
                        SendReply(player, Lang("Error", player.UserIDString));
                        DebugLog($"Claim API error: {data.Error}");
                        return;
                    }

                    if (data.Entries == null || data.Entries.Count == 0)
                    {
                        SendReply(player, Lang("NoItems", player.UserIDString));
                        playerPendingCount[player.userID] = 0;
                        return;
                    }

                    SendReply(player, Lang("ClaimingItems", player.UserIDString, data.Entries.Count));

                    int delivered = 0;
                    int failed = 0;

                    foreach (var entry in data.Entries)
                    {
                        bool success = DeliverItem(player, entry);

                        if (success)
                        {
                            delivered++;
                            SendReply(player, Lang("ItemDelivered", player.UserIDString, entry.ProductName, entry.Quantity));
                            UpdateEntryStatus(entry.Id, "delivered", null);
                        }
                        else
                        {
                            failed++;
                            string error = "Command execution failed";
                            SendReply(player, Lang("ItemFailed", player.UserIDString, entry.ProductName, error));
                            UpdateEntryStatus(entry.Id, "failed", error);
                        }
                    }

                    playerPendingCount[player.userID] = 0;

                    if (failed == 0)
                    {
                        SendReply(player, Lang("AllDelivered", player.UserIDString));
                    }
                    else
                    {
                        SendReply(player, Lang("SomeDelivered", player.UserIDString, delivered, data.Entries.Count));
                    }
                }
                catch (Exception ex)
                {
                    SendReply(player, Lang("Error", player.UserIDString));
                    DebugLog($"Error processing claim: {ex.Message}");
                }
            }, this, RequestMethod.POST, new Dictionary<string, string>
            {
                { "Content-Type", "application/json" }
            });
        }

        private bool DeliverItem(BasePlayer player, CartEntry entry)
        {
            if (player == null || entry == null || string.IsNullOrEmpty(entry.RustCommand))
            {
                return false;
            }

            try
            {
                // Replace placeholders in command
                string command = entry.RustCommand
                    .Replace("{steamid}", player.UserIDString)
                    .Replace("{qty}", entry.Quantity.ToString())
                    .Replace("{productId}", entry.ProductId ?? "")
                    .Replace("{orderId}", entry.OrderId ?? "")
                    .Replace("{username}", SanitizeUsername(player.displayName));

                DebugLog($"Executing command: {command}");

                // Execute the command
                ConsoleSystem.Run(ConsoleSystem.Option.Server, command);

                return true;
            }
            catch (Exception ex)
            {
                DebugLog($"Error executing command: {ex.Message}");
                return false;
            }
        }

        private void UpdateEntryStatus(string entryId, string status, string error)
        {
            string url = $"{config.ApiBaseUrl}/api/rust/update.php";

            if (!string.IsNullOrEmpty(config.ApiKey))
            {
                url += $"?api_key={config.ApiKey}";
            }

            var payload = new Dictionary<string, object>
            {
                { "entry_id", entryId },
                { "status", status }
            };

            if (!string.IsNullOrEmpty(error))
            {
                payload["error"] = error;
            }

            string body = JsonConvert.SerializeObject(payload);

            webrequest.Enqueue(url, body, (code, response) =>
            {
                DebugLog($"Update status response: code={code}, entry={entryId}, status={status}");
            }, this, RequestMethod.POST, new Dictionary<string, string>
            {
                { "Content-Type", "application/json" }
            });
        }

        private string SanitizeUsername(string username)
        {
            if (string.IsNullOrEmpty(username)) return "Player";

            // Remove non-alphanumeric characters except space, underscore, hyphen
            var chars = username.Where(c => char.IsLetterOrDigit(c) || c == ' ' || c == '_' || c == '-').ToArray();
            string clean = new string(chars);

            if (clean.Length > 32)
            {
                clean = clean.Substring(0, 32);
            }

            return string.IsNullOrWhiteSpace(clean) ? "Player" : clean.Trim();
        }

        #endregion

        #region UI

        private const string UI_PANEL = "GoRustShop_Notification";

        private void ShowNotificationUI(BasePlayer player, int itemCount)
        {
            if (player == null || !player.IsConnected) return;

            DestroyUI(player);

            var elements = new CuiElementContainer();

            // Main panel
            elements.Add(new CuiPanel
            {
                Image = { Color = "0.1 0.1 0.1 0.95" },
                RectTransform = { AnchorMin = "0.35 0.85", AnchorMax = "0.65 0.95" },
                CursorEnabled = false
            }, "Overlay", UI_PANEL);

            // Title
            elements.Add(new CuiLabel
            {
                Text = {
                    Text = Lang("UITitle", player.UserIDString),
                    FontSize = 14,
                    Align = TextAnchor.MiddleCenter,
                    Color = "0.9 0.7 0.2 1"
                },
                RectTransform = { AnchorMin = "0 0.6", AnchorMax = "1 1" }
            }, UI_PANEL);

            // Items waiting text
            elements.Add(new CuiLabel
            {
                Text = {
                    Text = Lang("UIItemsWaiting", player.UserIDString, itemCount),
                    FontSize = 12,
                    Align = TextAnchor.MiddleCenter,
                    Color = "0.8 0.8 0.8 1"
                },
                RectTransform = { AnchorMin = "0 0.35", AnchorMax = "0.5 0.6" }
            }, UI_PANEL);

            // Claim button
            elements.Add(new CuiButton
            {
                Button = {
                    Command = "gorustshop.ui.claim",
                    Color = "0.3 0.6 0.2 1"
                },
                RectTransform = { AnchorMin = "0.52 0.15", AnchorMax = "0.85 0.55" },
                Text = {
                    Text = Lang("UIClaimButton", player.UserIDString),
                    FontSize = 12,
                    Align = TextAnchor.MiddleCenter,
                    Color = "1 1 1 1"
                }
            }, UI_PANEL);

            // Close button
            elements.Add(new CuiButton
            {
                Button = {
                    Command = "gorustshop.ui.close",
                    Color = "0.5 0.2 0.2 1"
                },
                RectTransform = { AnchorMin = "0.87 0.15", AnchorMax = "0.98 0.55" },
                Text = {
                    Text = "✕",
                    FontSize = 14,
                    Align = TextAnchor.MiddleCenter,
                    Color = "1 1 1 1"
                }
            }, UI_PANEL);

            CuiHelper.AddUi(player, elements);

            // Auto-hide after duration
            timer.Once(config.UINotificationDuration, () =>
            {
                if (player != null && player.IsConnected)
                {
                    DestroyUI(player);
                }
            });
        }

        private void DestroyUI(BasePlayer player)
        {
            if (player == null) return;
            CuiHelper.DestroyUi(player, UI_PANEL);
        }

        #endregion

        #region Helpers

        private void DebugLog(string message)
        {
            if (config.DebugMode)
            {
                Puts($"[DEBUG] {message}");
            }
        }

        #endregion

        #region API

        // Public API for other plugins to check pending items
        private int GetPendingCount(BasePlayer player)
        {
            if (player == null) return 0;
            return playerPendingCount.TryGetValue(player.userID, out int count) ? count : 0;
        }

        // Public API to trigger claim
        private void TriggerClaim(BasePlayer player)
        {
            if (player != null)
            {
                ClaimItems(player);
            }
        }

        // Public API to refresh pending items
        private void RefreshPending(BasePlayer player)
        {
            if (player != null)
            {
                CheckPendingItems(player, false);
            }
        }

        #endregion
    }
}
