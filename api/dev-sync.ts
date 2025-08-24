import type { VercelRequest, VercelResponse } from "@vercel/node";
import { extractPlaylistIdFromUrl } from "../lib/youtube";
import { syncPlaylist } from "../lib/sync";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const urlOrId = String(req.query.url ?? "");
    if (!urlOrId) return res.status(400).json({ error: "Missing ?url=" });

    const id = extractPlaylistIdFromUrl(urlOrId);
    await syncPlaylist(id, true);
    res.status(200).json({ ok: true, id });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "sync failed" });
  }
}
