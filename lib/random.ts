import { prisma } from "./db";

export async function randomPicksAll(count: number) {
  return prisma.$queryRawUnsafe(
    `SELECT * FROM "Video" WHERE "isAvailable" = true ORDER BY random() LIMIT $1`,
    count
  );
}

export async function randomPicksFromPlaylists(
  playlistIds: string[],
  count: number
) {
  return prisma.$queryRawUnsafe(
    `SELECT v.*
     FROM "PlaylistItem" pi
     JOIN "Video" v ON v."id" = pi."videoId"
     WHERE pi."playlistId" = ANY($1) AND v."isAvailable" = true
     ORDER BY random()
     LIMIT $2`,
    playlistIds,
    count
  );
}
