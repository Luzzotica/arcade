import { useEffect, useRef, useState, useCallback } from "react";
import { useGyriiStore } from "../store/gameStore";

// SpacetimeDB connection configuration
const SPACETIMEDB_URL =
  process.env.NEXT_PUBLIC_SPACETIMEDB_URL || "ws://localhost:3000";
const MODULE_NAME =
  process.env.NEXT_PUBLIC_SPACETIMEDB_MODULE || "gyrii-server";

// This hook manages the SpacetimeDB connection
// NOTE: Requires generated TypeScript bindings from `npm run gyrii:generate`
export function useSpacetimeDB() {
  const [isConnecting, setIsConnecting] = useState(false);
  const connectionRef = useRef<any>(null);

  const {
    setConnected,
    setConnectionError,
    setLocalPlayer,
    updatePlayer,
    removePlayer,
    setCurrentLobby,
    setAvailableLobbies,
    addKillEvent,
  } = useGyriiStore();

  // Connect to SpacetimeDB
  const connect = useCallback(async () => {
    if (connectionRef.current || isConnecting) return;

    setIsConnecting(true);
    setConnectionError(null);

    try {
      // Dynamic import of SpacetimeDB SDK
      // Note: This assumes the generated bindings are available
      // For now, we'll create a mock connection

      console.log(`Connecting to SpacetimeDB at ${SPACETIMEDB_URL}...`);

      // TODO: Replace with actual SpacetimeDB SDK connection once bindings are generated
      // const SpacetimeDBClient = await import('@clockworklabs/spacetimedb-sdk');
      // connectionRef.current = await SpacetimeDBClient.connect({
      //   host: SPACETIMEDB_URL,
      //   moduleName: MODULE_NAME,
      //   onConnect: () => {
      //     setConnected(true);
      //     console.log('Connected to SpacetimeDB');
      //   },
      //   onDisconnect: () => {
      //     setConnected(false);
      //     console.log('Disconnected from SpacetimeDB');
      //   },
      //   onError: (error) => {
      //     setConnectionError(error.message);
      //     console.error('SpacetimeDB error:', error);
      //   },
      // });

      // Mock connection for development
      await new Promise((resolve) => setTimeout(resolve, 500));
      setConnected(true);
      console.log("Mock connected to SpacetimeDB");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to connect";
      setConnectionError(message);
      console.error("SpacetimeDB connection error:", error);
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting, setConnected, setConnectionError]);

  // Disconnect from SpacetimeDB
  const disconnect = useCallback(() => {
    if (connectionRef.current) {
      // connectionRef.current.disconnect();
      connectionRef.current = null;
      setConnected(false);
    }
  }, [setConnected]);

  // Reducer calls
  const createLobby = useCallback(
    async (
      name: string,
      mapId: string,
      maxPlayers: number,
      gameMode: string,
    ) => {
      if (!connectionRef.current) {
        console.warn("Not connected to SpacetimeDB");
        return;
      }
      // TODO: Call create_lobby reducer
      // await connectionRef.current.reducers.createLobby(name, mapId, maxPlayers, gameMode);
      console.log("Create lobby:", { name, mapId, maxPlayers, gameMode });
    },
    [],
  );

  const joinLobby = useCallback(async (lobbyId: string, playerName: string) => {
    if (!connectionRef.current) {
      console.warn("Not connected to SpacetimeDB");
      return;
    }
    // TODO: Call join_lobby reducer
    // await connectionRef.current.reducers.joinLobby(lobbyId, playerName);
    console.log("Join lobby:", { lobbyId, playerName });
  }, []);

  const leaveLobby = useCallback(async () => {
    if (!connectionRef.current) {
      console.warn("Not connected to SpacetimeDB");
      return;
    }
    // TODO: Call leave_lobby reducer
    // await connectionRef.current.reducers.leaveLobby();
    console.log("Leave lobby");
  }, []);

  const updateInput = useCallback(
    async (
      directionX: number,
      directionZ: number,
      aimDirectionX: number,
      aimDirectionZ: number,
      isShooting: boolean,
    ) => {
      if (!connectionRef.current) return;
      // TODO: Call update_input reducer
      // await connectionRef.current.reducers.updateInput(directionX, directionZ, aimDirectionX, aimDirectionZ, isShooting);
    },
    [],
  );

  const shoot = useCallback(async () => {
    if (!connectionRef.current) return;
    // TODO: Call shoot reducer
    // await connectionRef.current.reducers.shoot();
    console.log("Shoot");
  }, []);

  const throwGrenade = useCallback(async (throwPower: number) => {
    if (!connectionRef.current) return;
    // TODO: Call throw_grenade reducer
    // await connectionRef.current.reducers.throwGrenade(throwPower);
    console.log("Throw grenade:", { throwPower });
  }, []);

  const throwMolotov = useCallback(async (throwPower: number) => {
    if (!connectionRef.current) return;
    // TODO: Call throw_molotov reducer
    // await connectionRef.current.reducers.throwMolotov(throwPower);
    console.log("Throw molotov:", { throwPower });
  }, []);

  const useSecondary = useCallback(async () => {
    if (!connectionRef.current) return;
    // TODO: Call use_secondary reducer
    // await connectionRef.current.reducers.useSecondary();
    console.log("Use secondary");
  }, []);

  const setLoadout = useCallback(async (weapon: string, secondary: string) => {
    if (!connectionRef.current) return;
    // TODO: Call set_loadout reducer
    // await connectionRef.current.reducers.setLoadout(weapon, secondary);
    console.log("Set loadout:", { weapon, secondary });
  }, []);

  const toggleReady = useCallback(async () => {
    if (!connectionRef.current) return;
    // TODO: Call toggle_ready reducer
    // await connectionRef.current.reducers.toggleReady();
    console.log("Toggle ready");
  }, []);

  const startGame = useCallback(async () => {
    if (!connectionRef.current) return;
    // TODO: Call start_game reducer
    // await connectionRef.current.reducers.startGame();
    console.log("Start game");
  }, []);

  // Setup subscriptions when connected
  useEffect(() => {
    if (!connectionRef.current) return;

    // TODO: Set up table subscriptions once bindings are generated
    // Subscribe to Player table
    // connectionRef.current.db.player.onInsert((player) => {
    //   updatePlayer(player.identity, player);
    // });
    // connectionRef.current.db.player.onUpdate((oldPlayer, newPlayer) => {
    //   updatePlayer(newPlayer.identity, newPlayer);
    // });
    // connectionRef.current.db.player.onDelete((player) => {
    //   removePlayer(player.identity);
    // });

    // Subscribe to Lobby table
    // connectionRef.current.db.lobby.onInsert(...)
    // connectionRef.current.db.lobby.onUpdate(...)
    // connectionRef.current.db.lobby.onDelete(...)

    // Subscribe to KillEvent table
    // connectionRef.current.db.killEvent.onInsert((event) => {
    //   addKillEvent({
    //     killerId: event.killerId,
    //     killerName: event.killerName,
    //     victimId: event.victimId,
    //     victimName: event.victimName,
    //     weapon: event.weaponType,
    //     timestamp: event.timestamp,
    //   });
    // });
  }, [
    updatePlayer,
    removePlayer,
    setCurrentLobby,
    setAvailableLobbies,
    addKillEvent,
  ]);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnecting,
    connect,
    disconnect,
    // Lobby actions
    createLobby,
    joinLobby,
    leaveLobby,
    toggleReady,
    startGame,
    // Game actions
    updateInput,
    shoot,
    throwGrenade,
    throwMolotov,
    useSecondary,
    setLoadout,
  };
}
