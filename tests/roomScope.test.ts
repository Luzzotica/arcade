import { describe, it, expect, vi } from "vitest";
import { makeRoomScope, type KeyProjectSource } from "@/lib/api/roomScope";

// Regression: rooms were scoped to the exact api_key_id that created them, so
// a guest authing with a DIFFERENT valid key of the SAME project (dev vs prod
// build, rotated key, mobile build with an older key) got 404 "Room not
// found" on lookup/join for a room that existed. Scope is the PROJECT.

const directory: Record<string, string> = {
  "key-dev": "proj-tankii",
  "key-prod": "proj-tankii",
  "key-old": "proj-tankii",
  "key-other": "proj-someone-else",
};

function makeSource(): KeyProjectSource & { calls: { ofKey: number; ofProject: number } } {
  const calls = { ofKey: 0, ofProject: 0 };
  return {
    calls,
    async projectOfKey(keyId) {
      calls.ofKey++;
      return directory[keyId] ?? null;
    },
    async keysOfProject(projectId) {
      calls.ofProject++;
      return Object.entries(directory)
        .filter(([, p]) => p === projectId)
        .map(([k]) => k);
    },
  };
}

const ctx = (apiKeyId: string, projectId: string) => ({ apiKeyId, projectId });

describe("roomVisible (project-wide room scope)", () => {
  it("same key still matches (fast path, no directory read)", async () => {
    const src = makeSource();
    const scope = makeRoomScope(src);
    expect(await scope.roomVisible("key-prod", ctx("key-prod", "proj-tankii"))).toBe(true);
    expect(src.calls.ofKey).toBe(0);
  });

  it("DIFFERENT key of the SAME project matches — the cross-build join fix", async () => {
    const scope = makeRoomScope(makeSource());
    // Host created the room on the prod build (key-prod); guest runs a dev
    // build (key-dev). This exact case used to 404 as "Room not found".
    expect(await scope.roomVisible("key-prod", ctx("key-dev", "proj-tankii"))).toBe(true);
    // Rotated key: room predates the rotation, caller has the new key.
    expect(await scope.roomVisible("key-old", ctx("key-prod", "proj-tankii"))).toBe(true);
  });

  it("keys of another project are still isolated (tenant boundary)", async () => {
    const scope = makeRoomScope(makeSource());
    expect(await scope.roomVisible("key-other", ctx("key-prod", "proj-tankii"))).toBe(false);
    expect(await scope.roomVisible("key-prod", ctx("key-other", "proj-someone-else"))).toBe(false);
  });

  it("unknown or missing room key never matches", async () => {
    const scope = makeRoomScope(makeSource());
    expect(await scope.roomVisible("key-vanished", ctx("key-prod", "proj-tankii"))).toBe(false);
    expect(await scope.roomVisible(null, ctx("key-prod", "proj-tankii"))).toBe(false);
    expect(await scope.roomVisible(undefined, ctx("key-prod", "proj-tankii"))).toBe(false);
  });

  it("caches key→project within the TTL (one read per key)", async () => {
    const src = makeSource();
    const scope = makeRoomScope(src);
    await scope.roomVisible("key-prod", ctx("key-dev", "proj-tankii"));
    await scope.roomVisible("key-prod", ctx("key-dev", "proj-tankii"));
    await scope.roomVisible("key-prod", ctx("key-dev", "proj-tankii"));
    expect(src.calls.ofKey).toBe(1);
  });
});

describe("projectKeyIds (list/lookup query filter)", () => {
  it("returns every key of the caller's project", async () => {
    const scope = makeRoomScope(makeSource());
    const ids = await scope.projectKeyIds(ctx("key-dev", "proj-tankii"));
    expect(new Set(ids)).toEqual(new Set(["key-dev", "key-prod", "key-old"]));
  });

  it("always includes the caller's own key even if the directory read fails", async () => {
    const src = makeSource();
    src.keysOfProject = vi.fn().mockRejectedValue(new Error("db down"));
    const scope = makeRoomScope(src);
    const ids = await scope.projectKeyIds(ctx("key-dev", "proj-tankii"));
    expect(ids).toContain("key-dev");
  });

  it("caches per project within the TTL", async () => {
    const src = makeSource();
    const scope = makeRoomScope(src);
    await scope.projectKeyIds(ctx("key-dev", "proj-tankii"));
    await scope.projectKeyIds(ctx("key-prod", "proj-tankii"));
    expect(src.calls.ofProject).toBe(1);
  });
});
