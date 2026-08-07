import { useState, useEffect, useCallback, useRef, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaTimes, FaHistory, FaTrash } from 'react-icons/fa';

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

/* ------------------------------------------------------------------ */
/* SearchPage                                                          */
/* ------------------------------------------------------------------ */

export default function SearchPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const qParam = searchParams.get('q') ?? '';

  /* ---- Local state ---- */
  const [keyword, setKeyword] = useState(qParam);
  const debouncedKeyword = useDebounce(keyword, DEBOUNCE_DELAY);

  // Guard ref: when the URL drives a keyword change, skip the
  // keyword→URL sync to avoid a circular overwrite.
  const urlDriven = useRef(false);

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
    limit: 64,
  });

  const movies = data?.items ?? [];
  const hasSearched = debouncedKeyword.trim().length > 0;
  const showNoResults = hasSearched && !isLoading && movies.length === 0;
  const showRecentSearches = !hasSearched && recentSearches.length > 0;

  /* ---- Sync keyword to URL (only for user-typed changes) ---- */
  useEffect(() => {
    // Skip if this keyword change came from a URL navigation
    if (urlDriven.current) {
      urlDriven.current = false;
      return;
    }
    if (debouncedKeyword.trim()) {
      setSearchParams({ q: debouncedKeyword.trim() }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [debouncedKeyword, setSearchParams]);

  /* ---- Sync URL param → local state (from SearchModal or navigation) ---- */
  useEffect(() => {
    if (qParam !== keyword) {
      urlDriven.current = true;
      setKeyword(qParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam]);

  /* ---- Focus input on mount ---- */
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /* ---- Handlers ---- */
  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const trimmed = keyword.trim();
      if (trimmed) {
        addRecentSearch(trimmed);
      }
      inputRef.current?.blur();
    },
    [keyword, addRecentSearch],
  );

  const handleClear = useCallback(() => {
    setKeyword('');
    inputRef.current?.focus();
  }, []);

  const handleRecentClick = useCallback(
    (term: string) => {
      setKeyword(term);
      addRecentSearch(term);
    },
    [addRecentSearch],
  );

  return (
    <>
      <Helmet>
        <title>{t('seo.searchTitle')}</title>
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
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder={t('search.placeholder')}
                  className="w-full rounded-xl border border-gray-800 bg-gray-900/80 py-4 pl-12 pr-12 text-lg text-white placeholder-gray-500 outline-none backdrop-blur-sm transition-colors focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
                />
                {keyword && (
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
              <h2 className="mb-6 text-lg font-semibold text-gray-200">
                {t('search.results')}
              </h2>
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
              <MovieGrid movies={movies} />
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
