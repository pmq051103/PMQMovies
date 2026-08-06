import { apiGet } from "@/api/axiosClient";
import { API_ENDPOINTS, DEFAULT_PAGE_SIZE } from "@/constants";
import type { APIListResponse, MovieListItem } from "@/types";

/**
 * Search movies by keyword.
 * GET /tim-kiem?keyword=[keyword]&limit=N
 */
export async function searchMovies(
  keyword: string,
  limit: number = DEFAULT_PAGE_SIZE,
): Promise<APIListResponse<MovieListItem>> {
  const trimmed = keyword.trim();

  if (!trimmed) {
    return { status: true, items: [] };
  }

  return apiGet<APIListResponse<MovieListItem>>(API_ENDPOINTS.SEARCH, {
    params: { keyword: trimmed, limit },
  });
}

export const searchService = {
  searchMovies,
};

export default searchService;
