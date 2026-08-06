import { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

import {
  HeroBanner,
  MovieRow,
  SpotlightGrid,
  TopRankingRow,
} from '@/components/movie';
import { useHistoryStore } from '@/store';
import { useLatestMovies, useMoviesBySlug } from '@/hooks';
import { ROUTES } from '@/constants';
import type { MovieListItem } from '@/types';

/* -------------------------------------------------------------------------- */
/* Animation                                                                   */
/* -------------------------------------------------------------------------- */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: 'easeOut' as const },
  },
};

/* -------------------------------------------------------------------------- */
/* HomePage                                                                    */
/* -------------------------------------------------------------------------- */

export default function HomePage() {
  const { t } = useTranslation();
  const { history } = useHistoryStore();

  // Feeds — each targets a distinct endpoint / slice so the sections don't
  // duplicate each other (Motchill-style variety).
  const { data: latestData } = useLatestMovies(1);
  const { data: singleMovies } = useMoviesBySlug('phim-le', { page: 1 });
  const { data: tvShows } = useMoviesBySlug('phim-bo', { page: 1 });
  const { data: anime } = useMoviesBySlug('hoat-hinh', { page: 1 });
  const { data: tvShowsCategory } = useMoviesBySlug('tv-shows', { page: 1 });
  const { data: vietsub } = useMoviesBySlug('phim-vietsub', { page: 1 });
  const { data: thuyetMinh } = useMoviesBySlug('phim-thuyet-minh', { page: 1 });
  const { data: longTieng } = useMoviesBySlug('phim-long-tieng', { page: 1 });
  const { data: topMoviesByViews } = useMoviesBySlug('phim-le', {
    page: 1,
    sort_field: 'view_total',
    sort_type: 'desc',
  });
  const { data: topSeriesByViews } = useMoviesBySlug('phim-bo', {
    page: 1,
    sort_field: 'view_total',
    sort_type: 'desc',
  });

  const heroBannerMovies = useMemo(
    () => latestData?.items.slice(0, 6) ?? [],
    [latestData],
  );

  const continueWatchingMovies = useMemo<MovieListItem[]>(
    () =>
      history.map((h) => ({
        _id: 0,
        name: h.name,
        origin_name: '',
        slug: h.slug,
        poster_url: h.poster_url,
        thumb_url: h.thumb_url,
        year: 0,
        tmdb: {
          type: '',
          id: '',
          season: null,
          vote_average: '0',
          vote_count: 0,
        },
        imdb: { id: '' },
        modified: { time: '' },
      })),
    [history],
  );

  // Featured slice for the SpotlightGrid — take fresh items from latest.
  const spotlightItems = useMemo(
    () => latestData?.items.slice(6, 11) ?? [],
    [latestData],
  );

  return (
    <>
      <Helmet>
        <title>{t('seo.homeTitle')}</title>
        <meta name="description" content={t('seo.homeDescription')} />
        <meta property="og:title" content={t('seo.homeTitle')} />
        <meta property="og:description" content={t('seo.homeDescription')} />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-gray-950 text-white">
        {heroBannerMovies.length > 0 && <HeroBanner movies={heroBannerMovies} />}

        <motion.div
          className="mx-auto max-w-7xl space-y-14 px-4 py-10 sm:px-6 lg:px-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {continueWatchingMovies.length > 0 && (
            <motion.section variants={itemVariants}>
              <MovieRow
                title={t('home.continueWatching')}
                movies={continueWatchingMovies}
                viewAllLink={ROUTES.HISTORY}
              />
            </motion.section>
          )}

          {/* Spotlight — 1 big + 4 small (asymmetric grid) */}
          {spotlightItems.length === 5 && (
            <motion.section variants={itemVariants}>
              <SpotlightGrid
                title={t('home.spotlight', 'Phim đề cử')}
                movies={spotlightItems}
              />
            </motion.section>
          )}

          {/* Trending / newest — standard horizontal row */}
          {latestData?.items && latestData.items.length > 0 && (
            <motion.section variants={itemVariants}>
              <MovieRow
                title={t('home.trending')}
                movies={latestData.items.slice(0, 20)}
              />
            </motion.section>
          )}

          {/* Top 10 movies by views — Netflix-style ranking */}
          {topMoviesByViews?.items && topMoviesByViews.items.length > 0 && (
            <motion.section variants={itemVariants}>
              <TopRankingRow
                title={t('home.topMovies', 'Top 10 Phim Lẻ')}
                movies={topMoviesByViews.items}
                viewAllLink={ROUTES.MOVIES}
              />
            </motion.section>
          )}

          {/* Latest movies */}
          {singleMovies?.items && singleMovies.items.length > 0 && (
            <motion.section variants={itemVariants}>
              <MovieRow
                title={t('home.latestMovies')}
                movies={singleMovies.items}
                viewAllLink={ROUTES.MOVIES}
              />
            </motion.section>
          )}

          {/* Latest TV shows */}
          {tvShows?.items && tvShows.items.length > 0 && (
            <motion.section variants={itemVariants}>
              <MovieRow
                title={t('home.latestTVShows')}
                movies={tvShows.items}
                viewAllLink={ROUTES.TV_SHOWS}
              />
            </motion.section>
          )}

          {/* Top 10 series by views */}
          {topSeriesByViews?.items && topSeriesByViews.items.length > 0 && (
            <motion.section variants={itemVariants}>
              <TopRankingRow
                title={t('home.topSeries', 'Top 10 Phim Bộ')}
                movies={topSeriesByViews.items}
                viewAllLink={ROUTES.TV_SHOWS}
              />
            </motion.section>
          )}

          {/* Anime */}
          {anime?.items && anime.items.length > 0 && (
            <motion.section variants={itemVariants}>
              <MovieRow title={t('home.anime')} movies={anime.items} />
            </motion.section>
          )}

          {/* TV Shows category */}
          {tvShowsCategory?.items && tvShowsCategory.items.length > 0 && (
            <motion.section variants={itemVariants}>
              <MovieRow
                title={t('home.tvShowsCategory', 'TV Shows')}
                movies={tvShowsCategory.items}
              />
            </motion.section>
          )}

          {/* Vietsub */}
          {vietsub?.items && vietsub.items.length > 0 && (
            <motion.section variants={itemVariants}>
              <MovieRow
                title={t('home.vietsub', 'Phim Vietsub')}
                movies={vietsub.items}
              />
            </motion.section>
          )}

          {/* Thuyết Minh */}
          {thuyetMinh?.items && thuyetMinh.items.length > 0 && (
            <motion.section variants={itemVariants}>
              <MovieRow
                title={t('home.thuyetMinh', 'Phim Thuyết Minh')}
                movies={thuyetMinh.items}
              />
            </motion.section>
          )}

          {/* Lồng Tiếng */}
          {longTieng?.items && longTieng.items.length > 0 && (
            <motion.section variants={itemVariants}>
              <MovieRow
                title={t('home.longTieng', 'Phim Lồng Tiếng')}
                movies={longTieng.items}
              />
            </motion.section>
          )}
        </motion.div>
      </div>
    </>
  );
}
