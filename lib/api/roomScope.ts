// ─────────────────────────────────────────────────────────────────────────────
// Room scoping: PROJECT-wide, not per-API-key.
//
// Rooms store the api_key_id that created them, but visibility/join checks
// must match by PROJECT: a project routinely has multiple valid keys (dev vs
// prod builds, mobile TestFlight with an older baked key, key rotation).
// Scoping reads to the exact key row made a room 404 ("Room not found") for
// any guest whose build carried a *different* key of the same project — the
// join failures that plagued Tankii playtests.
//
// Tenant isolation is unchanged: keys of a DIFFERENT project still never see
// the room.
// ─────────────────────────────────────────────────────────────────────────────

import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiKeyContext } from "./auth";

export interface KeyProjectSource {
  /** project_id owning this api key id, or null if unknown. */
  projectOfKey(keyId: string): Promise<string | null>;
  /** All api key ids belonging to a project (revoked included — an old build
   *  with a revoked key can't AUTH anyway, and rooms created before a
   *  rotation must stay visible to the new key). */
  keysOfProject(projectId: string): Promise<string[]>;
}

const CACHE_TTL_MS = 60_000;

/** Build a scope checker over a key↔project source. Exported for tests. */
export function makeRoomScope(src: KeyProjectSource) {
  const keyToProject = new Map<string, { v: string | null; at: number }>();
  const projectToKeys = new Map<string, { v: string[]; at: number }>();

  const projectOfKey = async (keyId: string): Promise<string | null> => {
    const hit = keyToProject.get(keyId);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.v;
    const v = await src.projectOfKey(keyId);
    keyToProject.set(keyId, { v, at: Date.now() });
    return v;
  };

  return {
    /** May the authed caller see/mutate a room created under `roomApiKeyId`? */
    async roomVisible(roomApiKeyId: string | null | undefined, ctx: ApiKeyContext): Promise<boolean> {
      if (!roomApiKeyId) return false;
      if (roomApiKeyId === ctx.apiKeyId) return true; // fast path: same key
      const project = await projectOfKey(roomApiKeyId);
      return project !== null && project === ctx.projectId;
    },

    /** Every key id of the caller's project — for `.in("api_key_id", …)`
     *  query filters (list / lookup). Always includes the caller's own key
     *  even if the directory read fails, so behavior can only widen. */
    async projectKeyIds(ctx: ApiKeyContext): Promise<string[]> {
      const hit = projectToKeys.get(ctx.projectId);
      if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
        return hit.v.includes(ctx.apiKeyId) ? hit.v : [...hit.v, ctx.apiKeyId];
      }
      let ids: string[] = [];
      try {
        ids = await src.keysOfProject(ctx.projectId);
      } catch {
        ids = [];
      }
      if (!ids.includes(ctx.apiKeyId)) ids = [...ids, ctx.apiKeyId];
      projectToKeys.set(ctx.projectId, { v: ids, at: Date.now() });
      return ids;
    },
  };
}

// Lazy admin client: tests import this module without Supabase env vars.
let adminClient: ReturnType<typeof createAdminClient> | null = null;
function admin() {
  adminClient ??= createAdminClient();
  return adminClient;
}

const defaultSource: KeyProjectSource = {
  async projectOfKey(keyId) {
    const { data } = await admin().from("api_keys").select("project_id").eq("id", keyId).maybeSingle();
    return (data?.project_id as string | undefined) ?? null;
  },
  async keysOfProject(projectId) {
    const { data } = await admin().from("api_keys").select("id").eq("project_id", projectId);
    return (data ?? []).map((r) => r.id as string);
  },
};

const scope = makeRoomScope(defaultSource);

/** May the authed caller see/mutate a room created under `roomApiKeyId`? */
export const roomVisible = scope.roomVisible;
/** Key ids for `.in("api_key_id", …)` filters on project-scoped room reads. */
export const projectKeyIds = scope.projectKeyIds;
