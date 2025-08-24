import { prisma } from "./db";
import type { YTPlaylistItem } from "./youtube";
import {
  fetchAllPlaylistItems,
  fetchVideoDurationsSeconds,
  fetchPlaylistMeta,
} from "./youtube";

export async function upsertPlaylistById(playlistId: string) {
  await prisma.playlist.upsert({
    where: { id: playlistId },
    create: { id: playlistId },
    update: {},
  });
}

export async function syncPlaylist(playlistId: string, withDurations = false) {
  const { items, etag } = await fetchAllPlaylistItems(playlistId);

  // ensure playlist exists (needed for FK on PlaylistItem)
  await prisma.playlist.upsert({
    where: { id: playlistId },
    create: { id: playlistId },
    update: {},
  });

  // fetch playlist metadata (title + channel) and persist
  try {
    const meta = await fetchPlaylistMeta(playlistId);
    if (meta?.channelId) {
      await prisma.channel.upsert({
        where: { id: meta.channelId },
        create: { id: meta.channelId, title: meta.channelTitle ?? null },
        update: { title: meta.channelTitle ?? undefined },
      });
    }
    await prisma.playlist.update({
      where: { id: playlistId },
      data: {
        title: meta.title ?? undefined,
        channelId: meta.channelId ?? undefined,
        etag: etag ?? undefined,
        itemCount: items.length,
      },
    });
  } catch (_) {
    // ignore metadata errors, continue syncing items
  }

  // Optional: get durations in bulk
  let durationMap: Record<string, number> = {};
  if (withDurations && items.length) {
    durationMap = await fetchVideoDurationsSeconds(items.map((i) => i.id));
  }

  const seen = new Set<string>();
  for (const s of items) {
    seen.add(s.id);

    // ensure channel exists if we're going to set channelId
    if (s.channelId) {
      await prisma.channel.upsert({
        where: { id: s.channelId },
        create: { id: s.channelId, title: (s as any).channelTitle ?? null },
        update: { title: (s as any).channelTitle ?? undefined },
      });
    }

    // upsert video
    await prisma.video.upsert({
      where: { id: s.id },
      create: toVideoCreate(s, durationMap[s.id]),
      update: toVideoUpdate(s, durationMap[s.id]),
    });

    // upsert playlist item
    await prisma.playlistItem.upsert({
      where: { playlistId_videoId: { playlistId, videoId: s.id } },
      create: {
        playlistId,
        videoId: s.id,
        position: s.position ?? null,
        addedAt: s.addedAt ? new Date(s.addedAt) : null,
      },
      update: {
        position: s.position ?? undefined,
        addedAt: s.addedAt ? new Date(s.addedAt) : undefined,
      },
    });
  }

  const existing = await prisma.playlistItem.findMany({
    where: { playlistId },
    select: { videoId: true },
  });
  const missing = existing.map((x) => x.videoId).filter((id) => !seen.has(id));
  if (missing.length) {
    await prisma.video.updateMany({
      where: { id: { in: missing } },
      data: { isAvailable: false },
    });
  }
}

function toVideoCreate(s: YTPlaylistItem, dur?: number) {
  return {
    id: s.id,
    title: s.title ?? null,
    description: s.description ?? null,
    channelId: s.channelId ?? null,
    publishedAt: s.publishedAt ? new Date(s.publishedAt) : null,
    durationSeconds: typeof dur === "number" ? dur : null,
    thumbnail: s.thumbnail ? { url: s.thumbnail } : undefined,
    isAvailable: true,
  };
}
function toVideoUpdate(s: YTPlaylistItem, dur?: number) {
  return {
    title: s.title ?? undefined,
    description: s.description ?? undefined,
    channelId: s.channelId ?? undefined,
    publishedAt: s.publishedAt ? new Date(s.publishedAt) : undefined,
    durationSeconds: typeof dur === "number" ? dur : undefined,
    thumbnail: s.thumbnail ? { url: s.thumbnail } : undefined,
    isAvailable: true,
  };
}
