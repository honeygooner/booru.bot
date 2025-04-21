import type { At } from "@atcute/client/lexicons";
import { collection, kvdex, model } from "@olli/kvdex";
import { z } from "zod";

export const db = kvdex({
  kv: await Deno.openKv("http://denokv:4512"),
  schema: {
    /** maps danbooru artists to bluesky profiles */
    profiles: collection(
      model((profile: z.input<typeof Profile>) => Profile.parse(profile)),
      {
        idGenerator: (profile) => `${profile.did}:${profile.artistId}`,
        indices: {
          did: "primary",
          handle: "secondary",
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
  /** the handle of the bluesky profile (WARNING: can change, use with discretion) */
  handle: z.custom<At.Handle>(),
  /** the id of the respective danbooru artist */
  artistId: z.number(),
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
