// MobMovementControl.cs - Oxide/uMod Plugin for Rust
// Disables mob movement at specified online threshold while keeping bot shooting AI
// Author: q_jack (Dreemurr)

using Newtonsoft.Json;
using Oxide.Core;
using Oxide.Core.Plugins;
using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.AI;

namespace Oxide.Plugins
{
    [Info("MobMovementControl", "Dreemurr", "1.0.0")]
    [Description("Disables mob movement at specified player count while keeping RT bots shooting AI")]
    public class MobMovementControl : RustPlugin
    {
        #region Configuration

        private Configuration config;

        private class Configuration
        {
            [JsonProperty("Player Threshold (disable movement when online >= this)")]
            public int PlayerThreshold { get; set; } = 50;

            [JsonProperty("Check Interval (seconds)")]
            public float CheckInterval { get; set; } = 10f;

            [JsonProperty("Disable Animal Movement")]
            public bool DisableAnimalMovement { get; set; } = true;

            [JsonProperty("Disable NPC Movement")]
            public bool DisableNPCMovement { get; set; } = true;

            [JsonProperty("Exclude Raidable Bases Bots")]
            public bool ExcludeRaidableBasesBots { get; set; } = true;

            [JsonProperty("Exclude BotSpawn Bots")]
            public bool ExcludeBotSpawnBots { get; set; } = true;

            [JsonProperty("Exclude NPC from Plugins (prefab contains)")]
            public List<string> ExcludePrefabs { get; set; } = new List<string>
            {
                "scientistnpc_roam",
                "scientistnpc_patrol"
            };

            [JsonProperty("Keep Bot Shooting AI")]
            public bool KeepBotShootingAI { get; set; } = true;

            [JsonProperty("Notify Admins on State Change")]
            public bool NotifyAdmins { get; set; } = true;

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
                ["MovementDisabled"] = "Mob movement DISABLED (online: {0}/{1})",
                ["MovementEnabled"] = "Mob movement ENABLED (online: {0}/{1})",
                ["StatusDisabled"] = "Mob movement is currently DISABLED",
                ["StatusEnabled"] = "Mob movement is currently ENABLED",
                ["StatusInfo"] = "Online: {0} | Threshold: {1} | Animals frozen: {2} | NPCs frozen: {3}",
                ["ForceEnabled"] = "Mob movement force ENABLED by admin",
                ["ForceDisabled"] = "Mob movement force DISABLED by admin",
                ["AutoMode"] = "Mob movement set to AUTO mode",
                ["NoPermission"] = "You don't have permission to use this command"
            }, this);

