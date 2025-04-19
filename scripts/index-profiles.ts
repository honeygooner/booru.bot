import { appView, PROFILE_URL_GLOB, PROFILE_URL_REGEX } from "@/bluesky.ts";
import { getArtistUrls } from "@/danbooru.ts";
import { db, TTL } from "@/db.ts";
import { chunk } from "@/util.ts";
import { XRPCError } from "@atcute/client";
import type { At } from "@atcute/client/lexicons";

// todo: handle rate limit errors

// set to the max limit to reduce the number of requests
// see: https://danbooru.donmai.us/wiki_pages/help:users
const LIMIT = 1000;
const CHUNK_SIZE = 5;

export default async function indexProfiles() {
  const artistUrls = getArtistUrls({
    "search[url_matches]": PROFILE_URL_GLOB,
    limit: LIMIT,
  });

  for await (const data of artistUrls) {
    console.count("page");

    // batch requests to speed up the process
    for (const batch of chunk(data, CHUNK_SIZE)) {
      const requests = batch.map(async ({ artist_id: artistId, url }) => {
        // match should reasonably be present given the search param glob
        const [identifier] = url.match(PROFILE_URL_REGEX)!;
        const requestId = `${indexProfiles.name}:${identifier}`;

        // skip if an error from a matching request is cached
        const error = await db.errors.find(requestId);
        if (error) {
          console.error("✘ (cache):", error.value, identifier);
          return;
        }

        // skip if the profile is cached and not expired
        // deno-fmt-ignore
        const profile =
          await db.profiles.findByPrimaryIndex("did", identifier as At.Did) ||
          await db.profiles.getOneBySecondaryIndex("handle", identifier as At.Handle);
        if (profile && Date.now() - profile.value.indexedAt < TTL) {
          console.info("✔ (cache):", profile.value.did);
          return;
        }

        // request up-to-date profile data from the app view
        try {
          const { data } = await appView.get("app.bsky.actor.getProfile", {
            params: {
              actor: identifier as At.Identifier,
            },
          });
          const { did, handle } = data;
          await db.profiles.add({ did, handle, artistId }, { overwrite: true });
          await db.errors.delete(requestId);

          console.info("✔ indexed:", did);
        } catch (error) {
          if (!(error instanceof XRPCError) || !error.kind) throw error;
          await db.errors.set(requestId, error.kind, { expireIn: TTL });

          console.error("✘ errored:", error.kind, identifier);
        }
      });

      await Promise.allSettled(requests);
    }
  }

  console.info("profiles:", await db.profiles.count());
  console.countReset("page");
}
