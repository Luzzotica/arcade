"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/supabase/auth-context";
import { createClient } from "@/lib/supabase/client";
import { useGyriiStore, WeaponType, SecondaryType } from "../store/gameStore";

const WEAPONS: { id: WeaponType; name: string; description: string }[] = [
  {
    id: "smg",
    name: "Submachine Gun",
    description: "Rapid fire, medium damage",
  },
  {
    id: "dualMachineGun",
    name: "Dual Machine Gun",
    description: "Fast fire rate, lower damage",
  },
  {
    id: "chainGun",
    name: "Chain Gun",
    description: "Very fast fire, needs spin-up",
  },
  {
    id: "photonRifle",
    name: "Photon Rifle",
    description: "Beam weapon, high damage",
  },
  {
    id: "bazooka",
    name: "Bazooka",
    description: "Explosive rocket, click to detonate",
  },
  {
    id: "flamethrower",
    name: "Flamethrower",
    description: "Continuous fire damage",
  },
];

const SECONDARIES: { id: SecondaryType; name: string; description: string }[] =
  [
    {
      id: "popupKnives",
      name: "Popup Knives",
      description: "Melee damage to nearby enemies",
    },
    {
      id: "bubbleShield",
      name: "Bubble Shield",
      description: "50% damage reduction",
    },
    {
      id: "selfDestructNuke",
      name: "Self Destruct",
      description: "Massive explosion on death",
    },
  ];

const NEON_COLORS = [
  { r: 0, g: 255, b: 255, name: "Cyan" },
  { r: 255, g: 0, b: 255, name: "Magenta" },
  { r: 255, g: 255, b: 0, name: "Yellow" },
  { r: 0, g: 255, b: 128, name: "Spring" },
  { r: 255, g: 128, b: 0, name: "Orange" },
  { r: 128, g: 0, b: 255, name: "Purple" },
];

