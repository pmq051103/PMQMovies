import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { FaHeart, FaTimes } from 'react-icons/fa';
import { useFavoriteStore } from '@/store';
import { MovieCard } from '@/components/movie';
import { EmptyState } from '@/components/common';

export default function FavoritesPage() {
  const { t } = useTranslation();
  const { favorites, removeFavorite } = useFavoriteStore();

  return (
    <>
      <Helmet>
        <title>{t('seo.favoritesTitle')}</title>
      </Helmet>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="min-h-screen px-4 py-8 md:px-8 lg:px-12"
      >
        <div className="mx-auto max-w-7xl">
          <h1 className="mb-8 text-3xl font-bold text-white md:text-4xl">
            {t('favorites.title')}
          </h1>

          {favorites.length === 0 ? (
            <EmptyState
              icon={<FaHeart className="text-5xl text-red-500" />}
              title={t('favorites.empty')}
              description={t('favorites.emptyDesc')}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {favorites.map((movie, index) => (
                <motion.div
                  key={movie.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.04 }}
                  className="group relative"
                >
                  <MovieCard movie={movie} />
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeFavorite(movie.slug);
                    }}
                    className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white opacity-0 backdrop-blur-sm transition-all duration-200 hover:bg-red-600 group-hover:opacity-100"
                    aria-label={t('common.remove')}
                  >
                    <FaTimes className="text-sm" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
