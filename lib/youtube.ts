// lib/youtube.ts
const API_BASE = "https://www.googleapis.com/youtube/v3";
const API_KEY = process.env.YOUTUBE_API_KEY!;
if (!API_KEY) throw new Error("Missing YOUTUBE_API_KEY env var");

/** Accepts raw playlistId or any YouTube URL that contains ?list=... */
export function extractPlaylistIdFromUrl(urlOrId: string): string {
  if (!urlOrId.includes("://") && /^[A-Za-z0-9_-]+$/.test(urlOrId))
    return urlOrId;
  try {
    const u = new URL(urlOrId);
    const list = u.searchParams.get("list");
    if (list) return list;
  } catch {}
  throw new Error("Invalid playlist URL or ID (no 'list' param found).");
}

export type YTPlaylistItem = {
  id: string;
  title?: string;
  description?: string;
  channelId?: string;
  channelTitle?: string;
  publishedAt?: string; // RFC3339
  thumbnail?: string;
  position?: number;
  addedAt?: string; // RFC3339 (when added to the playlist)
};

export async function fetchAllPlaylistItems(
  playlistId: string,
  opts?: { ifNoneMatch?: string }
): Promise<{ items: YTPlaylistItem[]; etag?: string }> {
  const out: YTPlaylistItem[] = [];
  let pageToken: string | undefined;
  let lastEtag: string | undefined;

  for (let page = 0; page < 50; page++) {
    const url = new URL(`${API_BASE}/playlistItems`);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", API_KEY);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const { json, etag, status } = await fetchJSON(url.toString(), {
      headers: opts?.ifNoneMatch
        ? { "If-None-Match": opts.ifNoneMatch }
        : undefined,
    });

    if (status === 304) {
      return { items: [], etag: opts?.ifNoneMatch };
    }

    if (!Array.isArray(json.items)) break;
    if (etag) lastEtag = etag;

    for (const it of json.items) {
      const s = it?.snippet;
      const vid = s?.resourceId?.videoId as string | undefined;
      if (!vid) continue;

      const thumb =
        s?.thumbnails?.maxres?.url ||
        s?.thumbnails?.high?.url ||
        s?.thumbnails?.medium?.url ||
        s?.thumbnails?.default?.url;

      out.push({
        id: vid,
        title: s?.title,
        description: s?.description,
        channelId: s?.channelId,
        channelTitle: s?.channelTitle,
        publishedAt: s?.publishedAt,
        thumbnail: thumb,
        position: typeof s?.position === "number" ? s.position : undefined,
        addedAt: s?.publishedAt,
      });
    }

    pageToken = json.nextPageToken as string | undefined;
    if (!pageToken) break;
  }

  return { items: out, etag: lastEtag };
}

export async function fetchVideoDurationsSeconds(
  videoIds: string[]
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);
    const url = new URL(`${API_BASE}/videos`);
    url.searchParams.set("part", "contentDetails");
    url.searchParams.set("id", chunk.join(","));
    url.searchParams.set("key", API_KEY);

    const { json } = await fetchJSON(url.toString());
    for (const it of json.items ?? []) {
      const id = it?.id as string | undefined;
      const iso = it?.contentDetails?.duration as string | undefined;
      if (id && iso) result[id] = parseISODurationToSeconds(iso);
    }
  }
  return result;
}

// Fetch playlist metadata (title + channel info)
export async function fetchPlaylistMeta(
  playlistId: string
): Promise<{ title?: string; channelId?: string; channelTitle?: string }> {
  const url = new URL(`${API_BASE}/playlists`);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("id", playlistId);
  url.searchParams.set("key", API_KEY);

  const { json } = await fetchJSON(url.toString());
  const s = json?.items?.[0]?.snippet;
  if (!s) return {};
  return {
    title: s.title as string | undefined,
    channelId: s.channelId as string | undefined,
    channelTitle: s.channelTitle as string | undefined,
  };
}

async function fetchJSON(
  url: string,
  init?: RequestInit
): Promise<{ json: any; etag?: string; status: number }> {
  const res = await fetch(url, init);

  const etag = res.headers.get("etag") ?? undefined;

  if (res.status === 304) {
    return { json: { items: [], nextPageToken: undefined }, etag, status: 304 };
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube API ${res.status}: ${text}`);
  }
  const json = await res.json();
  return { json, etag, status: res.status };
}

export function parseISODurationToSeconds(iso: string): number {
  const re = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/i;
  const m = re.exec(iso);
  if (!m) return 0;
  const days = Number(m[1] ?? 0);
  const hours = Number(m[2] ?? 0);
  const minutes = Number(m[3] ?? 0);
  const seconds = Number(m[4] ?? 0);
  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}
