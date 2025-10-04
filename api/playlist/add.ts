import type { VercelRequest, VercelResponse } from "@vercel/node";
import { syncPlaylist } from "../../lib/sync";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const secret = process.env.SYNC_SECRET;
    if (secret && req.headers["x-sync-secret"] !== secret)
      return res.status(401).json({ error: "unauthorized" });

    const id = String(req.query.id ?? "");
    if (!id)
      return res.status(400).json({ error: "Missing playlist URL or ID" });

    await syncPlaylist(id, true);

    res.status(200).json({ ok: true, id: id });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "add failed" });
  }
}
