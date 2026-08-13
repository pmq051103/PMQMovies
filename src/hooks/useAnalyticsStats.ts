import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface StatsData {
  totalViews: number;
  todayViews: number;
  movieViewCount: number;
  uniqueMoviesWatched: number;
  directCount: number;
  referralCount: number;
  dailySeries: { label: string; value: number }[];
  topMovies: { name: string; count: number }[];
  topCategories: { name: string; count: number }[];
  topCountries: { name: string; count: number }[];
  topPaths: { path: string; count: number }[];
}

export interface DateRange {
  from: Date;
  to: Date;
}

function isSameDay(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

function dayKey(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function topN(counts: Map<string, number>, n: number): { name: string; count: number }[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, count]) => ({ name, count }));
}

/**
 * Supabase limits a single query to 1000 rows. Traffic above that gets
 * silently truncated, which made every dashboard number — especially
 * "Trang được truy cập nhiều nhất" — wrong once a range accumulated more
 * than 1000 page_views. Fetch in 1000-row pages until we have everything.
 */
async function fetchAllRows<T>(
  buildQuery: (range: { start: number; end: number }) => PromiseLike<{
    data: T[] | null;
    error: unknown;
  }>,
): Promise<T[]> {
  const all: T[] = [];
  const PAGE = 1000;
  for (let start = 0; ; start += PAGE) {
    const { data, error } = await buildQuery({ start, end: start + PAGE - 1 });
    if (error) throw error;
    const page = (data ?? []) as T[];
    all.push(...page);
    if (page.length < PAGE) break;
  }
  return all;
}

/**
 * Fetches page_views + movie_views from Supabase for an arbitrary
 * [from, to] date range and reduces them into everything the
 * /thong-ke dashboard needs. Aggregation happens client-side (fine at
 * this traffic scale) rather than via SQL views, so the dashboard
 * needs zero backend functions — just the two tables from
 * supabase-schema.sql.
 */
export function useAnalyticsStats({ from, to }: DateRange) {
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  return useQuery<StatsData>({
    queryKey: ['analyticsStats', fromIso, toIso],
    queryFn: async () => {
      if (!supabase) {
        throw new Error(
          'Supabase chưa được cấu hình — thêm VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY vào .env',
        );
      }
      const db = supabase;

      const [pageViews, movieViews] = await Promise.all([
        fetchAllRows<{
          path: string;
          referrer_type: string;
          created_at: string;
        }>(({ start, end }) =>
          db
            .from('page_views')
            .select('path, referrer_type, created_at')
            .gte('created_at', fromIso)
            .lte('created_at', toIso)
            .order('created_at', { ascending: true })
            .range(start, end),
        ),
        fetchAllRows<{
          movie_slug: string;
          movie_name: string;
          categories: string[] | null;
          countries: string[] | null;
          created_at: string;
        }>(({ start, end }) =>
          db
            .from('movie_views')
            .select('movie_slug, movie_name, categories, countries, created_at')
            .gte('created_at', fromIso)
            .lte('created_at', toIso)
            .order('created_at', { ascending: true })
            .range(start, end),
        ),
      ]);

      const mViews = (movieViews ?? []) as {
        movie_slug: string;
        movie_name: string;
        categories: string[] | null;
        countries: string[] | null;
        created_at: string;
      }[];
      const today = new Date();

      // Daily series — zero-filled for every day between from and to.
      const dailyBuckets = new Map<string, number>();
      const cursor = new Date(from);
      cursor.setHours(0, 0, 0, 0);
      const end = new Date(to);
      end.setHours(0, 0, 0, 0);
      while (cursor <= end) {
        dailyBuckets.set(dayKey(cursor), 0);
        cursor.setDate(cursor.getDate() + 1);
      }
      for (const v of pageViews) {
        const key = dayKey(new Date(v.created_at));
        if (dailyBuckets.has(key)) {
          dailyBuckets.set(key, (dailyBuckets.get(key) ?? 0) + 1);
        }
      }

      // Referrer split
      let directCount = 0;
      let referralCount = 0;
      for (const v of pageViews) {
        if (v.referrer_type === 'direct') directCount++;
        else referralCount++;
      }

      // Top paths
      const pathCounts = new Map<string, number>();
      for (const v of pageViews) {
        pathCounts.set(v.path, (pathCounts.get(v.path) ?? 0) + 1);
      }

      // Top movies / categories / countries
      const movieCounts = new Map<string, number>();
      const categoryCounts = new Map<string, number>();
      const countryCounts = new Map<string, number>();
      const uniqueSlugs = new Set<string>();

      for (const v of mViews) {
        uniqueSlugs.add(v.movie_slug);
        movieCounts.set(v.movie_name, (movieCounts.get(v.movie_name) ?? 0) + 1);
        for (const c of v.categories ?? []) {
          categoryCounts.set(c, (categoryCounts.get(c) ?? 0) + 1);
        }
        for (const c of v.countries ?? []) {
          countryCounts.set(c, (countryCounts.get(c) ?? 0) + 1);
        }
      }

      return {
        totalViews: pageViews.length,
        todayViews: pageViews.filter((v) => isSameDay(v.created_at, today)).length,
        movieViewCount: mViews.length,
        uniqueMoviesWatched: uniqueSlugs.size,
        directCount,
        referralCount,
        dailySeries: [...dailyBuckets.entries()].map(([label, value]) => ({ label, value })),
        topMovies: topN(movieCounts, 10),
        topCategories: topN(categoryCounts, 10),
        topCountries: topN(countryCounts, 10),
        topPaths: [...pathCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([path, count]) => ({ path, count })),
      };
    },
    staleTime: 60_000,
    // Keeps the previous range's data on screen while the new range
    // fetches, instead of dropping to `undefined` and flashing the
    // whole dashboard back to a loading skeleton on every click.
    placeholderData: keepPreviousData,
  });
}