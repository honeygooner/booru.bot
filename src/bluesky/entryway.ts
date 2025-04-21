import { CredentialManager, XRPC } from "@atcute/client";
import type { AppBskyGraphListitem } from "@atcute/client/lexicons";

// note: operations heavily eat into the rate limit, so be careful
// todo:
// * cache session for subsequent runs
// * handle rate limiting

const manager = new CredentialManager({
  service: "https://bsky.social",
});

const session = await manager.login({
  identifier: Deno.env.get("BLUESKY_IDENTIFIER")!,
  password: Deno.env.get("BLUESKY_PASSWORD")!,
});

/**
 * This service is used to orchestrate account management across Bluesky PDSs and to provide an interface for interacting with bsky.social accounts.
 * @see {@link https://docs.bsky.app/docs/advanced-guides/entryway | PDS Entryway}
 */
export const entryway = new XRPC({
  handler: manager,
});

/**
 * @see {@link https://docs.bsky.app/docs/tutorials/user-lists#add-a-user-to-a-list | Add a user to a list}
 */
export const createListitem = async (
  record: Omit<AppBskyGraphListitem.Record, "$type" | "createdAt">,
) => {
  return await entryway.call("com.atproto.repo.createRecord", {
    data: {
      repo: session.did,
      collection: "app.bsky.graph.listitem",
      record: {
        $type: "app.bsky.graph.listitem",
        createdAt: new Date().toISOString(),
        ...record,
      } satisfies AppBskyGraphListitem.Record,
    },
  });
};
