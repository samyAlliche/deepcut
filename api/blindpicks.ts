import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomPicksAll, randomPicksFromPlaylists } from "../lib/random";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const count = Math.min(
      parseInt(String(req.query.count ?? "3"), 10) || 3,
      50
    );
    const format = String(req.query.format ?? "json").toLowerCase();
    const playlists = String(req.query.playlists ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const rows: any[] = playlists.length
      ? ((await randomPicksFromPlaylists(playlists, count)) as any[])
      : ((await randomPicksAll(count)) as any[]);

    if (format === "links") {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res
        .status(200)
        .send(
          rows.map((r) => `https://www.youtube.com/watch?v=${r.id}`).join("\n")
        );
    }

    res.status(200).json({
      count: rows.length,
      picks: rows.map((r) => ({
        videoId: r.id,
        url: `https://www.youtube.com/watch?v=${r.id}`,
        title: r.title,
        description: r.description,
        thumbnail: r.thumbnail,
        channelTitle: r.channelTitle,
        publishedAt: r.publishedAt,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "random picks failed" });
  }
}
