import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, corsHeaders as CORS, corsPreflight } from "@/lib/api/auth";
import { roomVisible } from "@/lib/api/roomScope";

const admin = createAdminClient();

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * POST /api/rooms/[roomId]/peers/reconcile
 *
 * Host reports the absolute live roster after join/leave (WebRTC drop, kick,
 * match end, etc). Any non-host peer NOT in `active_peer_ids` is soft-
 * disconnected so capacity (room_join max_peers) frees immediately.
 *
 * Body: { host_secret, active_peer_ids: string[] }
 * Response: { ok, peer_count, disconnected_peer_ids }
 *
 * Tankii / party clients: call on every host-side roster delta with the
 * current set of connected guest peer_ids (omit host peer id).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const { roomId } = await params;

  let body: { host_secret?: string; active_peer_ids?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: CORS });
  }
  if (!body.host_secret || typeof body.host_secret !== "string") {
    return NextResponse.json({ error: "host_secret is required" }, { status: 400, headers: CORS });
  }
  if (!Array.isArray(body.active_peer_ids)) {
    return NextResponse.json(
      { error: "active_peer_ids must be an array of peer id strings" },
      { status: 400, headers: CORS },
    );
  }

  const active = new Set(
    body.active_peer_ids
      .filter((id): id is string => typeof id === "string" && id.length > 0)
      .map((id) => id.slice(0, 64)),
  );

  const { data: room } = await admin
    .from("rooms")
    .select("id, host_secret, api_key_id")
    .eq("id", roomId)
    .maybeSingle();
  if (!room || !(await roomVisible(room.api_key_id, auth.ctx))) {
    return NextResponse.json({ error: "Room not found" }, { status: 404, headers: CORS });
  }
  if (room.host_secret !== body.host_secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: CORS });
  }

  const { data: peers, error: listErr } = await admin
    .from("room_peers")
    .select("id, is_host, status")
    .eq("room_id", roomId)
    .neq("status", "disconnected");
  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 500, headers: CORS });
  }

  // Sliding TTL: reconcile is a host-authed liveness ping, so refresh the
  // room's 2h expiry window. Without this a lobby/match older than the
  // create-time expires_at was swept by the cleanup cron mid-session.
  void admin
    .from("rooms")
    .update({ expires_at: new Date(Date.now() + 2 * 3600_000).toISOString() })
    .eq("id", roomId);

  const toDisconnect = (peers ?? [])
    .filter((p) => !p.is_host && !active.has(p.id))
    .map((p) => p.id);

  if (toDisconnect.length > 0) {
    const { error: updErr } = await admin
      .from("room_peers")
      .update({ status: "disconnected", last_seen_at: new Date().toISOString() })
      .in("id", toDisconnect)
      .eq("room_id", roomId);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500, headers: CORS });
    }
  }

  // peer_count matches room_join capacity: non-host, non-disconnected.
  const remaining = (peers ?? []).filter(
    (p) => !p.is_host && p.status !== "disconnected" && !toDisconnect.includes(p.id),
  ).length;

  return NextResponse.json(
    {
      ok: true,
      peer_count: remaining,
      disconnected_peer_ids: toDisconnect,
    },
    { headers: CORS },
  );
}
