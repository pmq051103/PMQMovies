import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlay, FaHeart, FaInfoCircle } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

import { ROUTES } from '@/constants';
import { getMoviePoster, onImgError } from '@/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useMovieDetail } from '@/hooks/useMovieQueries';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import type { MovieListItem } from '@/types';

interface HeroBannerProps {
  movies: MovieListItem[];
}

const MAX_SLIDES = 6;
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

/**
 * Episode badge — same logic as MovieCard.tsx / SpotlightGrid.tsx (kept
 * in sync manually, not worth extracting to a shared util for 3 call
 * sites): "Hoàn Tất (24/24)" → "24/24", "Tập 12" + episode_total "32" →
 * "12/32", "Tập 12" with no known total → "Tập 12", "Full" → "Full".
 * The previous version here only handled the "already complete" case
 * and never looked up `episode_total` for an ongoing series, so an
 * in-progress show showed as bare "Tập 12" instead of "12/32".
 */
function episodeStatus(movie: MovieListItem): string {
  const ep = movie.episode_current;
  if (!ep) return '';
  const match = ep.match(/(\d+)\s*\/\s*(\d+)/);
  if (match) return `${match[1]}/${match[2]}`;
  const tapMatch = ep.match(/[Tt]ập\s*(\d+)/);
  if (tapMatch) {
    const current = tapMatch[1];
    const total = (movie as MovieListItem & { episode_total?: string }).episode_total;
    if (total && total !== '?' && total !== '0') return `${current}/${total}`;
    return `Tập ${current}`;
  }
  if (ep === 'Full') return 'Full';
  return ep;
}

