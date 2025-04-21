import ky from "ky";

const api = ky.extend({
  prefixUrl: "https://danbooru.donmai.us/",
});

export const getArtistUrls = async function* (params: UrlParams) {
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

export const getIqdbQuery = async (params: UrlParams) => {
  const data = await api
    .get("iqdb_queries.json", {
      searchParams: {
        ...params,
        limit: 1,
      },
    })
    .json<{
      post_id: number;
      score: number;
      post: {
        tag_string: string;
      };
    }[]>();

  return data.at(0);
};

/** @see {@link https://danbooru.donmai.us/wiki_pages/help:common_url_parameters} */
type UrlParams = Record<string, boolean | number | string>;
