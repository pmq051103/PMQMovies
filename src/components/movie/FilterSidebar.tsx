import { useState, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFilter, FaUndo } from 'react-icons/fa';

import { YEARS } from '@/constants';
import { useGenres, useCountries } from '@/hooks';
import type { FilterState } from '@/types';

interface FilterSidebarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  className?: string;
}

const SORT_OPTIONS = [
  { value: 'modified.time', label: 'filter.sortNewest' },
  { value: 'year', label: 'filter.sortYear' },
  { value: 'tmdb.vote_average', label: 'filter.sortRating' },
  { value: '_id', label: 'filter.sortDefault' },
] as const;

const SORT_TYPES = [
  { value: 'desc', label: 'filter.descending' },
  { value: 'asc', label: 'filter.ascending' },
] as const;

const defaultFilters: FilterState = {
  genre: undefined,
  country: undefined,
  year: undefined,
  quality: undefined,
  language: undefined,
  status: undefined,
  sortField: undefined,
  sortType: undefined,
  page: 1,
};

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  onFilterChange,
  className = '',
}) => {
  const { t } = useTranslation();
  const { data: genres = [], isLoading: genresLoading } = useGenres();
  const { data: countries = [], isLoading: countriesLoading } = useCountries();

  const [localFilters, setLocalFilters] = useState<FilterState>({ ...filters });

  const handleChange = useCallback(
    (field: keyof FilterState, value: string | number | undefined) => {
      setLocalFilters((prev) => ({
        ...prev,
        [field]: value || undefined,
      }));
    },
    [],
  );

  const handleApply = useCallback(() => {
    onFilterChange({ ...localFilters, page: 1 });
  }, [localFilters, onFilterChange]);

  const handleReset = useCallback(() => {
    setLocalFilters({ ...defaultFilters });
    onFilterChange({ ...defaultFilters });
  }, [onFilterChange]);

  return (
    <div
      className={`rounded-xl bg-gray-900/80 backdrop-blur-sm border border-gray-800 p-4 ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <FaFilter className="text-red-500 h-4 w-4" />
        <h3 className="text-lg font-semibold text-white">
          {t('filter.title')}
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
        {/* Genre select */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400">
            {t('filter.genre')}
          </label>
          <select
            value={localFilters.genre ?? ''}
            onChange={(e) => handleChange('genre', e.target.value)}
            disabled={genresLoading}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none transition-colors focus:border-red-500 focus:ring-1 focus:ring-red-500 disabled:opacity-50"
          >
            <option value="">{t('filter.allGenres')}</option>
            {genres.map((genre) => (
              <option key={genre._id} value={genre.slug}>
                {genre.name}
              </option>
            ))}
          </select>
        </div>

        {/* Country select */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400">
            {t('filter.country')}
          </label>
          <select
            value={localFilters.country ?? ''}
            onChange={(e) => handleChange('country', e.target.value)}
            disabled={countriesLoading}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none transition-colors focus:border-red-500 focus:ring-1 focus:ring-red-500 disabled:opacity-50"
          >
            <option value="">{t('filter.allCountries')}</option>
            {countries.map((country) => (
              <option key={country._id} value={country.slug}>
                {country.name}
              </option>
            ))}
          </select>
        </div>

        {/* Year select */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400">
            {t('filter.year')}
          </label>
          <select
            value={localFilters.year ?? ''}
            onChange={(e) => handleChange('year', e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none transition-colors focus:border-red-500 focus:ring-1 focus:ring-red-500"
          >
            <option value="">{t('filter.allYears')}</option>
            {YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Sort field */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400">
            {t('filter.sortBy')}
          </label>
          <select
            value={localFilters.sortField ?? ''}
            onChange={(e) => handleChange('sortField', e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none transition-colors focus:border-red-500 focus:ring-1 focus:ring-red-500"
          >
            <option value="">{t('filter.defaultSort')}</option>
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.label)}
              </option>
            ))}
          </select>
        </div>

        {/* Sort direction */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400">
            {t('filter.sortDirection')}
          </label>
          <select
            value={localFilters.sortType ?? 'desc'}
            onChange={(e) =>
              handleChange('sortType', e.target.value as 'asc' | 'desc')
            }
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none transition-colors focus:border-red-500 focus:ring-1 focus:ring-red-500"
          >
            {SORT_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.label)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={handleApply}
          className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          {t('filter.apply')}
        </button>
        <button
          onClick={handleReset}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
        >
          <FaUndo className="h-3 w-3" />
          {t('filter.reset')}
        </button>
      </div>
    </div>
  );
};

export default memo(FilterSidebar);
