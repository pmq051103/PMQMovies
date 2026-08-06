import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FaSearch,
  FaHistory,
  FaTrash,
  FaTimes,
  FaMicrophone,
  FaMicrophoneAlt,
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

/* Minimal Web Speech API typings — TS lib.dom doesn't ship them. */
interface SpeechRecognitionEventLike {
  results: {
    length: number;
    [i: number]: { 0: { transcript: string }; isFinal: boolean };
  };
}
interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((e: SpeechRecognitionEventLike) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
interface SpeechRecognitionCtor {
  new (): SpeechRecognitionInstance;
}
interface WindowWithSpeech extends Window {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
}

import { useDebounce } from '@/hooks';
import { useSearchMovies } from '@/hooks/useMovies';
import { useSearchStore } from '@/store/useSearchStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { GridSkeleton } from '@/components/common/Skeleton';
import MovieCard from '@/components/movie/MovieCard';
import { ROUTES } from '@/constants';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 500);

  const { recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches } =
    useSearchStore();

  const { language } = useLanguageStore();
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Detect Web Speech API support on mount.
  useEffect(() => {
    const w = window as WindowWithSpeech;
    setVoiceSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  const toggleVoiceSearch = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const w = window as WindowWithSpeech;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = language === 'en' ? 'en-US' : 'vi-VN';
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setQuery(transcript);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    setIsListening(true);
    try {
      rec.start();
    } catch {
      setIsListening(false);
    }
  }, [isListening, language]);

  // Stop voice recognition when the modal closes.
  useEffect(() => {
    if (!isOpen && isListening) {
      recognitionRef.current?.stop();
    }
  }, [isOpen, isListening]);

  const { data, isLoading } = useSearchMovies({
    keyword: debouncedQuery,
    limit: 16,
  });

  const items = data?.items ?? [];

  // ESC key listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Autofocus input when modal opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is ready after animation
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
    setQuery('');
  }, [isOpen]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (trimmed.length >= 2) {
        addRecentSearch(trimmed);
        navigate(`${ROUTES.SEARCH}?q=${encodeURIComponent(trimmed)}`);
        onClose();
      }
    },
    [query, addRecentSearch, navigate, onClose],
  );

  const handleRecentClick = useCallback((term: string) => {
    setQuery(term);
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const showRecentSearches = query.length === 0 && recentSearches.length > 0;
  const showResults = debouncedQuery.length >= 2;
  const showNoResults = showResults && !isLoading && items.length === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="always-dark fixed inset-0 z-[55] bg-black/90 backdrop-blur-md"
          onClick={handleBackdropClick}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors z-10"
            aria-label={t('common.close')}
          >
            <FaTimes className="h-6 w-6" />
          </button>

          <div className="h-full overflow-y-auto px-4 pb-8">
            {/* Search input */}
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mt-20">
              <div className="relative">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('search.placeholder')}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-xl py-4 pl-12 pr-24 text-xl text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                />

                {/* Right-side controls: clear + mic (voice search) */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {query.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="rounded-full p-2 text-gray-400 hover:text-white transition-colors"
                      aria-label={t('search.clear')}
                    >
                      <FaTimes className="h-4 w-4" />
                    </button>
                  )}
                  {voiceSupported && (
                    <button
                      type="button"
                      onClick={toggleVoiceSearch}
                      title={t('search.voice')}
                      aria-label={t('search.voice')}
                      className={`relative rounded-full p-2.5 transition-colors ${
                        isListening
                          ? 'bg-red-600 text-white'
                          : 'text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {isListening ? (
                        <FaMicrophoneAlt className="h-5 w-5" />
                      ) : (
                        <FaMicrophone className="h-5 w-5" />
                      )}
                      {isListening && (
                        <motion.span
                          aria-hidden="true"
                          className="absolute inset-0 rounded-full bg-red-500"
                          animate={{ opacity: [0.4, 0.15, 0.4], scale: [1, 1.35, 1] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                          style={{ zIndex: -1 }}
                        />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>

            {/* Recent searches */}
            {showRecentSearches && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="max-w-2xl mx-auto mt-8"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-gray-300">
                    <FaHistory className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {t('search.recentSearches')}
                    </span>
                  </div>
                  <button
                    onClick={clearRecentSearches}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <FaTrash className="h-3 w-3" />
                    <span>{t('search.clearAll')}</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term) => (
                    <div
                      key={term}
                      className="group flex items-center gap-2 bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-2 transition-colors"
                    >
                      <button
                        onClick={() => handleRecentClick(term)}
                        className="text-sm text-gray-300 hover:text-white transition-colors"
                      >
                        {term}
                      </button>
                      <button
                        onClick={() => removeRecentSearch(term)}
                        className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        aria-label={t('search.removeRecent', { term })}
                      >
                        <FaTimes className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Search results */}
            {showResults && (
              <div className="max-w-7xl mx-auto mt-8">
                {isLoading ? (
                  <GridSkeleton count={8} />
                ) : showNoResults ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-20 text-gray-400"
                  >
                    <FaSearch className="h-12 w-12 mb-4 opacity-30" />
                    <p className="text-lg">{t('search.noResults')}</p>
                    <p className="text-sm mt-1 text-gray-500">
                      {t('search.tryDifferent')}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
                    // Close the modal automatically when the user clicks any
                    // movie card in the result grid — MovieCard is a
                    // <Link> so a bubbled anchor click means "user picked a
                    // result", which should dismiss the search overlay.
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('a')) {
                        onClose();
                      }
                    }}
                  >
                    {items.map((movie, idx) => (
                      <MovieCard key={movie._id} movie={movie} index={idx} />
                    ))}
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchModal;