export default function LobbyUI() {
  const [view, setView] = useState<"main" | "lobbies" | "loadout" | "create">(
    "main",
  );
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();
  const {
    playerName,
    setPlayerName,
    playerColor,
    setPlayerColor,
    selectedWeapon,
    setSelectedWeapon,
    selectedSecondary,
    setSelectedSecondary,
    availableLobbies,
    setGameState,
  } = useGyriiStore();

  const [newLobbyName, setNewLobbyName] = useState("");
  const [newLobbyMaxPlayers, setNewLobbyMaxPlayers] = useState(8);
  const [isGuest, setIsGuest] = useState(true);
  const [displayNameLoading, setDisplayNameLoading] = useState(true);

  // Fetch user's display name if logged in
  useEffect(() => {
    const fetchDisplayName = async () => {
      if (authLoading) return;

      if (user) {
        setDisplayNameLoading(true);
        try {
          const { data } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", user.id)
            .single();

          if (data?.display_name) {
            setPlayerName(data.display_name);
            setIsGuest(false);
          } else {
            // User logged in but no display name set - use fallback
            const fallbackName =
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split("@")[0] ||
              "Player";
            setPlayerName(fallbackName);
            setIsGuest(false);
          }
        } catch (error) {
          console.error("Failed to fetch display name:", error);
          // Fallback to guest mode if fetch fails
          setPlayerName("Guest");
          setIsGuest(true);
        } finally {
          setDisplayNameLoading(false);
        }
      } else {
        // Not logged in - guest mode
        if (!playerName || playerName === "Player") {
          setPlayerName("Guest");
        }
        setIsGuest(true);
        setDisplayNameLoading(false);
      }
    };

    fetchDisplayName();
  }, [user, authLoading, supabase, setPlayerName]);

  const handleQuickPlay = () => {
    // TODO: Connect to server and join/create lobby
    setGameState("playing");
  };

  const handleCreateLobby = () => {
    // TODO: Connect to server and create lobby
    console.log("Creating lobby:", newLobbyName, newLobbyMaxPlayers);
    setView("main");
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-black/90 via-purple-900/20 to-black/90 backdrop-blur-sm">
      <div className="max-w-2xl w-full mx-4">
        {/* Title */}
        <h1 className="text-6xl font-bold text-center mb-8">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-500 to-yellow-400">
            GYRII
          </span>
        </h1>
        <p className="text-center text-gray-400 mb-8">Neon Ball Shooter</p>

        {view === "main" && (
          <div className="space-y-4">
            {/* Player Name */}
            <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 border border-cyan-500/30">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs text-gray-400">
                  PLAYER NAME
                </label>
                {isGuest && (
                  <span className="text-xs text-yellow-400/70 bg-yellow-400/10 px-2 py-0.5 rounded">
                    Guest
                  </span>
                )}
                {!isGuest && (
                  <span className="text-xs text-green-400/70 bg-green-400/10 px-2 py-0.5 rounded">
                    Logged In
                  </span>
                )}
              </div>
              {displayNameLoading ? (
                <div className="w-full bg-gray-900 border border-cyan-500/50 rounded px-3 py-2 text-cyan-300/50 animate-pulse">
                  Loading...
                </div>
              ) : (
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={20}
                  className="w-full bg-gray-900 border border-cyan-500/50 rounded px-3 py-2 text-cyan-300 focus:outline-none focus:border-cyan-400"
                  placeholder={isGuest ? "Enter your name" : "Display name"}
                />
              )}
              {!isGuest && user && (
                <p className="text-xs text-gray-500 mt-1">
                  Using your account display name (you can change it)
                </p>
              )}
              {isGuest && (
                <p className="text-xs text-yellow-400/70 mt-1">
                  Playing as guest - sign in to use your account name
                </p>
              )}
            </div>

            {/* Color Selection */}
            <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 border border-pink-500/30">
              <label className="block text-xs text-gray-400 mb-2">
                BALL COLOR
              </label>
              <div className="flex gap-2">
                {NEON_COLORS.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setPlayerColor(color)}
                    className={`w-10 h-10 rounded-full transition-transform hover:scale-110 ${
                      playerColor.r === color.r &&
                      playerColor.g === color.g &&
                      playerColor.b === color.b
                        ? "ring-2 ring-white ring-offset-2 ring-offset-black"
                        : ""
                    }`}
                    style={{
                      backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                      boxShadow: `0 0 15px rgb(${color.r}, ${color.g}, ${color.b})`,
                    }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Menu Buttons */}
            <div className="space-y-3 mt-6">
              <button
                onClick={handleQuickPlay}
                className="w-full py-4 bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 rounded-lg text-white font-bold text-lg transition-all shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50"
              >
                QUICK PLAY
              </button>

              <button
                onClick={() => setView("lobbies")}
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 border border-cyan-500/50 rounded-lg text-cyan-300 font-semibold transition-all"
              >
                BROWSE LOBBIES
              </button>

              <button
                onClick={() => setView("create")}
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 border border-pink-500/50 rounded-lg text-pink-300 font-semibold transition-all"
              >
                CREATE LOBBY
              </button>

              <button
                onClick={() => setView("loadout")}
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 border border-yellow-500/50 rounded-lg text-yellow-300 font-semibold transition-all"
              >
                LOADOUT
              </button>
            </div>
          </div>
        )}

        {view === "lobbies" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-cyan-400">
                Available Lobbies
              </h2>
              <button
                onClick={() => setView("main")}
                className="text-gray-400 hover:text-white"
              >
                ← Back
              </button>
            </div>

            <div className="bg-black/50 backdrop-blur-sm rounded-lg border border-cyan-500/30 overflow-hidden">
              {availableLobbies.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  No lobbies available. Create one!
                </div>
              ) : (
                <div className="divide-y divide-cyan-500/20">
                  {availableLobbies.map((lobby) => (
                    <div
                      key={lobby.id}
                      className="p-4 hover:bg-cyan-500/10 cursor-pointer transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-lg font-semibold text-white">
                            {lobby.name}
                          </div>
                          <div className="text-sm text-gray-400">
                            {lobby.gameMode} • {lobby.mapId}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-cyan-400">
                            {lobby.playerCount}/{lobby.maxPlayers}
                          </div>
                          <div className="text-xs text-gray-500">
                            {lobby.gameState}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {view === "create" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-pink-400">Create Lobby</h2>
              <button
                onClick={() => setView("main")}
                className="text-gray-400 hover:text-white"
              >
                ← Back
              </button>
            </div>

            <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 border border-pink-500/30 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-2">
                  LOBBY NAME
                </label>
                <input
                  type="text"
                  value={newLobbyName}
                  onChange={(e) => setNewLobbyName(e.target.value)}
                  maxLength={30}
                  placeholder="My Awesome Lobby"
                  className="w-full bg-gray-900 border border-pink-500/50 rounded px-3 py-2 text-pink-300 focus:outline-none focus:border-pink-400"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-2">
                  MAX PLAYERS
                </label>
                <div className="flex gap-2">
                  {[2, 4, 6, 8, 12, 16].map((num) => (
                    <button
                      key={num}
                      onClick={() => setNewLobbyMaxPlayers(num)}
                      className={`px-4 py-2 rounded ${
                        newLobbyMaxPlayers === num
                          ? "bg-pink-600 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateLobby}
                disabled={!newLobbyName.trim()}
                className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-bold transition-all"
              >
                CREATE LOBBY
              </button>
            </div>
          </div>
        )}

        {view === "loadout" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-yellow-400">Loadout</h2>
              <button
                onClick={() => setView("main")}
                className="text-gray-400 hover:text-white"
              >
                ← Back
              </button>
            </div>

            {/* Primary Weapon */}
            <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 border border-yellow-500/30">
              <h3 className="text-xs text-gray-400 mb-3">PRIMARY WEAPON</h3>
              <div className="grid grid-cols-2 gap-2">
                {WEAPONS.map((weapon) => (
                  <button
                    key={weapon.id}
                    onClick={() => setSelectedWeapon(weapon.id)}
                    className={`p-3 rounded-lg text-left transition-all ${
                      selectedWeapon === weapon.id
                        ? "bg-yellow-600/30 border-2 border-yellow-500"
                        : "bg-gray-800 border-2 border-transparent hover:border-yellow-500/50"
                    }`}
                  >
                    <div className="font-semibold text-white">
                      {weapon.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {weapon.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Secondary Ability */}
            <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 border border-purple-500/30">
              <h3 className="text-xs text-gray-400 mb-3">SECONDARY ABILITY</h3>
              <div className="grid grid-cols-1 gap-2">
                {SECONDARIES.map((secondary) => (
                  <button
                    key={secondary.id}
                    onClick={() => setSelectedSecondary(secondary.id)}
                    className={`p-3 rounded-lg text-left transition-all ${
                      selectedSecondary === secondary.id
                        ? "bg-purple-600/30 border-2 border-purple-500"
                        : "bg-gray-800 border-2 border-transparent hover:border-purple-500/50"
                    }`}
                  >
                    <div className="font-semibold text-white">
                      {secondary.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {secondary.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
