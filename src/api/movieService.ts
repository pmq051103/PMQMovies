import { apiGet } from './axiosClient';
import { getMovieDetailDual } from './dualSource';
import { API_ENDPOINTS } from '@/constants';
import type {
  MovieListItem,
  MovieDetailResponse,
  APIListResponse,
  FilterParams,
} from '@/types';

/**
 * Dual-source movie detail: phimapi primary, vsmov fallback + episode
 * server merge (extra playback sources).
 */
export async function getMovieDetail(
  slug: string,
  prefer?: 'phimapi' | 'vsmov',
): Promise<MovieDetailResponse> {
  return getMovieDetailDual(slug, prefer);
}

export async function getMovies(
  slug: string = 'phim-le',
  params?: FilterParams,
): Promise<APIListResponse<MovieListItem>> {
  return apiGet<APIListResponse<MovieListItem>>(API_ENDPOINTS.LIST_BY_SLUG(slug), {
    params,
  });
}

export const movieService = {
  getMovieDetail,
  getMovies,
};

export default movieService;
