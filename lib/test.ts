import "dotenv/config";
import { syncPlaylist } from "./sync";
import { extractPlaylistIdFromUrl } from "./youtube";

async function main() {
  const playlistUrl = process.argv[2]; // pass URL or playlistId
  if (!playlistUrl) {
    console.error("Usage: ts-node scripts/test-sync.ts <playlistUrl>");
    process.exit(1);
  }
  const playlistId = extractPlaylistIdFromUrl(playlistUrl);

  console.log(`Syncing playlist: ${playlistId}...`);
  await syncPlaylist(playlistId, true);
  console.log("Done ✅");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
