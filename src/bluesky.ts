import { CredentialManager, XRPC } from "@atcute/client";

export const PROFILE_URL_GLOB = "https://bsky.app/profile/*";
export const PROFILE_URL_REGEX = /(?<=https:\/\/bsky\.app\/profile\/)([^/]+)/;

/**
 * the public, cached, bluesky app view. the service is cached and has generous rate limits
 *
 * (does not support authentication)
 *
 * @see {@link https://docs.bsky.app/docs/advanced-guides/rate-limits#bluesky-appview-limits}
 */
export const appView = new XRPC({
  handler: new CredentialManager({
    service: "https://public.api.bsky.app",
  }),
});
