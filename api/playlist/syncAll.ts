import type { VercelRequest, VercelResponse } from "@vercel/node";
import { syncPlaylist } from "../../lib/sync";
import { prisma } from "../../lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const secret = process.env.SYNC_SECRET;
    if (secret && req.headers["x-sync-secret"] !== secret)
      return res.status(401).json({ error: "unauthorized" });

    const playlists = await prisma.playlist.findMany({
      select: { id: true },
    });

    let synced = 0;
    for (const p of playlists) {
      try {
        await syncPlaylist(p.id, true);
        synced++;
      } catch (e: any) {
        console.error(`Failed to sync playlist ${p.id}:`, e.message);
      }
    }

    res.status(200).json({
      ok: true,
      synced,
      total: playlists.length,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "sync all failed" });
  }
}
