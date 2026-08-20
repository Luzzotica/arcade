import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, corsHeaders as CORS, corsPreflight } from "@/lib/api/auth";
import { roomVisible } from "@/lib/api/roomScope";

const admin = createAdminClient();

export async function OPTIONS() {
  return corsPreflight();
}

// PATCH /api/rooms/[roomId]/peers/[peerId]
// Body: { peer_secret, status?, metadata?, display_name? }
// Self-update: peer presence ping, controller_config updates, name edits.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roomId: string; peerId: string }> },
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const { roomId, peerId } = await params;

  let body: {
    peer_secret?: string;
    status?: "joined" | "connected" | "disconnected";
    metadata?: Record<string, unknown>;
    display_name?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: CORS });
  }
  if (!body.peer_secret) {
    return NextResponse.json({ error: "peer_secret is required" }, { status: 400, headers: CORS });
  }

  // Look up the peer + its parent room together so we can verify both the
  // peer secret AND that the room belongs to the caller's api_key.
  const { data: peer } = await admin
    .from("room_peers")
    .select("id, peer_secret, room_id, rooms!inner(api_key_id)")
    .eq("id", peerId)
    .eq("room_id", roomId)
    .maybeSingle();
  if (!peer || !(await roomVisible((peer as unknown as { rooms?: { api_key_id?: string } }).rooms?.api_key_id, auth.ctx))) {
    return NextResponse.json({ error: "Peer not found" }, { status: 404, headers: CORS });
  }
  if (peer.peer_secret !== body.peer_secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: CORS });
  }

  const updates: Record<string, unknown> = { last_seen_at: new Date().toISOString() };
  if (body.status && ["joined", "connected", "disconnected"].includes(body.status)) {
    updates.status = body.status;
  }
  if (body.metadata && typeof body.metadata === "object") {
    updates.metadata = body.metadata;
  }
  if (typeof body.display_name === "string") {
    updates.display_name = body.display_name.slice(0, 60);
  }

  const { error: updErr } = await admin.from("room_peers").update(updates).eq("id", peerId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500, headers: CORS });

  return NextResponse.json({ ok: true }, { headers: CORS });
}

// DELETE /api/rooms/[roomId]/peers/[peerId]?peer_secret=... | ?host_secret=...
// Soft-leave (status=disconnected). Capacity counts only non-disconnected
// non-host peers, so freeing ghosts is required for join/leave reliability.
//
// Auth (either):
//   - peer_secret: the peer leaves themselves
//   - host_secret: host frees a seat when WebRTC drops / roster changes
//     (cannot disconnect the host peer row)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roomId: string; peerId: string }> },
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const { roomId, peerId } = await params;

  const url = new URL(request.url);
  const peerSecret = url.searchParams.get("peer_secret") ?? "";
  const hostSecret = url.searchParams.get("host_secret") ?? "";
  if (!peerSecret && !hostSecret) {
    return NextResponse.json(
      { error: "peer_secret or host_secret is required" },
      { status: 400, headers: CORS },
    );
  }

  const { data: peer } = await admin
    .from("room_peers")
    .select("id, peer_secret, is_host, rooms!inner(api_key_id, host_secret)")
    .eq("id", peerId)
    .eq("room_id", roomId)
    .maybeSingle();
  const room = (peer as unknown as {
    rooms?: { api_key_id?: string; host_secret?: string };
  } | null)?.rooms;
  if (!peer || !(await roomVisible(room?.api_key_id, auth.ctx))) {
    return NextResponse.json({ error: "Peer not found" }, { status: 404, headers: CORS });
  }

  if (peerSecret) {
    if (peer.peer_secret !== peerSecret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: CORS });
    }
  } else if (hostSecret) {
    if (room?.host_secret !== hostSecret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: CORS });
    }
    if (peer.is_host) {
      return NextResponse.json(
        { error: "Cannot disconnect host peer; end the room instead" },
        { status: 400, headers: CORS },
      );
    }
  }

  const { error } = await admin
    .from("room_peers")
    .update({ status: "disconnected", last_seen_at: new Date().toISOString() })
    .eq("id", peerId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });

  return NextResponse.json({ ok: true }, { headers: CORS });
}
