import { getList, getProfile } from "@/bluesky/appview.ts";
import { createListitem } from "@/bluesky/entryway.ts";
import { getArtistUrls } from "@/danbooru.ts";
import { db } from "@/db.ts";
import { PROFILE_URL_GLOB, PROFILE_URL_REGEX, TTL } from "@/util/const.ts";
import { mapByAsync } from "@/util/helper.ts";
import type { At } from "@atcute/client/lexicons";
import { XRPCError } from "@atcute/client";
import { pooledMap } from "@std/async/pool";

// set to the max limit to reduce the number of requests
// see: https://danbooru.donmai.us/wiki_pages/help:users
const LIMIT = 1000;
const POOL_LIMIT = 10;

export default async function indexProfiles() {
  // stage 1: cache artist profiles from danbooru in local database
  console.info(indexProfiles.name, "stage 1:");

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
      if (profile) {
        console.log("✔", profile.value.did, "(cache)");
        return;
      }

      // request up-to-date profile data from the app view
      await getProfile({ params: { actor } })
        .then(async ({ did, handle }) => {
          await db.profiles.add(
            { did, handle, artistId },
            { overwrite: true, expireIn: TTL },
          );
          console.log("✔", did);
        })
        .catch((error) => {
          console.error("✘", actor);
          console.error(error instanceof Error ? error.message : error);
        });
    }),
  );

  // stage 2: index artist profiles in bluesky list
  console.info(indexProfiles.name, "stage 2:");

  const { result: profiles } = await db.profiles.getMany();
  console.info("profiles:", profiles.length);

  const list = Deno.env.get("BLUESKY_LIST")! as At.ResourceUri;
  // attempt to speed up lookup by first creating a map of the list items
  const listitems = await mapByAsync(
    getList({ params: { list, limit: 100 } }), // todo: add error handling
    ({ subject }) => subject.did,
  );

  await Array.fromAsync(
    pooledMap(POOL_LIMIT, profiles, async ({ value: profile }) => {
      // skip if the profile is already in the list
      if (listitems.has(profile.did)) {
        console.log("✔", profile.did, "(list)");
        return;
      }

      // add the profile to the list
      // may throw for rate limits, but we should exit the process anyway
      await createListitem({ list, subject: profile.did })
        .then(() => {
          console.log("✔", profile.did);
        })
        .catch((error) => {
          console.error("✘", profile.did);
          console.error(error instanceof Error ? error.message : error);

          if (error instanceof XRPCError && error.status === 429) {
            return Promise.reject(error);
          }
        });
    }),
  );
}
