import type { At } from "@atcute/client/lexicons";
import { collection, kvdex, model } from "@olli/kvdex";
import { z } from "zod";

const kv = await Deno.openKv("http://kv:4512");

export const db = kvdex({
  kv,
  schema: {
    /** a collection of timestamps corresponding to previous job runs */
    runs: collection(model<number>()),

    /** maps danbooru artists to bluesky profiles */
    profiles: collection(
      model((profile: z.input<typeof Profile>) => Profile.parse(profile)),
      {
        idGenerator: (profile) => `${profile.did}:${profile.artistId}`,
        indices: {
          did: "primary",
          artistId: "secondary",
        },
      },
    ),

    /** maps danbooru posts to bluesky posts */
    posts: collection(
      model((post: z.input<typeof Post>) => Post.parse(post)),
      {
        idGenerator: (post) => `${post.postUri}:${post.postId}`,
        indices: {
          postUri: "primary",
          postId: "secondary",
        },
      },
    ),
  },
});

const Profile = z.object({
  /** the did of the bluesky profile */
  did: z.custom<At.Did>(),
  /** the id of the respective danbooru artist */
  artistId: z.number(),
  /** the last error message (e.g. when verifying the bluesky profile) */
  lastError: z.string().nullable().default(null),
  /** the timestamp of the last successful index */
  indexedAt: z.number().default(Date.now),
});

const Post = z.object({
  /** the resource uri of the bluesky post */
  postUri: z.custom<At.ResourceUri>(),
  /** the id of the respective danbooru post */
  postId: z.number(),
  /** the timestamp of the last successful index */
  indexedAt: z.number().default(Date.now),
});
