import type { FilterRecord } from "../util/type.ts";
import { CredentialManager, type RPCOptions, XRPC } from "@atcute/client";
import type { Queries } from "@atcute/client/lexicons";

// todo: improve error handling

const createPaginator = <
  K extends keyof FilterRecord<Queries, { params: { cursor?: string } }>,
  U,
>(
  nsid: K,
  getItems: (data: Queries[K]["output"]) => U[],
) => {
  return async function* (options: RPCOptions<Queries[K]>) {
    do {
      const { data } = await appView.get(nsid, options);
      yield* getItems(data);
      options.params.cursor = data.cursor;
    } while (options.params.cursor);
  };
};

/**
 * The public bluesky app view. Does not support auth. Has generous rate limits.
 * @see {@link https://docs.bsky.app/docs/advanced-guides/rate-limits#bluesky-appview-limits | Bluesky AppView Limits}
 */
export const appView = new XRPC({
  handler: new CredentialManager({
    service: "https://api.bsky.app",
  }),
});

/**
 * Gets a 'view' (with additional context) of a specified list.
 * #### errors
 * * `InvalidRequest` (list not found)
 * @see {@link https://docs.bsky.app/docs/api/app-bsky-graph-get-list | app.bsky.graph.getList}
 */
export const getList = createPaginator(
  "app.bsky.graph.getList",
  ({ items }) => items,
);

/**
 * Get a feed of recent posts from a list (posts and reposts from any actors on the list). Does not require auth.
 * #### errors
 * * `UnknownList` (list uri is not valid)
 * @see {@link https://docs.bsky.app/docs/api/app-bsky-feed-get-list-feed | app.bsky.feed.getListFeed}
 */
export const getListFeed = createPaginator(
  "app.bsky.feed.getListFeed",
  ({ feed }) => feed,
);

/**
 * Get detailed profile view of an actor. Does not require auth, but contains relevant metadata with auth.
 * #### errors
 * * `InvalidRequest` (e.g. actor is not a valid handle or did, profile not found, etc.)
 * * `AccountTakedown` (account has been suspended)
 * * `AccountDeactivated` (account is deactivated)
 * @see {@link https://docs.bsky.app/docs/api/app-bsky-actor-get-profile | app.bsky.actor.getProfile}
 */
export const getProfile = async (
  options: RPCOptions<Queries["app.bsky.actor.getProfile"]>,
) => {
  const { data } = await appView.get("app.bsky.actor.getProfile", options);
  return data;
};
