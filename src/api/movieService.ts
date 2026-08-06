import { apiGet } from './axiosClient';
import { API_ENDPOINTS } from '@/constants';
import type {
  MovieListItem,
  MovieDetailResponse,
  APIListResponse,
  FilterParams,
} from '@/types';

export async function getMovieDetail(slug: string): Promise<MovieDetailResponse> {
  return apiGet<MovieDetailResponse>(API_ENDPOINTS.MOVIE_DETAIL(slug));
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
