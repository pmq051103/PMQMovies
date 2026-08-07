import { useState, useEffect, useCallback, useRef, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaTimes, FaHistory, FaTrash, FaChevronDown } from 'react-icons/fa';

import { MovieGrid } from '@/components/movie';
import { GridSkeleton, EmptyState } from '@/components/common';
import { DEBOUNCE_DELAY } from '@/constants';
import { useSearchMovies, useDebounce } from '@/hooks';
import { useSearchStore } from '@/store';

/* ------------------------------------------------------------------ */
/* Animation variants                                                  */
/* ------------------------------------------------------------------ */

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

const chipVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.15 } },
};

const INITIAL_VISIBLE = 24;
const LOAD_MORE_STEP = 24;

/* ------------------------------------------------------------------ */
/* SearchPage                                                          */
/* ------------------------------------------------------------------ */

export default function SearchPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const qParam = searchParams.get('q') ?? '';

  /* ---- Local state ---- */
  const [inputValue, setInputValue] = useState(qParam);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const debouncedKeyword = useDebounce(inputValue, DEBOUNCE_DELAY);

  /* ---- Stores ---- */
  const {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
  } = useSearchStore();

  /* ---- Fetch results ---- */
  const { data, isLoading } = useSearchMovies({
    keyword: debouncedKeyword,
    limit: 120,
  });

  const movies = data?.items ?? [];
  const hasSearched = debouncedKeyword.trim().length > 0;
  const showNoResults = hasSearched && !isLoading && movies.length === 0;
  const showRecentSearches = !hasSearched && recentSearches.length > 0;

  const visibleMovies = movies.slice(0, visibleCount);
  const hasMore = movies.length > visibleCount;

  /* ---- URL → input sync ---- */
  useEffect(() => {
    setInputValue(qParam);
    setVisibleCount(INITIAL_VISIBLE); // Reset on new search
  }, [qParam]);

  /* ---- Focus input on mount ---- */
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /* ---- Reset visible count when keyword changes ---- */
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [debouncedKeyword]);

  /* ---- Handlers ---- */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputValue(val);
      if (val.trim()) {
        setSearchParams({ q: val.trim() }, { replace: true });
      } else {
        setSearchParams({}, { replace: true });
      }
    },
    [setSearchParams],
  );

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (trimmed) {
        addRecentSearch(trimmed);
      }
      inputRef.current?.blur();
    },
    [inputValue, addRecentSearch],
  );

  const handleClear = useCallback(() => {
    setInputValue('');
    setSearchParams({}, { replace: true });
    inputRef.current?.focus();
  }, [setSearchParams]);

  const handleRecentClick = useCallback(
    (term: string) => {
      setInputValue(term);
      setSearchParams({ q: term }, { replace: true });
      addRecentSearch(term);
    },
    [addRecentSearch, setSearchParams],
  );

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => prev + LOAD_MORE_STEP);
  }, []);

  return (
    <>
      <Helmet>
        <title>{t('seo.searchTitle')}</title>
        <meta name="description" content="Tìm kiếm phim tại Không Gian Phim — tìm phim lẻ, phim bộ, phim chiếu rạp theo tên." />
        <meta property="og:title" content={t('seo.searchTitle')} />
        <meta property="og:url" content="https://khonggianphim.com/tim-kiem" />
        <link rel="canonical" href="https://khonggianphim.com/tim-kiem" />
      </Helmet>

      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="min-h-screen bg-gray-950 text-white"
      >
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Search header */}
          <div className="mx-auto max-w-2xl">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <FaSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder={t('search.placeholder')}
                  className="w-full rounded-xl border border-gray-800 bg-gray-900/80 py-4 pl-12 pr-12 text-lg text-white placeholder-gray-500 outline-none backdrop-blur-sm transition-colors focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
                />
                {inputValue && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-500 transition-colors hover:text-white"
                  >
                    <FaTimes className="h-4 w-4" />
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Recent searches */}
          <AnimatePresence>
            {showRecentSearches && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mx-auto mt-8 max-w-2xl"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-400">
                    <FaHistory className="h-3.5 w-3.5" />
                    {t('search.recentSearches')}
                  </h3>
                  <button
                    onClick={clearRecentSearches}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 transition-colors hover:text-red-400"
                  >
                    <FaTrash className="h-3 w-3" />
                    {t('search.clearRecent')}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <AnimatePresence mode="popLayout">
                    {recentSearches.map((term) => (
                      <motion.div
                        key={term}
                        variants={chipVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        className="group inline-flex items-center gap-1.5 rounded-full bg-gray-800 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-700"
                      >
                        <button
                          onClick={() => handleRecentClick(term)}
                          className="transition-colors hover:text-white"
                        >
                          {term}
                        </button>
                        <button
                          onClick={() => removeRecentSearch(term)}
                          className="rounded-full p-0.5 text-gray-500 opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
                          aria-label={`${t('common.remove')} ${term}`}
                        >
                          <FaTimes className="h-3 w-3" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results section */}
          <div className="mt-8">
            {hasSearched && (
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-200">
                  {t('search.results')}
                </h2>
                {movies.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {visibleMovies.length} / {movies.length} {t('common.results')}
                  </span>
                )}
              </div>
            )}

            {isLoading && hasSearched && <GridSkeleton />}

            {showNoResults && (
              <EmptyState
                icon={<FaSearch />}
                title={t('search.noResults')}
                description={`"${debouncedKeyword}"`}
              />
            )}

            {hasSearched && !isLoading && movies.length > 0 && (
              <>
                <MovieGrid movies={visibleMovies} />

                {/* Load more button */}
                {hasMore && (
                  <div className="mt-8 flex justify-center">
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      className="flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800/50 px-8 py-3 text-sm font-semibold text-gray-300 transition-all hover:border-red-500/50 hover:bg-gray-800 hover:text-white"
                    >
                      <FaChevronDown className="h-3 w-3" />
                      {t('common.showMore', 'Xem thêm')}
                      <span className="text-xs text-gray-500">
                        ({movies.length - visibleCount} phim)
                      </span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