            lang.RegisterMessages(new Dictionary<string, string>
            {
                ["MovementDisabled"] = "\u0414\u0432\u0438\u0436\u0435\u043d\u0438\u0435 \u043c\u043e\u0431\u043e\u0432 \u041e\u0422\u041a\u041b\u042e\u0427\u0415\u041d\u041e (\u043e\u043d\u043b\u0430\u0439\u043d: {0}/{1})",
                ["MovementEnabled"] = "\u0414\u0432\u0438\u0436\u0435\u043d\u0438\u0435 \u043c\u043e\u0431\u043e\u0432 \u0412\u041a\u041b\u042e\u0427\u0415\u041d\u041e (\u043e\u043d\u043b\u0430\u0439\u043d: {0}/{1})",
                ["StatusDisabled"] = "\u0414\u0432\u0438\u0436\u0435\u043d\u0438\u0435 \u043c\u043e\u0431\u043e\u0432 \u0441\u0435\u0439\u0447\u0430\u0441 \u041e\u0422\u041a\u041b\u042e\u0427\u0415\u041d\u041e",
                ["StatusEnabled"] = "\u0414\u0432\u0438\u0436\u0435\u043d\u0438\u0435 \u043c\u043e\u0431\u043e\u0432 \u0441\u0435\u0439\u0447\u0430\u0441 \u0412\u041a\u041b\u042e\u0427\u0415\u041d\u041e",
                ["StatusInfo"] = "\u041e\u043d\u043b\u0430\u0439\u043d: {0} | \u041f\u043e\u0440\u043e\u0433: {1} | \u0416\u0438\u0432\u043e\u0442\u043d\u044b\u0445 \u0437\u0430\u043c\u043e\u0440\u043e\u0436\u0435\u043d\u043e: {2} | NPC \u0437\u0430\u043c\u043e\u0440\u043e\u0436\u0435\u043d\u043e: {3}",
                ["ForceEnabled"] = "\u0414\u0432\u0438\u0436\u0435\u043d\u0438\u0435 \u043c\u043e\u0431\u043e\u0432 \u043f\u0440\u0438\u043d\u0443\u0434\u0438\u0442\u0435\u043b\u044c\u043d\u043e \u0412\u041a\u041b\u042e\u0427\u0415\u041d\u041e \u0430\u0434\u043c\u0438\u043d\u043e\u043c",
                ["ForceDisabled"] = "\u0414\u0432\u0438\u0436\u0435\u043d\u0438\u0435 \u043c\u043e\u0431\u043e\u0432 \u043f\u0440\u0438\u043d\u0443\u0434\u0438\u0442\u0435\u043b\u044c\u043d\u043e \u041e\u0422\u041a\u041b\u042e\u0427\u0415\u041d\u041e \u0430\u0434\u043c\u0438\u043d\u043e\u043c",
                ["AutoMode"] = "\u0414\u0432\u0438\u0436\u0435\u043d\u0438\u0435 \u043c\u043e\u0431\u043e\u0432 \u0432 \u0410\u0412\u0422\u041e \u0440\u0435\u0436\u0438\u043c\u0435",
                ["NoPermission"] = "\u0423 \u0432\u0430\u0441 \u043d\u0435\u0442 \u043f\u0440\u0430\u0432 \u0434\u043b\u044f \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u043d\u0438\u044f \u044d\u0442\u043e\u0439 \u043a\u043e\u043c\u0430\u043d\u0434\u044b"
            }, this, "ru");
        }

        private string Lang(string key, string userId = null, params object[] args)
        {
            return string.Format(lang.GetMessage(key, this, userId), args);
        }

        #endregion

        #region Fields

        private const string PERMISSION_ADMIN = "mobmovementcontrol.admin";

        private Timer checkTimer;
        private bool movementDisabled = false;
        private bool forceMode = false; // true = force state, false = auto
        private bool forcedState = false; // if forceMode, this is the forced state

        private int frozenAnimals = 0;
        private int frozenNPCs = 0;

        // Cache for tracking disabled entities
        private HashSet<ulong> disabledEntities = new HashSet<ulong>();

        // Reference to other plugins for bot detection
        [PluginReference]
        private Plugin RaidableBases, BotSpawn, Kits;

        #endregion

        #region Oxide Hooks

        private void Init()
        {
            permission.RegisterPermission(PERMISSION_ADMIN, this);

            cmd.AddChatCommand("mobcontrol", this, nameof(CmdMobControl));
            cmd.AddChatCommand("mc", this, nameof(CmdMobControl));
            cmd.AddConsoleCommand("mobcontrol", this, nameof(ConsoleCmdMobControl));
        }

        private void OnServerInitialized()
        {
            // Start periodic check
            checkTimer = timer.Every(config.CheckInterval, () =>
            {
                CheckAndUpdateState();
            });

            // Initial check
            timer.Once(2f, () => CheckAndUpdateState());

            Puts($"MobMovementControl initialized. Threshold: {config.PlayerThreshold} players");
        }

        private void Unload()
        {
            checkTimer?.Destroy();

            // Re-enable all movement on unload
            EnableAllMovement();
        }

        // Hook when animal spawns
        private void OnEntitySpawned(BaseAnimalNPC animal)
        {
            if (animal == null) return;

            timer.Once(0.5f, () =>
            {
                if (animal != null && movementDisabled && config.DisableAnimalMovement)
                {
                    DisableEntityMovement(animal);
                }
            });
        }

        // Hook when NPC spawns
        private void OnEntitySpawned(NPCPlayer npc)
        {
            if (npc == null) return;

            timer.Once(0.5f, () =>
            {
                if (npc != null && movementDisabled && config.DisableNPCMovement)
                {
                    if (!ShouldExcludeNPC(npc))
                    {
                        DisableNPCMovement(npc);
                    }
                }
            });
        }

        // Hook when scientist spawns (more specific)
        private void OnEntitySpawned(ScientistNPC scientist)
        {
            if (scientist == null) return;

            timer.Once(0.5f, () =>
            {
                if (scientist != null && movementDisabled && config.DisableNPCMovement)
                {
                    if (!ShouldExcludeNPC(scientist))
                    {
                        DisableNPCMovement(scientist);
                    }
                }
            });
        }

        #endregion

        #region Commands

        private void CmdMobControl(BasePlayer player, string command, string[] args)
        {
            if (!permission.UserHasPermission(player.UserIDString, PERMISSION_ADMIN))
            {
                SendReply(player, Lang("NoPermission", player.UserIDString));
                return;
            }

            if (args.Length == 0)
            {
                // Show status
                ShowStatus(player);
                return;
            }

            string subCommand = args[0].ToLower();

            switch (subCommand)
            {
                case "on":
                case "enable":
                    forceMode = true;
                    forcedState = false;
                    EnableAllMovement();
                    SendReply(player, Lang("ForceEnabled", player.UserIDString));
                    break;

                case "off":
                case "disable":
                    forceMode = true;
                    forcedState = true;
                    DisableAllMovement();
                    SendReply(player, Lang("ForceDisabled", player.UserIDString));
                    break;

                case "auto":
                    forceMode = false;
                    CheckAndUpdateState();
                    SendReply(player, Lang("AutoMode", player.UserIDString));
                    break;

                case "status":
                default:
                    ShowStatus(player);
                    break;
            }
        }

        private void ConsoleCmdMobControl(ConsoleSystem.Arg arg)
        {
            if (arg.Connection != null && !arg.IsAdmin)
            {
                arg.ReplyWith("You need admin permissions for this command.");
                return;
            }

            string[] args = arg.Args ?? new string[0];

            if (args.Length == 0)
            {
                arg.ReplyWith(GetStatusString());
                return;
            }

            string subCommand = args[0].ToLower();

            switch (subCommand)
            {
                case "on":
                case "enable":
                    forceMode = true;
                    forcedState = false;
                    EnableAllMovement();
                    arg.ReplyWith("Mob movement force ENABLED");
                    break;

                case "off":
                case "disable":
                    forceMode = true;
                    forcedState = true;
                    DisableAllMovement();
                    arg.ReplyWith("Mob movement force DISABLED");
                    break;

                case "auto":
                    forceMode = false;
                    CheckAndUpdateState();
                    arg.ReplyWith("Mob movement set to AUTO mode");
                    break;

                case "status":
                default:
                    arg.ReplyWith(GetStatusString());
                    break;
            }
        }

        private void ShowStatus(BasePlayer player)
        {
            string status = movementDisabled
                ? Lang("StatusDisabled", player.UserIDString)
                : Lang("StatusEnabled", player.UserIDString);

            string info = Lang("StatusInfo", player.UserIDString,
                BasePlayer.activePlayerList.Count,
                config.PlayerThreshold,
                frozenAnimals,
                frozenNPCs);

            string mode = forceMode ? $"Mode: FORCED ({(forcedState ? "OFF" : "ON")})" : "Mode: AUTO";

            SendReply(player, $"{status}\n{info}\n{mode}");
        }

        private string GetStatusString()
        {
            string status = movementDisabled ? "DISABLED" : "ENABLED";
            string mode = forceMode ? $"FORCED ({(forcedState ? "OFF" : "ON")})" : "AUTO";

            return $"Mob Movement: {status}\n" +
                   $"Online: {BasePlayer.activePlayerList.Count} | Threshold: {config.PlayerThreshold}\n" +
                   $"Animals frozen: {frozenAnimals} | NPCs frozen: {frozenNPCs}\n" +
                   $"Mode: {mode}";
        }

        #endregion

        #region Core Logic

        private void CheckAndUpdateState()
        {
            if (forceMode)
            {
                // In force mode, apply forced state
                if (forcedState && !movementDisabled)
                {
                    DisableAllMovement();
                }
                else if (!forcedState && movementDisabled)
                {
                    EnableAllMovement();
                }
                return;
            }

            int currentOnline = BasePlayer.activePlayerList.Count;
            bool shouldDisable = currentOnline >= config.PlayerThreshold;

            if (shouldDisable && !movementDisabled)
            {
                DisableAllMovement();
                NotifyStateChange(true, currentOnline);
            }
            else if (!shouldDisable && movementDisabled)
            {
                EnableAllMovement();
                NotifyStateChange(false, currentOnline);
            }

            DebugLog($"Check: Online={currentOnline}, Threshold={config.PlayerThreshold}, Disabled={movementDisabled}");
        }

        private void DisableAllMovement()
        {
            movementDisabled = true;
            frozenAnimals = 0;
            frozenNPCs = 0;
            disabledEntities.Clear();

            // Disable animal movement
            if (config.DisableAnimalMovement)
            {
                foreach (var animal in BaseNetworkable.serverEntities.OfType<BaseAnimalNPC>())
                {
                    if (animal != null && !animal.IsDestroyed)
                    {
                        DisableEntityMovement(animal);
                        frozenAnimals++;
                    }
                }
            }

            // Disable NPC movement
            if (config.DisableNPCMovement)
            {
                // NPCPlayer (scientists, etc.)
                foreach (var npc in BaseNetworkable.serverEntities.OfType<NPCPlayer>())
                {
                    if (npc != null && !npc.IsDestroyed && !ShouldExcludeNPC(npc))
                    {
                        DisableNPCMovement(npc);
                        frozenNPCs++;
                    }
                }

                // ScientistNPC specifically
                foreach (var scientist in BaseNetworkable.serverEntities.OfType<ScientistNPC>())
                {
                    if (scientist != null && !scientist.IsDestroyed && !ShouldExcludeNPC(scientist))
                    {
                        if (!disabledEntities.Contains(scientist.net.ID.Value))
                        {
                            DisableNPCMovement(scientist);
                            frozenNPCs++;
                        }
                    }
                }
            }

            Puts($"Movement disabled for {frozenAnimals} animals and {frozenNPCs} NPCs");
        }

        private void EnableAllMovement()
        {
            movementDisabled = false;

            // Re-enable animal movement
            foreach (var animal in BaseNetworkable.serverEntities.OfType<BaseAnimalNPC>())
            {
                if (animal != null && !animal.IsDestroyed)
                {
                    EnableEntityMovement(animal);
                }
            }

            // Re-enable NPC movement
            foreach (var npc in BaseNetworkable.serverEntities.OfType<NPCPlayer>())
            {
                if (npc != null && !npc.IsDestroyed)
                {
                    EnableNPCMovement(npc);
                }
            }

            frozenAnimals = 0;
            frozenNPCs = 0;
            disabledEntities.Clear();

            Puts("All mob movement re-enabled");
        }

        private void DisableEntityMovement(BaseAnimalNPC animal)
        {
            if (animal == null) return;

            try
            {
                // Disable NavMeshAgent
                var navAgent = animal.GetComponent<NavMeshAgent>();
                if (navAgent != null)
                {
                    navAgent.isStopped = true;
                    navAgent.velocity = Vector3.zero;
                    navAgent.enabled = false;
                }

                // Disable BaseNavigator
                var navigator = animal.GetComponent<BaseNavigator>();
                if (navigator != null)
                {
                    navigator.Pause();
                    navigator.ClearFacingDirectionOverride();
                }

                // Stop the animal's brain
                var brain = animal.GetComponent<BaseAIBrain<BaseAnimalNPC>>();
                if (brain != null)
                {
                    // We want to stop movement but keep the animal responsive
                    brain.Navigator?.Pause();
                }

                // Stop current movement
                animal.StopMoving();

                disabledEntities.Add(animal.net.ID.Value);

                DebugLog($"Disabled movement for animal: {animal.ShortPrefabName} ({animal.net.ID})");
            }
            catch (Exception ex)
            {
                DebugLog($"Error disabling animal movement: {ex.Message}");
            }
        }

        private void EnableEntityMovement(BaseAnimalNPC animal)
        {
            if (animal == null) return;

            try
            {
                // Re-enable NavMeshAgent
                var navAgent = animal.GetComponent<NavMeshAgent>();
                if (navAgent != null)
                {
                    navAgent.enabled = true;
                    navAgent.isStopped = false;
                }

                // Re-enable BaseNavigator
                var navigator = animal.GetComponent<BaseNavigator>();
                if (navigator != null)
                {
                    navigator.Resume();
                }

                // Resume brain
                var brain = animal.GetComponent<BaseAIBrain<BaseAnimalNPC>>();
                if (brain != null)
                {
                    brain.Navigator?.Resume();
                }

                disabledEntities.Remove(animal.net.ID.Value);

                DebugLog($"Enabled movement for animal: {animal.ShortPrefabName}");
            }
            catch (Exception ex)
            {
                DebugLog($"Error enabling animal movement: {ex.Message}");
            }
        }

        private void DisableNPCMovement(BasePlayer npc)
        {
            if (npc == null) return;

            try
            {
                // Disable NavMeshAgent - stops pathfinding movement
                var navAgent = npc.GetComponent<NavMeshAgent>();
                if (navAgent != null)
                {
                    navAgent.isStopped = true;
                    navAgent.velocity = Vector3.zero;
                    navAgent.enabled = false;
                }

                // Disable BaseNavigator
                var navigator = npc.GetComponent<BaseNavigator>();
                if (navigator != null)
                {
                    navigator.Pause();
                    navigator.ClearFacingDirectionOverride();
                }

                // For NPCPlayerApex (older AI), we need special handling
                var npcPlayer = npc as NPCPlayer;
                if (npcPlayer != null)
                {
                    // Stop movement but keep combat AI
                    npcPlayer.StopMoving();

                    // Don't disable the brain completely - we want them to still aim and shoot
                    if (config.KeepBotShootingAI)
                    {
                        // Only pause navigation, not the entire brain
                        var navigator2 = npcPlayer.GetComponent<BaseNavigator>();
                        if (navigator2 != null)
                        {
                            navigator2.Pause();
                        }
                    }
                }

                // For ScientistNPC specifically
                var scientist = npc as ScientistNPC;
                if (scientist != null)
                {
                    scientist.StopMoving();
                }

                disabledEntities.Add(npc.net.ID.Value);

                DebugLog($"Disabled movement for NPC: {npc.ShortPrefabName} ({npc.net.ID})");
            }
            catch (Exception ex)
            {
                DebugLog($"Error disabling NPC movement: {ex.Message}");
            }
        }

        private void EnableNPCMovement(BasePlayer npc)
        {
            if (npc == null) return;

            try
            {
                // Re-enable NavMeshAgent
                var navAgent = npc.GetComponent<NavMeshAgent>();
                if (navAgent != null)
                {
                    navAgent.enabled = true;
                    navAgent.isStopped = false;
                }

                // Re-enable BaseNavigator
                var navigator = npc.GetComponent<BaseNavigator>();
                if (navigator != null)
                {
                    navigator.Resume();
                }

                disabledEntities.Remove(npc.net.ID.Value);

                DebugLog($"Enabled movement for NPC: {npc.ShortPrefabName}");
            }
            catch (Exception ex)
            {
                DebugLog($"Error enabling NPC movement: {ex.Message}");
            }
        }

        private bool ShouldExcludeNPC(BasePlayer npc)
        {
            if (npc == null) return true;

            string prefabName = npc.ShortPrefabName ?? "";
            string fullPrefab = npc.PrefabName ?? "";

            // Check exclusion prefabs
            foreach (var exclude in config.ExcludePrefabs)
            {
                if (prefabName.IndexOf(exclude, StringComparison.OrdinalIgnoreCase) >= 0 ||
                    fullPrefab.IndexOf(exclude, StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    DebugLog($"Excluding NPC by prefab: {prefabName}");
                    return true;
                }
            }

            // Check if this is a RaidableBases bot
            if (config.ExcludeRaidableBasesBots && RaidableBases != null)
            {
                try
                {
                    var result = RaidableBases.Call("IsRaidableBasesNpc", npc);
                    if (result is bool isRB && isRB)
                    {
                        DebugLog($"Excluding RaidableBases NPC: {prefabName}");
                        return true;
                    }
                }
                catch { }
            }

            // Check if this is a BotSpawn bot
            if (config.ExcludeBotSpawnBots && BotSpawn != null)
            {
                try
                {
                    var result = BotSpawn.Call("IsSpawnedBot", npc);
                    if (result is bool isBS && isBS)
                    {
                        DebugLog($"Excluding BotSpawn NPC: {prefabName}");
                        return true;
                    }
                }
                catch { }
            }

            // Special check for RT bots (usually have specific owner data or spawn from events)
            // RT bots are typically spawned by plugins like RaidableBases, so the above check should catch them
            // Additional check based on ownership or monument association
            if (npc.OwnerID != 0)
            {
                // NPC has an owner - might be a player-summoned or plugin-controlled bot
                // These are often RT or defense bots, so we exclude them to keep shooting AI
                DebugLog($"Excluding owned NPC: {prefabName} (Owner: {npc.OwnerID})");
                return true;
            }

            return false;
        }

        private void NotifyStateChange(bool disabled, int currentOnline)
        {
            if (!config.NotifyAdmins) return;

            string message = disabled
                ? Lang("MovementDisabled", null, currentOnline, config.PlayerThreshold)
                : Lang("MovementEnabled", null, currentOnline, config.PlayerThreshold);

            // Notify all admins
            foreach (var player in BasePlayer.activePlayerList)
            {
                if (player.IsAdmin || permission.UserHasPermission(player.UserIDString, PERMISSION_ADMIN))
                {
                    SendReply(player, $"[MobControl] {message}");
                }
            }

            Puts(message);
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

        // Public API: Check if movement is currently disabled
        private bool IsMovementDisabled()
        {
            return movementDisabled;
        }

        // Public API: Get current frozen counts
        private Dictionary<string, int> GetFrozenCounts()
        {
            return new Dictionary<string, int>
            {
                { "animals", frozenAnimals },
                { "npcs", frozenNPCs }
            };
        }

        // Public API: Force disable movement
        private void ForceDisable()
        {
            forceMode = true;
            forcedState = true;
            DisableAllMovement();
        }

        // Public API: Force enable movement
        private void ForceEnable()
        {
            forceMode = true;
            forcedState = false;
            EnableAllMovement();
        }

        // Public API: Set auto mode
        private void SetAutoMode()
        {
            forceMode = false;
            CheckAndUpdateState();
        }

        // Public API: Exclude specific NPC from movement control
        private void ExcludeNPC(BasePlayer npc)
        {
            if (npc != null && disabledEntities.Contains(npc.net.ID.Value))
            {
                EnableNPCMovement(npc);
            }
        }

        #endregion
    }
}
