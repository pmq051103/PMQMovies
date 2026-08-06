import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaServer, FaPlay } from "react-icons/fa";

import { ROUTES } from "@/constants";
import type { Episode } from "@/types";

interface EpisodeListProps {
  episodes: Episode[];
  currentEpisodeSlug?: string;
  currentServerName?: string;
  movieSlug: string;
  /** Compact mode = the version used in the WatchPage right sidebar. */
  compact?: boolean;
}

const EpisodeList: React.FC<EpisodeListProps> = ({
  episodes,
  currentEpisodeSlug,
  currentServerName,
  movieSlug,
  compact = false,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const initialServer = useMemo(() => {
    if (!currentServerName) return 0;
    const idx = episodes.findIndex((e) => e.server_name === currentServerName);
    return idx === -1 ? 0 : idx;
  }, [episodes, currentServerName]);

  const [activeServer, setActiveServer] = useState(initialServer);

  // Keep local state in sync when the parent re-resolves the active server.
  useEffect(() => {
    setActiveServer(initialServer);
  }, [initialServer]);

  const handleEpisodeClick = useCallback(
    (episodeSlug: string, serverName: string) => {
      navigate(
        `${ROUTES.WATCH}/${movieSlug}?tap=${episodeSlug}&sv=${encodeURIComponent(serverName)}`,
      );
    },
    [movieSlug, navigate],
  );

  if (!episodes.length) return null;

  const currentServer = episodes[activeServer];
  const totalEps = currentServer?.server_data.length ?? 0;
  // Auto-detect "single-episode" content (phim lẻ) so we can show a cleaner
  // "Xem phim" CTA instead of a lonely square button with the word "Full".
  const isSingleEpisode =
    totalEps === 1 &&
    /^(full|tap-full)$/i.test(currentServer?.server_data[0]?.slug ?? "");

  const containerCls = compact
    ? "rounded-xl bg-gray-900/70 border border-gray-800 p-3"
    : "rounded-xl bg-gray-900/80 backdrop-blur-sm border border-gray-800 p-4";

  return (
    <div className={containerCls}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className={`font-semibold text-white ${compact ? "text-base" : "text-lg"}`}>
          {t("movie.episodes")}
        </h3>
        {!isSingleEpisode && totalEps > 0 && (
          <span className="text-xs text-gray-500">{totalEps} tập</span>
        )}
      </div>

      {/* Server tabs (only when multiple servers) */}
      {episodes.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {episodes.map((ep, idx) => (
            <button
              key={ep.server_name}
              type="button"
              onClick={() => setActiveServer(idx)}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                idx === activeServer
                  ? "bg-red-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
              }`}
              title={ep.server_name}
            >
              <FaServer className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[10rem]">{ep.server_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Episode buttons */}
      {currentServer && (
        <div
          className={
            isSingleEpisode
              ? ""
              : compact
                ? "grid grid-cols-3 gap-1.5 sm:grid-cols-4 max-h-[420px] overflow-y-auto pr-1"
                : "grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10"
          }
        >
          {isSingleEpisode ? (
            <button
              type="button"
              onClick={() =>
                handleEpisodeClick(
                  currentServer.server_data[0].slug,
                  currentServer.server_name,
                )
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              <FaPlay className="h-3 w-3" />
              {t("watch.watchNow")}
            </button>
          ) : (
            currentServer.server_data.map((serverData, idx) => {
              const isActive = currentEpisodeSlug === serverData.slug;
              // Prefer a compact numeric label ("1", "12") when the API label
              // is a long "Tập X" string, so buttons never overflow.
              const numericMatch = serverData.name.match(/\d+/);
              const shortLabel = numericMatch
                ? numericMatch[0]
                : serverData.name.length <= 6
                  ? serverData.name
                  : String(idx + 1);
              return (
                <button
                  key={serverData.slug}
                  type="button"
                  onClick={() =>
                    handleEpisodeClick(serverData.slug, currentServer.server_name)
                  }
                  title={serverData.name}
                  className={`flex items-center justify-center rounded-md px-1 py-2 text-xs font-semibold transition-all min-w-0 ${
                    isActive
                      ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                  aria-current={isActive ? "true" : undefined}
                >
                  <span className="truncate">{shortLabel}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default memo(EpisodeList);