/** Strips HTML tags from the raw `content` field some sources include. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

const HeroBanner: React.FC<HeroBannerProps> = ({ movies }) => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery('(max-width: 639px)');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [failedSlugs, setFailedSlugs] = useState<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number | null>(null);
  const { isFavorite, toggleFavorite } = useFavoriteStore();

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

  const current = slides[currentIndex] as MovieListItem | undefined;

  // The "latest movies" feed that powers this banner (useLatestMovies) is a
  // lightweight list endpoint — it doesn't include genres or the
  // description. Fetch those separately for whichever slide is showing;
  // React Query caches per-slug, so autoplay cycling through slides
  // doesn't refetch a slide once it's already been shown once. Called
  // unconditionally (before the `!slides.length` early return below) to
  // keep hook call order stable across renders — useMovieDetail no-ops
  // internally when slug is undefined.
  const { data: detailData } = useMovieDetail(current?.slug);

  if (!current) return null;

  const detailUrl = `${ROUTES.MOVIE_DETAIL}/${current.slug}`;
  const season = current.tmdb?.season;
  const rating = current.tmdb?.vote_average ? parseFloat(String(current.tmdb.vote_average)) : null;
  const favorited = isFavorite(current.slug);
  const categories = detailData?.movie?.category;
  const description = detailData?.movie?.content ? stripHtml(detailData.movie.content) : '';
  // Same "lightweight feed is missing fields" situation as categories/
  // description above — fall back to the full detail fetch when the
  // list item itself doesn't carry episode_current (this is genuinely
  // why the badge could render nothing at all, not just render it
  // poorly formatted).
  const episodeSource: MovieListItem =
    current.episode_current
      ? current
      : {
          ...current,
          episode_current: detailData?.movie?.episode_current ?? current.episode_current,
          episode_total: detailData?.movie?.episode_total ?? current.episode_total,
        };
  const episode = episodeStatus(episodeSource);

  /* ------------------------------------------------------------------ */
  /* Mobile — "peek" carousel: dimmed/smaller prev + next poster cards   */
  /* poking in from the edges, full-size current card centered.         */
  /* Same info as desktop (badges, genres) minus the description.       */
  /* ------------------------------------------------------------------ */
  if (isMobile) {
    return (
      <section className="always-dark relative w-full bg-black pb-5 pt-3">
        {/* Peek carousel — full-bleed, edges cropped by the section.
            Height is `90vw` (not a fixed px) because the card is
            `w-[58%]` wide at `aspect-[2/3]`, so its real rendered
            height is `0.58 * 1.5 ≈ 0.87` of the viewport width — a
            fixed 320px was shorter than that on most phone widths,
            silently clipping the bottom of every poster. */}
        <div
          className="relative h-[90vw] max-h-[420px] w-full overflow-hidden"
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const delta = e.changedTouches[0].clientX - touchStartX.current;
            if (delta > 40) goPrev();
            else if (delta < -40) goNext();
            touchStartX.current = null;
          }}
        >
          {[-1, 0, 1].map((offset) => {
            const idx = (currentIndex + offset + slides.length) % slides.length;
            const slide = slides[idx];
            const isCenter = offset === 0;
            return (
              <button
                // Keyed by the movie only — NOT combined with `offset` —
                // so a given movie keeps the same DOM node as it moves
                // between slots (e.g. center → left-peek) across slide
                // changes, letting `transition-all duration-300` below
                // actually interpolate the position/scale/opacity change
                // smoothly instead of unmounting and remounting a fresh
                // node already in its final spot (which caused the jump).
                // Falls back to including `offset` only when there are
                // fewer than 3 slides, since then two offsets can land on
                // the same movie and a plain movie-only key would collide.
                key={slides.length >= 3 ? slide._id : `${slide._id}-${offset}`}
                type="button"
                onClick={() => !isCenter && goToSlide(idx)}
                aria-label={slide.name}
                className="absolute top-0 aspect-[2/3] w-[58%] overflow-hidden rounded-2xl shadow-xl transition-all duration-300 ease-out"
                style={{
                  left: '50%',
                  zIndex: isCenter ? 20 : 10,
                  opacity: isCenter ? 1 : 0.45,
                  transform: `translateX(calc(-50% + ${offset * 68}%)) scale(${isCenter ? 1 : 0.86})`,
                }}
              >
                <img
                  src={getMoviePoster(slide.poster_url, slide.thumb_url)}
                  alt={slide.name}
                  className="h-full w-full object-cover"
                  loading={offset === 0 && currentIndex === 0 ? 'eager' : 'lazy'}
                  onError={() => setFailedSlugs((prev) => new Set(prev).add(slide.slug))}
                />
                {!isCenter && <div className="absolute inset-0 bg-black/40" />}
              </button>
            );
          })}
        </div>

        {/* Info block below the carousel */}
        <div className="px-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={current._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-3"
            >
              <h1 className="line-clamp-1 text-center text-lg font-bold text-white">{current.name}</h1>
              {current.origin_name && current.origin_name !== current.name && (
                <p className="mt-0.5 line-clamp-1 text-center text-xs italic text-gray-400">
                  {current.origin_name}
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                {rating !== null && rating > 0 && (
                  <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-gray-900">
                    IMDb {rating.toFixed(1)}
                  </span>
                )}
                {current.year > 0 && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-gray-200">
                    {current.year}
                  </span>
                )}
                {season ? (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-gray-200">
                    Phần {season}
                  </span>
                ) : null}
                {episode && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-gray-200">
                    {episode}
                  </span>
                )}
              </div>

              {/* {categories && categories.length > 0 && (
                <p className="mt-2 line-clamp-1 text-center text-xs text-gray-400">
                  {categories.slice(0, 4).map((c) => c.name).join(' • ')}
                </p>
              )} */}

              {/* Dot pagination */}
              {slides.length > 1 && (
                <div className="mt-3 flex items-center justify-center gap-1.5">
                  {slides.map((slide, idx) => (
                    <button
                      key={slide._id}
                      onClick={() => goToSlide(idx)}
                      aria-label={`${t('movie.goToSlide')} ${idx + 1}`}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === currentIndex ? 'w-5 bg-amber-400' : 'w-1.5 bg-white/30'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Buttons */}
              <div className="mt-3 flex items-center justify-center gap-2">
                <Link
                  to={detailUrl}
                  className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-2.5 text-sm font-bold text-gray-900 shadow-lg shadow-amber-400/20 active:scale-[0.98]"
                >
                  <FaPlay className="h-3 w-3" />
                  {t('movie.watchNow')}
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleFavorite(current);
                  }}
                  aria-label={t('movie.addToFavorites')}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                    favorited ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-200'
                  }`}
                >
                  <FaHeart className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Desktop — full-width landscape banner with slide thumbnail strip.   */
  /* ------------------------------------------------------------------ */
  return (
    <section className="always-dark relative w-full overflow-hidden bg-black sm:h-[70vh] sm:min-h-[560px] sm:max-h-[820px]">
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
            onError={() => setFailedSlugs((prev) => new Set(prev).add(current.slug))}
          />
        </motion.div>
      </AnimatePresence>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex items-end">
        <div className="mx-auto w-full max-w-7xl px-6 pb-16 lg:px-8 lg:pb-20">
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
              <h1 className="text-3xl font-bold leading-tight text-white drop-shadow-lg md:text-5xl lg:text-6xl">
                {current.name}
              </h1>

              {/* Subtitle / origin name */}
              {current.origin_name && current.origin_name !== current.name && (
                <p className="mt-2 text-lg italic text-gray-300 md:text-xl">{current.origin_name}</p>
              )}

              {/* Badges row */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {rating !== null && rating > 0 && (
                  <span className="rounded-full bg-amber-400 px-3 py-1 text-sm font-bold text-gray-900">
                    IMDb {rating.toFixed(1)}
                  </span>
                )}
                {current.year > 0 && (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-gray-200 backdrop-blur-sm">
                    {current.year}
                  </span>
                )}
                {season ? (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-gray-200 backdrop-blur-sm">
                    Phần {season}
                  </span>
                ) : null}
                {episode && (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-gray-200 backdrop-blur-sm">
                    {episode}
                  </span>
                )}
              </div>

              {/* Genre tags */}
              {categories && categories.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-sm text-gray-300">
                  {categories.slice(0, 5).map((cat, idx) => (
                    <span key={cat.slug} className="flex items-center gap-2">
                      {cat.name}
                      {idx < Math.min(categories.length, 5) - 1 && (
                        <span className="h-1 w-1 rounded-full bg-gray-500" />
                      )}
                    </span>
                  ))}
                </div>
              )}

              {/* Description */}
              {description && (
                <p className="mt-3 line-clamp-2 text-sm text-gray-300 md:text-base">{description}</p>
              )}

              {/* Buttons */}
              <div className="mt-6 flex items-center gap-3">
                <Link
                  to={detailUrl}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-gray-900 shadow-lg shadow-amber-400/30 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                  aria-label={t('movie.watchNow')}
                  title={t('movie.watchNow')}
                >
                  <FaPlay className="h-4 w-4 translate-x-0.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => toggleFavorite(current)}
                  aria-label={t('movie.addToFavorites')}
                  title={t('movie.addToFavorites')}
                  className={`flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-sm transition-colors ${
                    favorited ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-200 hover:bg-white/20'
                  }`}
                >
                  <FaHeart className="h-4 w-4" />
                </button>
                <Link
                  to={detailUrl}
                  aria-label={t('movie.details')}
                  title={t('movie.details')}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-gray-200 backdrop-blur-sm transition-colors hover:bg-white/20"
                >
                  <FaInfoCircle className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Slide thumbnail strip — bottom right */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 right-6 z-10 hidden items-center gap-2 lg:flex">
          {slides.map((slide, idx) => (
            <button
              key={slide._id}
              onClick={() => goToSlide(idx)}
              aria-label={slide.name}
              title={slide.name}
              className={`relative h-14 w-24 shrink-0 overflow-hidden rounded-md border-2 transition-all duration-300 ${
                idx === currentIndex
                  ? 'border-amber-400 opacity-100'
                  : 'border-transparent opacity-50 hover:opacity-80'
              }`}
            >
              <img
                src={getMoviePoster(slide.thumb_url, slide.poster_url)}
                alt={slide.name}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={onImgError}
              />
            </button>
          ))}
        </div>
      )}

      {/* Dot indicators — smaller screens without the thumbnail strip */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 lg:hidden">
          {slides.map((slide, idx) => (
            <button
              key={slide._id}
              onClick={() => goToSlide(idx)}
              aria-label={`${t('movie.goToSlide')} ${idx + 1}`}
              className={`rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? 'h-3 w-3 bg-amber-400 shadow-md shadow-amber-400/50'
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