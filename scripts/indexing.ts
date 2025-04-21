import { getList, getListFeed, getProfile } from "@/bluesky/appview.ts";
import { createListitem } from "@/bluesky/entryway.ts";
import { getArtistUrls, getIqdbQuery } from "@/danbooru/api.ts";
import { db } from "@/db.ts";
import { PROFILE_URL_GLOB, PROFILE_URL_REGEX, TTL } from "@/util/const.ts";
import { mapByAsync } from "@/util/helper.ts";
import { XRPCError } from "@atcute/client";
import type { At, ComAtprotoLabelDefs } from "@atcute/client/lexicons";
import { pooledMap } from "@std/async/pool";

const LABELS: ComAtprotoLabelDefs.LabelValue[] = ["nudity", "porn", "sexual"];
// set to the max limit to reduce the number of requests
// see: https://danbooru.donmai.us/wiki_pages/help:users
const LIMIT = 1000;
const POOL_LIMIT = 10;
const SCORE_THRESHOLD = 92;

export default async function indexing() {
  // stage 1: cache artist profiles from danbooru in local database
  console.info(indexing.name, "stage 1:");

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
  console.info(indexing.name, "stage 2:");

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

  // todo: sync / remove artist profiles from the list

  // stage 3: index posts
  console.info(indexing.name, "stage 3:");

  const listFeed = getListFeed({ params: { list, limit: 100 } });
  await Array.fromAsync(
    pooledMap(POOL_LIMIT, listFeed, async ({ post }) => {
      // skip is already indexed
      if (await db.posts.findByPrimaryIndex("postUri", post.uri)) {
        console.log("✔", post.uri, "(cache)");
        return;
      }

      // skip if not supported by iqdb
      if (post.embed?.$type !== "app.bsky.embed.images#view") {
        console.log("✘", post.uri, "(unsupported)");
        return;
      }

      // skip if missing labels
      if (!post.labels?.some(({ val }) => LABELS.includes(val))) {
        console.log("✘", post.uri, "(unlabelled)");
        return;
      }

      // check iqdb for the embedded images
      // note: using `POOL_LIMIT` for convenience, but max is only 4
      await Array.fromAsync(
        pooledMap(POOL_LIMIT, post.embed.images, async ({ thumb }) => {
          const query = await getIqdbQuery({ "search[url]": thumb });

          // skip if no match
          if (!query) {
            console.log("✘ iqdb:", thumb, "(no match)");
            return;
          }

          // skip if score is too low
          if (query.score < SCORE_THRESHOLD) {
            console.log("✘ iqdb:", thumb, "(low score)", query.score);
            return;
          }

          // add the post to the database
          const { post_id: postId, post: { tag_string: tags } } = query;
          await db.posts.add(
            { postUri: post.uri, postId, tags },
            { overwrite: true },
          );
        }),
      );
    }),
  );
}
