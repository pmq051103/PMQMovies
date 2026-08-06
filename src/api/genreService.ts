import { apiGet } from "@/api/axiosClient";
import { API_ENDPOINTS } from "@/constants";
import type { APIListResponse, Genre, GenreListResponse, MovieListItem } from "@/types";

/**
 * Raw shape returned by the `/the-loai` endpoint. The genre list is nested
 * under `data.items`; some deployments return a flat `items` array instead,
 * so we defensively support both.
 */
interface RawGenreListResponse {
  status?: boolean | string;
  message?: string;
  data?: { items?: Genre[] };
  items?: Genre[];
}

/**
 * Slugs / name patterns for adult content that must never surface in the
 * genre dropdowns or listing filters. Filtered out at the service layer
 * so every consumer (Header dropdown, FilterSidebar, Home rows...) is
 * safe by construction.
 */
const ADULT_SLUGS = new Set(['phim-18', '18+', 'adult', 'erotic']);
const ADULT_NAME_PATTERNS = [/\b18\+/i, /adult/i, /erotic/i, /nude/i];

function isAdultGenre(g: Genre): boolean {
  if (ADULT_SLUGS.has(g.slug)) return true;
  return ADULT_NAME_PATTERNS.some((rx) => rx.test(g.name));
}

/**
 * Synthetic "genres" — on phimapi.com these are actually MOVIE TYPES
 * (`/danh-sach/hoat-hinh`, `/danh-sach/tv-shows`), not categories. But
 * users think of them as browsable genres alongside Hành Động, Bí Ẩn…,
 * so we surface them in the same dropdown for a familiar UX. GenrePage
 * recognises these slugs and routes to the correct listing endpoint.
 */
const SYNTHETIC_GENRES: Genre[] = [
  { _id: 900001, name: 'Hoạt Hình', slug: 'hoat-hinh' },
  { _id: 900002, name: 'TV Shows', slug: 'tv-shows' },
];

export const SYNTHETIC_GENRE_SLUGS = new Set(SYNTHETIC_GENRES.map((g) => g.slug));

/**
 * Fetch the full list of genres, minus adult categories, PLUS synthetic
 * entries for Hoạt Hình + TV Shows so the browse UX matches user
 * expectations. Supports every known upstream response shape:
 *   - phimapi.com: `{ status, message, data: { items } }`
 *   - vsmov.com:   `{ status, message, data: { items } }`
 *   - ophim-like:  `{ status, items }`
 *   - bare array:  `Genre[]`
 */
export async function getAllGenres(): Promise<GenreListResponse> {
  const res = await apiGet<Genre[] | RawGenreListResponse>(API_ENDPOINTS.GENRES);
  const rawItems: Genre[] = Array.isArray(res)
    ? res
    : (res.data?.items ?? res.items ?? []);
  const clean = rawItems.filter((g) => !isAdultGenre(g));
  // Insert synthetic entries at the top so users spot them first.
  return { status: true, items: [...SYNTHETIC_GENRES, ...clean] };
}

/**
 * Fetch movies belonging to a given genre.
 * GET /the-loai/[slug]?page=
 */
export async function getMoviesByGenre(
  slug: string,
  page = 1,
): Promise<APIListResponse<MovieListItem>> {
  return apiGet<APIListResponse<MovieListItem>>(
    API_ENDPOINTS.MOVIES_BY_GENRE(slug),
    { params: { page } },
  );
}

export const genreService = {
  getAllGenres,
  getMoviesByGenre,
};

export default genreService;
