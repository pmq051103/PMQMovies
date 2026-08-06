/**
 * Dual-source API layer.
 *
 * Combines phimapi.com (primary — 29k+ catalog, robust filters) with
 * vsmov.com (secondary — fresher indie Vietnamese titles). Used only on
 * endpoints where merging is safe and paginating gets in the way:
 *   - Latest movies feed (Home)
 *   - Search
 *   - Movie detail (fallback + episode server merge)
 * List/filter pages stay single-source (phimapi) to keep pagination sane.
 */

import { apiGet } from './axiosClient';
import { vsmovGet } from './vsmovClient';
import type {
  APIListResponse,
  MovieDetailResponse,
  MovieListItem,
  Episode,
} from '@/types';

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

async function safe<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch {
    return null;
  }
}

function dedupeBySlug(list: MovieListItem[]): MovieListItem[] {
  const seen = new Set<string>();
  const out: MovieListItem[] = [];
  for (const m of list) {
    if (!m?.slug || seen.has(m.slug)) continue;
    seen.add(m.slug);
    out.push(m);
  }
  return out;
}

/**
 * Best-effort MovieListItem extractor — vsmov returns
 * `{ status, items }` while phimapi's home endpoint returns the same.
 * Handles v1 nested shape too (`{ data: { items } }`).
 */
function extractItems(raw: unknown): MovieListItem[] {
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r.items)) return r.items as MovieListItem[];
  const d = r.data as Record<string, unknown> | undefined;
  if (d && Array.isArray(d.items)) return d.items as MovieListItem[];
  return [];
}

/* ------------------------------------------------------------------ */
/* Latest movies — merge phimapi + vsmov, dedupe                       */
/* ------------------------------------------------------------------ */

export async function getLatestMoviesDual(
  page = 1,
): Promise<APIListResponse<MovieListItem>> {
  const [primary, secondary] = await Promise.all([
    safe(
      apiGet<APIListResponse<MovieListItem>>('/danh-sach/phim-moi-cap-nhat', {
        params: { page },
      }),
    ),
    // vsmov's freshness is on the first page only; skip for deeper pages.
    page === 1
      ? safe(
          vsmovGet<APIListResponse<MovieListItem>>(
            '/danh-sach/phim-moi-cap-nhat',
            { params: { page: 1 } },
          ),
        )
      : Promise.resolve(null),
  ]);

  const primaryItems = extractItems(primary);
  const secondaryItems = extractItems(secondary);

  // Interleave: secondary items appended after primary but before any
  // duplicates get dropped so fresh vsmov titles surface if phimapi lacks them.
  const merged = dedupeBySlug([...primaryItems, ...secondaryItems]);

  return {
    status: true,
    items: merged,
    pagination: primary?.pagination,
  };
}

/* ------------------------------------------------------------------ */
/* Search — merge results from both APIs                               */
/* ------------------------------------------------------------------ */

export async function searchMoviesDual(
  keyword: string,
  limit: number = 24,
): Promise<APIListResponse<MovieListItem>> {
  const trimmed = keyword.trim();
  if (!trimmed) return { status: true, items: [] };

  const [primary, secondary] = await Promise.all([
    safe(
      apiGet<APIListResponse<MovieListItem>>('/v1/api/tim-kiem', {
        params: { keyword: trimmed, limit },
      }),
    ),
    safe(
      vsmovGet<APIListResponse<MovieListItem>>('/tim-kiem', {
        params: { keyword: trimmed, limit },
      }),
    ),
  ]);

  const primaryItems = extractItems(primary);
  const secondaryItems = extractItems(secondary);
  const merged = dedupeBySlug([...primaryItems, ...secondaryItems]);

  return { status: true, items: merged };
}

/* ------------------------------------------------------------------ */
/* Movie detail — phimapi first, vsmov fallback, merge episode servers */
/* ------------------------------------------------------------------ */

/** Normalise an episode's server_name so obvious duplicates dedupe. */
function normalizeServer(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/#\d+/g, '')
    .trim();
}

function mergeEpisodes(
  primary: Episode[] = [],
  secondary: Episode[] = [],
): Episode[] {
  const seen = new Set<string>();
  const out: Episode[] = [];
  for (const ep of [...primary, ...secondary]) {
    if (!ep?.server_name) continue;
    const key = normalizeServer(ep.server_name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ep);
  }
  return out;
}

export async function getMovieDetailDual(
  slug: string,
): Promise<MovieDetailResponse> {
  const [primary, secondary] = await Promise.all([
    safe(apiGet<MovieDetailResponse>(`/phim/${slug}`)),
    safe(vsmovGet<MovieDetailResponse>(`/phim/${slug}`)),
  ]);

  // If phimapi has the movie, use its metadata but merge in vsmov's
  // episode servers (extra playback sources).
  if (primary?.movie) {
    const mergedEpisodes = mergeEpisodes(
      primary.episodes,
      secondary?.episodes,
    );
    return { ...primary, episodes: mergedEpisodes };
  }

  // phimapi 404 → use vsmov if it has it.
  if (secondary?.movie) return secondary;

  // Both failed — propagate primary's shape so the UI can show error.
  throw new Error('Movie not found on either source');
}
