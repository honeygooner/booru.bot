export const PROFILE_URL_GLOB = "https://bsky.app/profile/*";
export const PROFILE_URL_REGEX = /(?<=https:\/\/bsky\.app\/profile\/)([^/]+)/;

/** the life of any entry in ms, after which it will be considered stale */
export const TTL = 1000 * 60 * 60 * 12; // 12 hours
