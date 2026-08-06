import { useRef, useState, useCallback, useEffect, memo } from 'react';
import { Link } from 'react-router';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

import MovieCard from '@/components/movie/MovieCard';
import type { MovieListItem } from '@/types';

interface MovieRowProps {
  title: string;
  movies: MovieListItem[];
  viewAllLink?: string;
}

const SCROLL_AMOUNT = 600;

const MovieRow: React.FC<MovieRowProps> = ({ title, movies, viewAllLink }) => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();

    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState, movies]);

  const scroll = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const offset = direction === 'left' ? -SCROLL_AMOUNT : SCROLL_AMOUNT;
    el.scrollBy({ left: offset, behavior: 'smooth' });
  }, []);

  if (!movies.length) return null;

  return (
    <section className="relative py-4">
      {/* Section header */}
      <div className="mb-3 flex items-center justify-between px-4 md:px-0">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="flex items-center gap-1 text-sm text-gray-400 transition-colors hover:text-red-400"
          >
            <span>{t('common.seeAll')}</span>
            <FaChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Carousel wrapper */}
      <div className="group/row relative">
        {/* Left scroll button */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 z-20 hidden h-full w-10 items-center justify-center bg-gradient-to-r from-black/80 to-transparent text-white opacity-0 transition-opacity group-hover/row:opacity-100 md:flex"
            aria-label={t('common.scrollLeft')}
          >
            <FaChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* Right scroll button */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 z-20 hidden h-full w-10 items-center justify-center bg-gradient-to-l from-black/80 to-transparent text-white opacity-0 transition-opacity group-hover/row:opacity-100 md:flex"
            aria-label={t('common.scrollRight')}
          >
            <FaChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Scrollable row */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {movies.map((movie) => (
            <div
              key={movie._id}
              className="min-w-[140px] max-w-[180px] flex-shrink-0 snap-start sm:min-w-[160px] md:min-w-[180px]"
            >
              <MovieCard movie={movie} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default memo(MovieRow);
