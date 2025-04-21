import ky from "ky";

const api = ky.extend({
  prefixUrl: "https://danbooru.donmai.us/",
});

export const getArtistUrls = async function* (
  /** @see {@link https://danbooru.donmai.us/wiki_pages/help:common_url_parameters} */
  params: Record<string, boolean | number | string>,
) {
  while (true) {
    const data = await api
      .get("artist_urls.json", {
        searchParams: {
          ...params,
          only: "id,artist_id,url",
        },
      })
      .json<{
        id: number;
        artist_id: number;
        url: string;
      }[]>();

    if (!data.length) break;
    yield* data;
    params.page = `b${data.at(-1)!.id}`;
  }
};
