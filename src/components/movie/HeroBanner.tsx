import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlay, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

import { ROUTES } from '@/constants';
import { getMoviePoster } from '@/utils';
import type { MovieListItem } from '@/types';

interface HeroBannerProps {
  movies: MovieListItem[];
}

const MAX_SLIDES = 5;
const AUTOPLAY_INTERVAL = 6000;

const slideVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 60 : -60,
  }),
  center: {
    opacity: 1,
    x: 0,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -60 : 60,
  }),
};

const HeroBanner: React.FC<HeroBannerProps> = ({ movies }) => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [failedSlugs, setFailedSlugs] = useState<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Filter out slides with empty URLs AND slides whose images failed to load
  const slides = movies
    .filter((m) =>
      !failedSlugs.has(m.slug) && (
        (typeof m.thumb_url === 'string' && m.thumb_url.length > 0) ||
        (typeof m.poster_url === 'string' && m.poster_url.length > 0)
      )
    )
    .slice(0, MAX_SLIDES);

  const clearAutoplay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startAutoplay = useCallback(() => {
    clearAutoplay();
    if (slides.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, AUTOPLAY_INTERVAL);
  }, [slides.length, clearAutoplay]);

  const goToSlide = useCallback(
    (index: number) => {
      setDirection(index > currentIndex ? 1 : -1);
      setCurrentIndex(index);
      startAutoplay();
    },
    [currentIndex, startAutoplay],
  );

  const goPrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    startAutoplay();
  }, [slides.length, startAutoplay]);

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % slides.length);
    startAutoplay();
  }, [slides.length, startAutoplay]);

  useEffect(() => {
    startAutoplay();
    return clearAutoplay;
  }, [startAutoplay, clearAutoplay]);

  if (!slides.length) return null;

  const current = slides[currentIndex];

  return (
    <section className="always-dark relative w-full aspect-[3/2] min-h-[240px] max-h-[400px] overflow-hidden bg-black sm:aspect-auto sm:min-h-[560px] sm:h-[70vh] sm:max-h-[820px]">
      {/* Background image with AnimatePresence */}
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={current._id}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          <img
            src={getMoviePoster(current.thumb_url, current.poster_url)}
            alt={current.name}
            className="h-full w-full object-cover"
            loading={currentIndex === 0 ? 'eager' : 'lazy'}
            onError={() => {
              // Mark this slide as failed → it gets filtered out, auto-advances
              setFailedSlugs((prev) => new Set(prev).add(current.slug));
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex items-end">
        <div className="w-full max-w-7xl mx-auto px-3 pb-4 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={current._id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="max-w-2xl"
            >
              {/* Title */}
              <h1 className="text-lg font-bold leading-tight text-white sm:text-3xl md:text-5xl lg:text-6xl drop-shadow-lg line-clamp-2 sm:line-clamp-none">
                {current.name}
              </h1>

              {/* Subtitle / origin name */}
              {current.origin_name && current.origin_name !== current.name && (
                <p className="mt-1 text-xs text-gray-300 italic sm:mt-2 sm:text-lg md:text-xl line-clamp-1">
                  {current.origin_name}
                </p>
              )}

              {/* Year */}
              {current.year > 0 && (
                <span className="mt-1.5 inline-block rounded bg-white/10 px-2 py-0.5 text-xs font-medium text-gray-200 backdrop-blur-sm sm:mt-3 sm:px-3 sm:py-1 sm:text-sm">
                  {current.year}
                </span>
              )}

              {/* Play button */}
              <div className="mt-2.5 sm:mt-6">
                <Link
                  to={`${ROUTES.MOVIE_DETAIL}/${current.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-red-600/30 transition-colors hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 sm:gap-2 sm:px-6 sm:py-3 sm:text-sm"
                >
                  <FaPlay className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>{t('movie.watchNow')}</span>
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Previous / Next arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100 sm:opacity-70"
            aria-label={t('common.previous')}
          >
            <FaChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100 sm:opacity-70"
            aria-label={t('common.next')}
          >
            <FaChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 sm:bottom-6 sm:gap-2">
          {slides.map((slide, idx) => (
            <button
              key={slide._id}
              onClick={() => goToSlide(idx)}
              aria-label={`${t('movie.goToSlide')} ${idx + 1}`}
              className={`rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? 'h-3 w-3 bg-red-500 shadow-md shadow-red-500/50'
                  : 'h-2 w-2 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default memo(HeroBanner);