import { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaPlay, FaChevronRight } from 'react-icons/fa';

import {
  HeroBanner,
  MovieRow,
  SpotlightGrid,
  TopRankingRow,
} from '@/components/movie';
import { useHistoryStore } from '@/store';
import { useLatestMovies, useMoviesBySlug } from '@/hooks';
import { ROUTES } from '@/constants';
import { getImageUrl } from '@/utils';

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

  // Continue-watching: build direct watch-page URLs with the episode +
  // server params so clicking a card resumes at the exact tap the user
  // stopped at (previously the row pointed at /phim/[slug] via
  // MovieRow → MovieCard, which threw the user back to episode 1).
  const continueWatchingItems = useMemo(
    () =>
      history.map((h) => ({
        slug: h.slug,
        name: h.name,
        poster_url: h.poster_url,
        thumb_url: h.thumb_url,
        episode: h.episode,
        server: h.server,
        watchUrl: `${ROUTES.WATCH}/${h.slug}?tap=${h.episode}${
          h.server ? `&sv=${encodeURIComponent(h.server)}` : ''
        }`,
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
          {continueWatchingItems.length > 0 && (
            <motion.section variants={itemVariants}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white sm:text-2xl">
                  {t('home.continueWatching')}
                </h2>
                <Link
                  to={ROUTES.HISTORY}
                  className="flex items-center gap-1 text-sm text-gray-400 transition-colors hover:text-red-500"
                >
                  {t('common.seeAll')}
                  <FaChevronRight className="h-2.5 w-2.5" />
                </Link>
              </div>
              <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
                {continueWatchingItems.map((item) => (
                  <Link
                    key={item.slug}
                    to={item.watchUrl}
                    className="group relative flex-shrink-0"
                    aria-label={`Xem tiếp ${item.name}`}
                    title={item.name}
                  >
                    <div className="relative aspect-[2/3] w-32 overflow-hidden rounded-lg bg-gray-900 sm:w-40">
                      <img
                        src={getImageUrl(item.poster_url) || getImageUrl(item.thumb_url)}
                        alt={item.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-white shadow-lg">
                          <FaPlay className="h-4 w-4 translate-x-0.5" />
                        </div>
                      </div>
                      {item.episode && (
                        <span className="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                          Tập {item.episode}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 max-w-[8rem] truncate text-sm font-medium text-gray-300 sm:max-w-[10rem]">
                      {item.name}
                    </p>
                  </Link>
                ))}
              </div>
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
