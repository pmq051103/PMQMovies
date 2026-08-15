import { useCallback, useEffect, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const { t } = useTranslation();

  // Local text state for the page-number field — lets the person freely
  // type/clear digits while editing; only clamped and committed on blur
  // or Enter, not on every keystroke.
  const [inputValue, setInputValue] = useState(String(currentPage));

  // Keep the field in sync when the page changes from elsewhere (the
  // prev/next buttons here, or the parent resetting to page 1 on a new
  // filter/search).
  useEffect(() => {
    setInputValue(String(currentPage));
  }, [currentPage]);

  const handlePrev = useCallback(() => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  }, [currentPage, onPageChange]);

  const handleNext = useCallback(() => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  }, [currentPage, totalPages, onPageChange]);

  const commitInput = useCallback(() => {
    const parsed = parseInt(inputValue, 10);
    if (Number.isNaN(parsed)) {
      setInputValue(String(currentPage));
      return;
    }
    const clamped = Math.min(Math.max(parsed, 1), totalPages);
    setInputValue(String(clamped));
    if (clamped !== currentPage) onPageChange(clamped);
  }, [inputValue, currentPage, totalPages, onPageChange]);

  if (totalPages <= 1) return null;

  const navBtnClasses = (disabled: boolean) =>
    `flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
      disabled
        ? 'bg-gray-800/70 text-gray-600 opacity-50 cursor-not-allowed'
        : 'bg-gray-800/70 text-gray-300 hover:bg-gray-700 hover:text-white'
    }`;

  return (
    <nav
      className="mt-8 flex items-center justify-center gap-3"
      aria-label={t('pagination.navigation')}
    >
      {/* Previous button */}
      <button
        type="button"
        onClick={handlePrev}
        disabled={currentPage <= 1}
        className={navBtnClasses(currentPage <= 1)}
        aria-label={t('pagination.previous')}
      >
        <FaChevronLeft className="h-3.5 w-3.5" />
      </button>

      {/* "Trang [n] / total" pill — the number is an editable input so
          jumping straight to e.g. page 300 of 389 doesn't require
          clicking through a numbered button list. */}
      <div className="flex items-center gap-2 rounded-full bg-gray-800/70 px-4 py-2.5 text-sm font-medium text-gray-300">
        <span>{t('pagination.page', 'Trang')}</span>
        <input
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value.replace(/[^0-9]/g, ''))}
          onFocus={(e) => e.target.select()}
          onBlur={commitInput}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitInput();
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="h-8 w-14 rounded-full bg-gray-700/90 text-center font-semibold text-white outline-none transition-shadow focus:ring-2 focus:ring-red-500"
          aria-label={t('pagination.goToPageInput', 'Nhập số trang')}
        />
        <span className="text-gray-400">/ {totalPages}</span>
      </div>

      {/* Next button */}
      <button
        type="button"
        onClick={handleNext}
        disabled={currentPage >= totalPages}
        className={navBtnClasses(currentPage >= totalPages)}
        aria-label={t('pagination.next')}
      >
        <FaChevronRight className="h-3.5 w-3.5" />
      </button>
    </nav>
  );
};

export default Pagination;