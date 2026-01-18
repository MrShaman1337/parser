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
    [Info("GoRustShop", "GO RUST", "1.1.0")]
    [Description("Delivers purchased items from GO RUST web shop with cart UI")]
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
            public bool AutoDeliverOnConnect { get; set; } = false;

            [JsonProperty("Show UI Notification")]
            public bool ShowUINotification { get; set; } = false;

            [JsonProperty("UI Notification Duration (seconds)")]
            public float UINotificationDuration { get; set; } = 10f;

            [JsonProperty("Chat Command Claim")]
            public string ChatCommandClaim { get; set; } = "claim";

            [JsonProperty("Chat Command Cart")]
            public string ChatCommandCart { get; set; } = "cart";

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
                ["PendingItems"] = "You have {0} item(s) waiting! Type /{1} to open cart.",
                ["UITitle"] = "SHOP DELIVERY",
                ["UIClaimButton"] = "CLAIM",
                ["UIItemsWaiting"] = "{0} item(s) waiting",
                ["Error"] = "An error occurred. Please try again later.",
                ["Cooldown"] = "Please wait {0} seconds before claiming again.",
                ["CartTitle"] = "🛒 MY CART",
                ["CartEmpty"] = "Your cart is empty",
                ["CartClaimAll"] = "CLAIM ALL",
                ["CartClose"] = "CLOSE",
                ["CartQuantity"] = "x{0}",
                ["CartLoading"] = "Loading...",
                ["CartItemClaim"] = "CLAIM"
            }, this);

            // Russian language - using escaped Unicode for proper encoding
            lang.RegisterMessages(new Dictionary<string, string>
            {
                ["NoItems"] = "\u0423 \u0432\u0430\u0441 \u043d\u0435\u0442 \u0442\u043e\u0432\u0430\u0440\u043e\u0432 \u0434\u043b\u044f \u043f\u043e\u043b\u0443\u0447\u0435\u043d\u0438\u044f.",
                ["ClaimingItems"] = "\u041f\u043e\u043b\u0443\u0447\u0435\u043d\u0438\u0435 {0} \u0442\u043e\u0432\u0430\u0440(\u043e\u0432)...",
                ["ItemDelivered"] = "\u2713 \u0414\u043e\u0441\u0442\u0430\u0432\u043b\u0435\u043d\u043e: {0} x{1}",
                ["ItemFailed"] = "\u2717 \u041e\u0448\u0438\u0431\u043a\u0430 \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0438: {0} - {1}",
                ["AllDelivered"] = "\u0412\u0441\u0435 \u0442\u043e\u0432\u0430\u0440\u044b \u0434\u043e\u0441\u0442\u0430\u0432\u043b\u0435\u043d\u044b!",
                ["SomeDelivered"] = "{0} \u0438\u0437 {1} \u0442\u043e\u0432\u0430\u0440\u043e\u0432 \u0434\u043e\u0441\u0442\u0430\u0432\u043b\u0435\u043d\u043e. \u041d\u0435\u043a\u043e\u0442\u043e\u0440\u044b\u0435 \u043d\u0435 \u0443\u0434\u0430\u043b\u0438\u0441\u044c.",
                ["PendingItems"] = "\u0423 \u0432\u0430\u0441 {0} \u0442\u043e\u0432\u0430\u0440(\u043e\u0432) \u043e\u0436\u0438\u0434\u0430\u0435\u0442! \u0412\u0432\u0435\u0434\u0438\u0442\u0435 /{1} \u0447\u0442\u043e\u0431\u044b \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u043a\u043e\u0440\u0437\u0438\u043d\u0443.",
                ["UITitle"] = "\u0414\u041e\u0421\u0422\u0410\u0412\u041a\u0410",
                ["UIClaimButton"] = "\u041f\u041e\u041b\u0423\u0427\u0418\u0422\u042c",
                ["UIItemsWaiting"] = "{0} \u0442\u043e\u0432\u0430\u0440(\u043e\u0432) \u043e\u0436\u0438\u0434\u0430\u0435\u0442",
                ["Error"] = "\u041f\u0440\u043e\u0438\u0437\u043e\u0448\u043b\u0430 \u043e\u0448\u0438\u0431\u043a\u0430. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u043e\u0437\u0436\u0435.",
                ["Cooldown"] = "\u041f\u043e\u0434\u043e\u0436\u0434\u0438\u0442\u0435 {0} \u0441\u0435\u043a\u0443\u043d\u0434 \u043f\u0435\u0440\u0435\u0434 \u043f\u043e\u0432\u0442\u043e\u0440\u043d\u043e\u0439 \u043f\u043e\u043f\u044b\u0442\u043a\u043e\u0439.",
                ["CartTitle"] = "\u041c\u041e\u042f \u041a\u041e\u0420\u0417\u0418\u041d\u0410",
                ["CartEmpty"] = "\u041a\u043e\u0440\u0437\u0438\u043d\u0430 \u043f\u0443\u0441\u0442\u0430",
                ["CartClaimAll"] = "\u041f\u041e\u041b\u0423\u0427\u0418\u0422\u042c \u0412\u0421\u0415",
                ["CartClose"] = "\u0417\u0410\u041a\u0420\u042b\u0422\u042c",
                ["CartQuantity"] = "x{0}",
                ["CartLoading"] = "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...",
                ["CartItemClaim"] = "\u0412\u0417\u042f\u0422\u042c"
            }, this, "ru");
        }

        private string Lang(string key, string oderId = null, params object[] args)
        {
            return string.Format(lang.GetMessage(key, this, oderId), args);
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
        private Dictionary<ulong, List<CartEntry>> playerCarts = new Dictionary<ulong, List<CartEntry>>();
        private Dictionary<ulong, int> playerPendingCount = new Dictionary<ulong, int>();
        private Dictionary<ulong, int> playerNotifiedCount = new Dictionary<ulong, int>(); // Track notified count to avoid spam
        private const float COOLDOWN_SECONDS = 3f;
        private Timer checkTimer;

        #endregion

        #region Oxide Hooks

        private void Init()
        {
            cmd.AddChatCommand(config.ChatCommandClaim, this, nameof(CmdClaim));
            cmd.AddChatCommand(config.ChatCommandCart, this, nameof(CmdCart));
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
                
                // Send heartbeat with player count
                SendHeartbeat();
            });

            // Check all currently online players
            foreach (var player in BasePlayer.activePlayerList)
            {
                CheckPendingItems(player, false);
            }
            
            // Send initial heartbeat
            SendHeartbeat();
        }
        
        private void SendHeartbeat()
        {
            if (string.IsNullOrEmpty(config.ApiKey))
            {
                DebugLog("No API key configured, skipping heartbeat");
                return;
            }
            
            string url = $"{config.ApiBaseUrl}/api/rust/heartbeat.php";
            
            var payload = new Dictionary<string, object>
            {
                { "api_key", config.ApiKey },
                { "current_players", BasePlayer.activePlayerList.Count },
                { "max_players", ConVar.Server.maxplayers },
                { "map_name", ConVar.Server.level }
            };
            
            string body = JsonConvert.SerializeObject(payload);
            
            webrequest.Enqueue(url, body, (code, response) =>
            {
                if (code == 200)
                {
                    DebugLog($"Heartbeat sent: {BasePlayer.activePlayerList.Count}/{ConVar.Server.maxplayers} players");
                }
                else
                {
                    DebugLog($"Heartbeat failed: code={code}");
                }
            }, this, RequestMethod.POST, new Dictionary<string, string>
            {
                { "Content-Type", "application/json" }
            });
        }

        private void Unload()
        {
            checkTimer?.Destroy();

            // Destroy UI for all players
            foreach (var player in BasePlayer.activePlayerList)
            {
                DestroyAllUI(player);
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

            DestroyAllUI(player);
            playerPendingCount.Remove(player.userID);
            playerNotifiedCount.Remove(player.userID);
            playerCooldowns.Remove(player.userID);
            playerCarts.Remove(player.userID);
        }

        #endregion

        #region Commands

        private void CmdClaim(BasePlayer player, string command, string[] args)
        {
            if (player == null) return;
            ClaimAllItems(player);
        }

        private void CmdCart(BasePlayer player, string command, string[] args)
        {
            if (player == null) return;
            OpenCart(player);
        }

        private void ConsoleCmdClaim(ConsoleSystem.Arg arg)
        {
            var player = arg.Player();
            if (player == null) return;
            ClaimAllItems(player);
        }

        [ConsoleCommand("gorustshop.cart.open")]
        private void ConsoleCmdCartOpen(ConsoleSystem.Arg arg)
        {
            var player = arg.Player();
            if (player == null) return;
            OpenCart(player);
        }

        [ConsoleCommand("gorustshop.cart.close")]
        private void ConsoleCmdCartClose(ConsoleSystem.Arg arg)
        {
            var player = arg.Player();
            if (player == null) return;
            DestroyCartUI(player);
        }

        [ConsoleCommand("gorustshop.cart.claimall")]
        private void ConsoleCmdCartClaimAll(ConsoleSystem.Arg arg)
        {
            var player = arg.Player();
            if (player == null) return;
            DestroyCartUI(player);
            ClaimAllItems(player);
        }

        [ConsoleCommand("gorustshop.cart.claimitem")]
        private void ConsoleCmdCartClaimItem(ConsoleSystem.Arg arg)
        {
            var player = arg.Player();
            if (player == null) return;

            string entryId = arg.GetString(0);
            if (string.IsNullOrEmpty(entryId)) return;

            ClaimSingleItem(player, entryId);
        }

        [ConsoleCommand("gorustshop.notify.open")]
        private void ConsoleCmdNotifyOpen(ConsoleSystem.Arg arg)
        {
            var player = arg.Player();
            if (player == null) return;
            DestroyNotificationUI(player);
            OpenCart(player);
        }

        [ConsoleCommand("gorustshop.notify.close")]
        private void ConsoleCmdNotifyClose(ConsoleSystem.Arg arg)
        {
            var player = arg.Player();
            if (player == null) return;
            DestroyNotificationUI(player);
        }

        [ConsoleCommand("gorustshop.check")]
        private void ConsoleCmdCheck(ConsoleSystem.Arg arg)
        {
            var player = arg.Player();
            if (player == null) return;
            CheckPendingItems(player, false);
        }

        #endregion

        #region Core Logic

        private void OpenCart(BasePlayer player)
        {
            if (player == null || !player.IsConnected) return;

            DestroyAllUI(player);
            ShowCartLoadingUI(player);

            string steamId = player.UserIDString;
            string url = $"{config.ApiBaseUrl}/api/rust/pending.php?steam_id={steamId}";

            if (!string.IsNullOrEmpty(config.ApiKey))
            {
                url += $"&api_key={config.ApiKey}";
            }

            DebugLog($"Opening cart for {player.displayName} ({steamId})");

            webrequest.Enqueue(url, null, (code, response) =>
            {
                if (player == null || !player.IsConnected) return;

                DestroyCartUI(player);

                if (code != 200 || string.IsNullOrEmpty(response))
                {
                    SendReply(player, Lang("Error", player.UserIDString));
                    DebugLog($"API error: code={code}, response={response}");
                    return;
                }

                try
                {
                    var data = JsonConvert.DeserializeObject<PendingResponse>(response);

                    if (!data.Ok)
                    {
                        SendReply(player, Lang("Error", player.UserIDString));
                        DebugLog($"API returned error: {data.Error}");
                        return;
                    }

                    playerCarts[player.userID] = data.Entries ?? new List<CartEntry>();
                    playerPendingCount[player.userID] = data.Count;

                    ShowCartUI(player, data.Entries ?? new List<CartEntry>());
                }
                catch (Exception ex)
                {
                    SendReply(player, Lang("Error", player.UserIDString));
                    DebugLog($"Error parsing response: {ex.Message}");
                }
            }, this, RequestMethod.GET);
        }

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
                    playerCarts[player.userID] = data.Entries ?? new List<CartEntry>();

                    DebugLog($"Player {player.displayName} has {count} pending items");

                    if (count > 0)
                    {
                        if (autoDeliver)
                        {
                            ClaimAllItems(player);
                        }
                        else
                        {
                            // Only notify once when items first appear (or count increases)
                            int previousNotified = 0;
                            playerNotifiedCount.TryGetValue(player.userID, out previousNotified);
                            
                            if (count > previousNotified)
                            {
                                // New items detected - notify player once
                                SendReply(player, Lang("PendingItems", player.UserIDString, count, config.ChatCommandCart));
                                playerNotifiedCount[player.userID] = count;
                            }
                        }
                    }
                    else
                    {
                        // Reset notification tracking when no items
                        playerNotifiedCount.Remove(player.userID);
                    }
                }
                catch (Exception ex)
                {
                    DebugLog($"Error parsing response: {ex.Message}");
                }
            }, this, RequestMethod.GET);
        }

        private void ClaimAllItems(BasePlayer player)
        {
            if (player == null || !player.IsConnected) return;

            // Check cooldown
            if (playerCooldowns.TryGetValue(player.userID, out float lastClaim))
            {
                float remaining = COOLDOWN_SECONDS - (UnityEngine.Time.realtimeSinceStartup - lastClaim);
                if (remaining > 0)
                {
                    SendReply(player, Lang("Cooldown", player.UserIDString, Math.Ceiling(remaining)));
                    return;
                }
            }

            playerCooldowns[player.userID] = UnityEngine.Time.realtimeSinceStartup;
            DestroyAllUI(player);

            string steamId = player.UserIDString;
            string url = $"{config.ApiBaseUrl}/api/rust/claim.php";

            if (!string.IsNullOrEmpty(config.ApiKey))
            {
                url += $"?api_key={config.ApiKey}";
            }

            string body = JsonConvert.SerializeObject(new { steam_id = steamId });

            DebugLog($"Claiming all items for {player.displayName} ({steamId})");

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
                        playerNotifiedCount.Remove(player.userID);
                        playerCarts[player.userID] = new List<CartEntry>();
                        return;
                    }

                    SendReply(player, Lang("ClaimingItems", player.UserIDString, data.Entries.Count));

                    int delivered = 0;
                    int failed = 0;

                    foreach (var entry in data.Entries)
                    {
                        string errorReason;
                        bool success = DeliverItem(player, entry, out errorReason);

                        if (success)
                        {
                            delivered++;
                            SendReply(player, Lang("ItemDelivered", player.UserIDString, entry.ProductName, entry.Quantity));
                            UpdateEntryStatus(entry.Id, "delivered", null);
                        }
                        else
                        {
                            failed++;
                            string error = errorReason ?? "Unknown error";
                            SendReply(player, Lang("ItemFailed", player.UserIDString, entry.ProductName, error));
                            UpdateEntryStatus(entry.Id, "failed", error);
                        }
                    }

                    playerPendingCount[player.userID] = 0;
                    playerNotifiedCount.Remove(player.userID);
                    playerCarts[player.userID] = new List<CartEntry>();

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

        private void ClaimSingleItem(BasePlayer player, string entryId)
        {
            if (player == null || !player.IsConnected) return;

            // Check cooldown
            if (playerCooldowns.TryGetValue(player.userID, out float lastClaim))
            {
                float remaining = COOLDOWN_SECONDS - (UnityEngine.Time.realtimeSinceStartup - lastClaim);
                if (remaining > 0)
                {
                    SendReply(player, Lang("Cooldown", player.UserIDString, Math.Ceiling(remaining)));
                    return;
                }
            }

            playerCooldowns[player.userID] = UnityEngine.Time.realtimeSinceStartup;

            // Find the entry in cached cart
            if (!playerCarts.TryGetValue(player.userID, out var cart) || cart == null)
            {
                SendReply(player, Lang("Error", player.UserIDString));
                return;
            }

            var entry = cart.FirstOrDefault(e => e.Id == entryId);
            if (entry == null)
            {
                SendReply(player, Lang("Error", player.UserIDString));
                return;
            }

            DebugLog($"Claiming single item {entryId} for {player.displayName}");

            // Mark as delivering on server
            string url = $"{config.ApiBaseUrl}/api/rust/update.php";
            if (!string.IsNullOrEmpty(config.ApiKey))
            {
                url += $"?api_key={config.ApiKey}";
            }

            var payload = new { entry_id = entryId, status = "delivering" };
            string body = JsonConvert.SerializeObject(payload);

            webrequest.Enqueue(url, body, (code, response) =>
            {
                if (player == null || !player.IsConnected) return;

                // Deliver the item
                string errorReason;
                bool success = DeliverItem(player, entry, out errorReason);

                if (success)
                {
                    SendReply(player, Lang("ItemDelivered", player.UserIDString, entry.ProductName, entry.Quantity));
                    UpdateEntryStatus(entry.Id, "delivered", null);

                    // Remove from local cache
                    if (playerCarts.TryGetValue(player.userID, out var currentCart))
                    {
                        currentCart.RemoveAll(e => e.Id == entryId);
                        playerPendingCount[player.userID] = currentCart.Count;
                        
                        // Update notification tracking
                        if (currentCart.Count == 0)
                        {
                            playerNotifiedCount.Remove(player.userID);
                        }
                        else
                        {
                            playerNotifiedCount[player.userID] = currentCart.Count;
                        }
                    }

                    // Refresh cart UI
                    if (playerCarts.TryGetValue(player.userID, out var updatedCart))
                    {
                        DestroyCartUI(player);
                        if (updatedCart.Count > 0)
                        {
                            ShowCartUI(player, updatedCart);
                        }
                    }
                }
                else
                {
                    string error = errorReason ?? "Unknown error";
                    SendReply(player, Lang("ItemFailed", player.UserIDString, entry.ProductName, error));
                    UpdateEntryStatus(entry.Id, "failed", error);
                }
            }, this, RequestMethod.POST, new Dictionary<string, string>
            {
                { "Content-Type", "application/json" }
            });
        }

        private bool DeliverItem(BasePlayer player, CartEntry entry, out string errorReason)
        {
            errorReason = null;
            
            if (player == null)
            {
                errorReason = "Player is null";
                Puts($"[ERROR] DeliverItem failed: {errorReason}");
                return false;
            }
            
            if (entry == null)
            {
                errorReason = "Entry is null";
                Puts($"[ERROR] DeliverItem failed: {errorReason}");
                return false;
            }
            
            if (string.IsNullOrEmpty(entry.RustCommand))
            {
                errorReason = $"Rust command is empty for product '{entry.ProductName}' (ID: {entry.Id})";
                Puts($"[ERROR] DeliverItem failed: {errorReason}");
                Puts($"[ERROR] Entry data: ProductId={entry.ProductId}, OrderId={entry.OrderId}, Quantity={entry.Quantity}");
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

                Puts($"[INFO] Executing command for {player.displayName}: {command}");

                // Execute the command
                ConsoleSystem.Run(ConsoleSystem.Option.Server, command);

                Puts($"[INFO] Command executed successfully");
                return true;
            }
            catch (Exception ex)
            {
                errorReason = $"Exception: {ex.Message}";
                Puts($"[ERROR] Error executing command: {ex.Message}");
                Puts($"[ERROR] Stack trace: {ex.StackTrace}");
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

        #region Cart UI

        private const string UI_CART = "GoRustShop_Cart";
        private const string UI_NOTIFICATION = "GoRustShop_Notification";

        private void ShowCartUI(BasePlayer player, List<CartEntry> entries)
        {
            if (player == null || !player.IsConnected) return;

            DestroyCartUI(player);

            var elements = new CuiElementContainer();

            // Background overlay
            elements.Add(new CuiPanel
            {
                Image = { Color = "0 0 0 0.85" },
                RectTransform = { AnchorMin = "0 0", AnchorMax = "1 1" },
                CursorEnabled = true
            }, "Overlay", UI_CART);

            // Main panel
            elements.Add(new CuiPanel
            {
                Image = { Color = "0.1 0.1 0.12 0.98" },
                RectTransform = { AnchorMin = "0.25 0.15", AnchorMax = "0.75 0.85" }
            }, UI_CART, UI_CART + "_Main");

            // Header
            elements.Add(new CuiPanel
            {
                Image = { Color = "0.15 0.15 0.18 1" },
                RectTransform = { AnchorMin = "0 0.9", AnchorMax = "1 1" }
            }, UI_CART + "_Main", UI_CART + "_Header");

            // Title
            elements.Add(new CuiLabel
            {
                Text = {
                    Text = Lang("CartTitle", player.UserIDString),
                    FontSize = 22,
                    Align = TextAnchor.MiddleLeft,
                    Color = "0.9 0.75 0.2 1"
                },
                RectTransform = { AnchorMin = "0.03 0", AnchorMax = "0.6 1" }
            }, UI_CART + "_Header");

            // Close button
            elements.Add(new CuiButton
            {
                Button = {
                    Command = "gorustshop.cart.close",
                    Color = "0.6 0.2 0.2 1"
                },
                RectTransform = { AnchorMin = "0.9 0.2", AnchorMax = "0.98 0.8" },
                Text = {
                    Text = "✕",
                    FontSize = 18,
                    Align = TextAnchor.MiddleCenter,
                    Color = "1 1 1 1"
                }
            }, UI_CART + "_Header");

            // Content area
            elements.Add(new CuiPanel
            {
                Image = { Color = "0.08 0.08 0.1 1" },
                RectTransform = { AnchorMin = "0.02 0.12", AnchorMax = "0.98 0.88" }
            }, UI_CART + "_Main", UI_CART + "_Content");

            if (entries.Count == 0)
            {
                // Empty cart message
                elements.Add(new CuiLabel
                {
                    Text = {
                        Text = Lang("CartEmpty", player.UserIDString),
                        FontSize = 20,
                        Align = TextAnchor.MiddleCenter,
                        Color = "0.5 0.5 0.5 1"
                    },
                    RectTransform = { AnchorMin = "0 0.4", AnchorMax = "1 0.6" }
                }, UI_CART + "_Content");
            }
            else
            {
                // Items list
                float itemHeight = 0.12f;
                float spacing = 0.02f;
                float startY = 0.98f;
                int maxVisible = 6;

                for (int i = 0; i < Math.Min(entries.Count, maxVisible); i++)
                {
                    var entry = entries[i];
                    float top = startY - (i * (itemHeight + spacing));
                    float bottom = top - itemHeight;

                    string itemId = $"{UI_CART}_Item_{i}";

                    // Item row background
                    elements.Add(new CuiPanel
                    {
                        Image = { Color = "0.15 0.15 0.18 1" },
                        RectTransform = { AnchorMin = $"0.01 {bottom}", AnchorMax = $"0.99 {top}" }
                    }, UI_CART + "_Content", itemId);

                    // Product icon placeholder
                    elements.Add(new CuiPanel
                    {
                        Image = { Color = "0.2 0.5 0.3 1" },
                        RectTransform = { AnchorMin = "0.01 0.1", AnchorMax = "0.08 0.9" }
                    }, itemId);

                    elements.Add(new CuiLabel
                    {
                        Text = {
                            Text = "📦",
                            FontSize = 20,
                            Align = TextAnchor.MiddleCenter,
                            Color = "1 1 1 1"
                        },
                        RectTransform = { AnchorMin = "0.01 0.1", AnchorMax = "0.08 0.9" }
                    }, itemId);

                    // Product name
                    elements.Add(new CuiLabel
                    {
                        Text = {
                            Text = entry.ProductName ?? "Item",
                            FontSize = 14,
                            Align = TextAnchor.MiddleLeft,
                            Color = "1 1 1 1"
                        },
                        RectTransform = { AnchorMin = "0.1 0.5", AnchorMax = "0.65 0.95" }
                    }, itemId);

                    // Order ID
                    elements.Add(new CuiLabel
                    {
                        Text = {
                            Text = entry.OrderId ?? "",
                            FontSize = 10,
                            Align = TextAnchor.MiddleLeft,
                            Color = "0.5 0.5 0.5 1"
                        },
                        RectTransform = { AnchorMin = "0.1 0.1", AnchorMax = "0.65 0.45" }
                    }, itemId);

                    // Quantity
                    elements.Add(new CuiLabel
                    {
                        Text = {
                            Text = Lang("CartQuantity", player.UserIDString, entry.Quantity),
                            FontSize = 14,
                            Align = TextAnchor.MiddleCenter,
                            Color = "0.9 0.75 0.2 1"
                        },
                        RectTransform = { AnchorMin = "0.65 0.2", AnchorMax = "0.75 0.8" }
                    }, itemId);

                    // Claim button for this item
                    elements.Add(new CuiButton
                    {
                        Button = {
                            Command = $"gorustshop.cart.claimitem {entry.Id}",
                            Color = "0.2 0.5 0.3 1"
                        },
                        RectTransform = { AnchorMin = "0.77 0.15", AnchorMax = "0.98 0.85" },
                        Text = {
                            Text = Lang("CartItemClaim", player.UserIDString),
                            FontSize = 12,
                            Align = TextAnchor.MiddleCenter,
                            Color = "1 1 1 1"
                        }
                    }, itemId);
                }

                // Show "and X more..." if there are more items
                if (entries.Count > maxVisible)
                {
                    float top = startY - (maxVisible * (itemHeight + spacing));
                    elements.Add(new CuiLabel
                    {
                        Text = {
                            Text = $"... and {entries.Count - maxVisible} more item(s)",
                            FontSize = 12,
                            Align = TextAnchor.MiddleCenter,
                            Color = "0.6 0.6 0.6 1"
                        },
                        RectTransform = { AnchorMin = $"0 {top - 0.08f}", AnchorMax = $"1 {top}" }
                    }, UI_CART + "_Content");
                }
            }

            // Footer
            elements.Add(new CuiPanel
            {
                Image = { Color = "0.12 0.12 0.15 1" },
                RectTransform = { AnchorMin = "0 0", AnchorMax = "1 0.1" }
            }, UI_CART + "_Main", UI_CART + "_Footer");

            // Items count
            elements.Add(new CuiLabel
            {
                Text = {
                    Text = Lang("UIItemsWaiting", player.UserIDString, entries.Count),
                    FontSize = 14,
                    Align = TextAnchor.MiddleLeft,
                    Color = "0.7 0.7 0.7 1"
                },
                RectTransform = { AnchorMin = "0.03 0", AnchorMax = "0.4 1" }
            }, UI_CART + "_Footer");

            if (entries.Count > 0)
            {
                // Claim All button
                elements.Add(new CuiButton
                {
                    Button = {
                        Command = "gorustshop.cart.claimall",
                        Color = "0.2 0.6 0.3 1"
                    },
                    RectTransform = { AnchorMin = "0.55 0.15", AnchorMax = "0.78 0.85" },
                    Text = {
                        Text = Lang("CartClaimAll", player.UserIDString),
                        FontSize = 14,
                        Align = TextAnchor.MiddleCenter,
                        Color = "1 1 1 1"
                    }
                }, UI_CART + "_Footer");
            }

            // Close button
            elements.Add(new CuiButton
            {
                Button = {
                    Command = "gorustshop.cart.close",
                    Color = "0.4 0.4 0.4 1"
                },
                RectTransform = { AnchorMin = "0.8 0.15", AnchorMax = "0.97 0.85" },
                Text = {
                    Text = Lang("CartClose", player.UserIDString),
                    FontSize = 14,
                    Align = TextAnchor.MiddleCenter,
                    Color = "1 1 1 1"
                }
            }, UI_CART + "_Footer");

            CuiHelper.AddUi(player, elements);
        }

        private void ShowCartLoadingUI(BasePlayer player)
        {
            if (player == null || !player.IsConnected) return;

            var elements = new CuiElementContainer();

            // Background overlay
            elements.Add(new CuiPanel
            {
                Image = { Color = "0 0 0 0.85" },
                RectTransform = { AnchorMin = "0 0", AnchorMax = "1 1" },
                CursorEnabled = true
            }, "Overlay", UI_CART);

            // Loading panel
            elements.Add(new CuiPanel
            {
                Image = { Color = "0.1 0.1 0.12 0.98" },
                RectTransform = { AnchorMin = "0.35 0.4", AnchorMax = "0.65 0.6" }
            }, UI_CART, UI_CART + "_Loading");

            elements.Add(new CuiLabel
            {
                Text = {
                    Text = Lang("CartLoading", player.UserIDString),
                    FontSize = 18,
                    Align = TextAnchor.MiddleCenter,
                    Color = "0.8 0.8 0.8 1"
                },
                RectTransform = { AnchorMin = "0 0", AnchorMax = "1 1" }
            }, UI_CART + "_Loading");

            CuiHelper.AddUi(player, elements);
        }

        private void DestroyCartUI(BasePlayer player)
        {
            if (player == null) return;
            CuiHelper.DestroyUi(player, UI_CART);
        }

        #endregion

        #region Notification UI

        private void ShowNotificationUI(BasePlayer player, int itemCount)
        {
            if (player == null || !player.IsConnected) return;

            DestroyNotificationUI(player);

            var elements = new CuiElementContainer();

            // Main panel
            elements.Add(new CuiPanel
            {
                Image = { Color = "0.1 0.1 0.12 0.95" },
                RectTransform = { AnchorMin = "0.35 0.85", AnchorMax = "0.65 0.95" },
                CursorEnabled = false
            }, "Overlay", UI_NOTIFICATION);

            // Left accent
            elements.Add(new CuiPanel
            {
                Image = { Color = "0.2 0.6 0.3 1" },
                RectTransform = { AnchorMin = "0 0", AnchorMax = "0.01 1" }
            }, UI_NOTIFICATION);

            // Icon
            elements.Add(new CuiLabel
            {
                Text = {
                    Text = "🛒",
                    FontSize = 24,
                    Align = TextAnchor.MiddleCenter,
                    Color = "1 1 1 1"
                },
                RectTransform = { AnchorMin = "0.02 0", AnchorMax = "0.12 1" }
            }, UI_NOTIFICATION);

            // Title
            elements.Add(new CuiLabel
            {
                Text = {
                    Text = Lang("UITitle", player.UserIDString),
                    FontSize = 14,
                    Align = TextAnchor.MiddleLeft,
                    Color = "0.9 0.75 0.2 1"
                },
                RectTransform = { AnchorMin = "0.14 0.55", AnchorMax = "0.5 0.95" }
            }, UI_NOTIFICATION);

            // Items waiting text
            elements.Add(new CuiLabel
            {
                Text = {
                    Text = Lang("UIItemsWaiting", player.UserIDString, itemCount),
                    FontSize = 12,
                    Align = TextAnchor.MiddleLeft,
                    Color = "0.7 0.7 0.7 1"
                },
                RectTransform = { AnchorMin = "0.14 0.1", AnchorMax = "0.5 0.5" }
            }, UI_NOTIFICATION);

            // Open Cart button
            elements.Add(new CuiButton
            {
                Button = {
                    Command = "gorustshop.notify.open",
                    Color = "0.2 0.5 0.3 1"
                },
                RectTransform = { AnchorMin = "0.55 0.2", AnchorMax = "0.82 0.8" },
                Text = {
                    Text = Lang("UIClaimButton", player.UserIDString),
                    FontSize = 12,
                    Align = TextAnchor.MiddleCenter,
                    Color = "1 1 1 1"
                }
            }, UI_NOTIFICATION);

            // Close button
            elements.Add(new CuiButton
            {
                Button = {
                    Command = "gorustshop.notify.close",
                    Color = "0.5 0.2 0.2 1"
                },
                RectTransform = { AnchorMin = "0.85 0.2", AnchorMax = "0.98 0.8" },
                Text = {
                    Text = "✕",
                    FontSize = 14,
                    Align = TextAnchor.MiddleCenter,
                    Color = "1 1 1 1"
                }
            }, UI_NOTIFICATION);

            CuiHelper.AddUi(player, elements);

            // Auto-hide after duration
            timer.Once(config.UINotificationDuration, () =>
            {
                if (player != null && player.IsConnected)
                {
                    DestroyNotificationUI(player);
                }
            });
        }

        private void DestroyNotificationUI(BasePlayer player)
        {
            if (player == null) return;
            CuiHelper.DestroyUi(player, UI_NOTIFICATION);
        }

        private void DestroyAllUI(BasePlayer player)
        {
            DestroyCartUI(player);
            DestroyNotificationUI(player);
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
                ClaimAllItems(player);
            }
        }

        // Public API to open cart
        private void TriggerOpenCart(BasePlayer player)
        {
            if (player != null)
            {
                OpenCart(player);
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
