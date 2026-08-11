import { FaFilm } from 'react-icons/fa';
import { getMoviePoster, onImgError } from '@/utils';

interface CategoryBannerProps {
  /** Small label above the title, e.g. "THỂ LOẠI" / "QUỐC GIA". */
  eyebrow: string;
  title: string;
  /** Short blurb describing what this page/category is about (page-specific). */
  description?: string;
  totalItems?: number;
  /** thumb_url of a representative movie, used as the backdrop image. */
  backdropUrl?: string | null;
  icon?: React.ElementType;
}

/**
 * Wide banner header for genre/country/listing pages — a blurred movie
 * backdrop with a dark gradient, the category name, an optional
 * page-specific description, and a live movie count pulled straight
 * from that page's own query (no separate request). Falls back to a
 * plain gradient panel when no backdrop is available yet (e.g. while
 * the first page of results is loading).
 *
 * Height is auto (min-height only) rather than a hard-clipped fixed
 * height, so the description text always has room to fully display
 * instead of getting cut off.
 */
export default function CategoryBanner({
  eyebrow,
  title,
  description,
  totalItems,
  backdropUrl,
  icon: Icon = FaFilm,
}: CategoryBannerProps) {
  const bg = backdropUrl ? getMoviePoster(backdropUrl) : '';

  return (
    <div className="relative mb-6 min-h-[11rem] w-full overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 sm:min-h-[16rem]">
      {bg && (
        <img
          src={bg}
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute inset-0 h-full w-full scale-105 object-cover opacity-50 blur-[1px]"
          onError={onImgError}
        />
      )}
      {/* Gradient wash: dark left → transparent right, dark bottom → transparent top */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/80 to-gray-950/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent" />

      <div className="relative flex h-full flex-col justify-end p-5 sm:p-8">
        <span className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-red-500">
          <Icon className="h-3 w-3" />
          {eyebrow}
        </span>
        <h1 className="text-2xl font-extrabold text-white drop-shadow-lg sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-300 sm:text-base">
            {description}
          </p>
        )}
        {typeof totalItems === 'number' && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-gray-300">
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-semibold text-white backdrop-blur">
              {totalItems.toLocaleString('vi-VN')}
            </span>
            phim hiện có
          </p>
        )}
      </div>
    </div>
  );
}
