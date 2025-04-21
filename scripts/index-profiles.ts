import { appView, PROFILE_URL_GLOB, PROFILE_URL_REGEX } from "@/bluesky.ts";
import { getArtistUrls } from "@/danbooru.ts";
import { db, TTL } from "@/db.ts";
import type { At } from "@atcute/client/lexicons";
import { pooledMap } from "@std/async/pool";

// set to the max limit to reduce the number of requests
// see: https://danbooru.donmai.us/wiki_pages/help:users
const LIMIT = 1000;
const POOL_LIMIT = 10;

export default async function indexProfiles() {
  const artistUrls = getArtistUrls({
    "search[url_matches]": PROFILE_URL_GLOB,
    limit: LIMIT,
  });

  await Array.fromAsync(
    pooledMap(POOL_LIMIT, artistUrls, async ({ artist_id: artistId, url }) => {
      // match should reasonably be present given the search param glob
      const actor = url.match(PROFILE_URL_REGEX)![0] as At.Identifier;

      // skip if the profile is cached and not expired
      const profile =
        await db.profiles.findByPrimaryIndex("did", actor as At.Did) ||
        await db.profiles.getOneBySecondaryIndex("handle", actor as At.Handle);
      if (profile && Date.now() - profile.value.indexedAt < TTL) {
        console.info("✔", profile.value.did, "(cache)");
        return;
      }

      // request up-to-date profile data from the app view
      await appView.get("app.bsky.actor.getProfile", { params: { actor } })
        .then(async ({ data: { did, handle } }) => {
          await db.profiles.add({ did, handle, artistId }, { overwrite: true });
          console.info("✔", did);
        })
        .catch((error) => {
          console.error("✘", actor);
          console.error(error instanceof Error ? error.message : error);
        });
    }),
  );

  console.info("profiles:", await db.profiles.count());
}
