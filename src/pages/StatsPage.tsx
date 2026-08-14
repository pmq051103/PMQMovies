import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  FaUsers,
  FaPlay,
  FaGlobe,
  FaTags,
  FaFilm,
  FaChartBar,
  FaCalendarDay,
  FaHashtag,
} from 'react-icons/fa';
import { fetchStats, type StatsResponse } from '@/api/trackService';

/* ------------------------------------------------------------------ */
/* Thống kê — dashboard quản lý lượt truy cập web + xem phim theo      */
/* thể loại/quốc gia. Dữ liệu đọc từ api/stats.ts (Supabase).          */
/* Biểu đồ vẽ bằng SVG thuần (không thư viện nặng).                    */
/*                                                                     */
/* Component `StatsDashboard` được nhúng trong trang /admin. Trang      */
/* cũ /thong-ke giờ redirect về /admin.                                */
/* ------------------------------------------------------------------ */

const DAYS_OPTIONS = [7, 14, 30] as const;

const SOURCE_LABELS: Record<string, string> = {
  direct: 'Vào trực tiếp',
  search: 'Công cụ tìm kiếm',
  social: 'Mạng xã hội',
  external: 'Trang khác',
};

const SOURCE_COLORS: Record<string, string> = {
  direct: '#ef4444',
  search: '#f59e0b',
  social: '#22c55e',
  external: '#3b82f6',
};

/* ------------------------------------------------------------------ */
/* StatCard — KPI card                                                */
/* ------------------------------------------------------------------ */

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gradient-to-b from-gray-900/80 to-gray-900/40 p-5 backdrop-blur-sm">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-lg ${
            accent ?? 'bg-gray-800 text-red-400'
          }`}
        >
          {icon}
        </span>
        {label}
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AreaChart — truy cập theo ngày                                     */
/* ------------------------------------------------------------------ */

function AreaChart({ data }: { data: Array<{ day: string; visits: number }> }) {
  const width = 560;
  const height = 180;
  const padX = 8;
  const padTop = 14;
  const padBottom = 24;

  const values = data.map((d) => d.visits);
  const max = Math.max(...values, 1);

  const stepX = (width - padX * 2) / Math.max(data.length - 1, 1);
  const points = data.map((d, i) => ({
    x: padX + i * stepX,
    y: padTop + (height - padTop - padBottom) * (1 - d.visits / max),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1]?.x ?? padX},${height - padBottom} L${padX},${height - padBottom} Z`;

  const showAxis = data.length <= 14;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-40 w-full"
      role="img"
      aria-label="Truy cập theo ngày"
    >
      {/* horizontal gridlines */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={padX}
          x2={width - padX}
          y1={padTop + (height - padTop - padBottom) * (1 - f)}
          y2={padTop + (height - padTop - padBottom) * (1 - f)}
          stroke="#27272a"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      ))}

      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      <path d={areaPath} fill="url(#areaGrad)" />
      <path d={linePath} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />

      {/* value dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#fca5a5" stroke="#ef4444" strokeWidth="1.5">
          <title>{`${data[i].day}: ${data[i].visits} lượt`}</title>
        </circle>
      ))}

      {/* x-axis labels */}
      {showAxis &&
        data.map((d, i) =>
          i % Math.ceil(data.length / 7) === 0 || i === data.length - 1 ? (
            <text
              key={i}
              x={points[i].x}
              y={height - 6}
              textAnchor="middle"
              className="fill-gray-500"
              fontSize="9"
            >
              {d.day.slice(5)}
            </text>
          ) : null,
        )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* DonutChart — nguồn truy cập                                        */
/* ------------------------------------------------------------------ */

function DonutChart({ items }: { items: Array<{ name: string; value: number }> }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  const radius = 52;
  const stroke = 16;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  if (total === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center text-sm text-gray-500">
        Chưa có dữ liệu
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <div className="relative">
        <svg viewBox="0 0 140 140" className="h-36 w-36">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="#27272a"
            strokeWidth={stroke}
          />
          {items.map((item) => {
            const fraction = item.value / total;
            const dash = fraction * circumference;
            const el = (
              <circle
                key={item.name}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={SOURCE_COLORS[item.name] ?? '#ef4444'}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                transform="rotate(-90 70 70)"
              >
                <title>{`${SOURCE_LABELS[item.name] ?? item.name}: ${item.value}`}</title>
              </circle>
            );
            offset += dash;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{total}</span>
          <span className="text-[10px] text-gray-500">lượt</span>
        </div>
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.name} className="flex items-center gap-2 text-sm">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: SOURCE_COLORS[item.name] ?? '#ef4444' }}
            />
            <span className="w-36 text-gray-300">
              {SOURCE_LABELS[item.name] ?? item.name}
            </span>
            <span className="font-semibold text-white">{item.value}</span>
            <span className="w-12 text-right text-xs text-gray-500">
              {Math.round((item.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* BarList — top phim / thể loại / quốc gia (ngang)                   */
/* ------------------------------------------------------------------ */

function BarList({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: Array<{ name: string; value: number }>;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="rounded-2xl border border-gray-800 bg-gradient-to-b from-gray-900/80 to-gray-900/40 p-5 backdrop-blur-sm">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-200">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gray-800 text-red-400">
          {icon}
        </span>
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">Chưa có dữ liệu</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item.name} className="flex items-center gap-3">
              <span className="w-36 shrink-0 truncate text-sm text-gray-300" title={item.name}>
                {item.name}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-800">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.value / max) * 100}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-sm font-semibold text-white">
                {item.value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* StatsDashboard — the stats UI, embedded in the /admin dashboard.    */
/* ------------------------------------------------------------------ */

export function StatsDashboard() {
  const { t } = useTranslation();
  const [days, setDays] = useState<number>(7);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    fetchStats(days)
      .then((data) => {
        if (active) setStats(data);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [days]);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-600/30">
            <FaChartBar className="h-5 w-5 text-white" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-white md:text-3xl">
              {t('seo.statsTitle', 'Thống Kê Truy Cập')}
            </h1>
            <p className="text-sm text-gray-500">
              Lượt truy cập web và xem phim theo thể loại / quốc gia
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-gray-800 bg-gray-900/60 p-1">
          {DAYS_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                days === d
                  ? 'bg-red-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {d} ngày
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-900" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-900/50 bg-red-950/40 p-6 text-center">
          <p className="text-red-300">
            Không đọc được dữ liệu. Kiểm tra biến môi trường{' '}
            <code className="rounded bg-gray-900 px-2 py-0.5 text-sm">
              SUPABASE_URL
            </code>{' '}
            /{' '}
            <code className="rounded bg-gray-900 px-2 py-0.5 text-sm">
              SUPABASE_SERVICE_ROLE_KEY
            </code>{' '}
            trên Vercel.
          </p>
        </div>
      )}

      {!loading && !error && stats && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<FaUsers className="h-3 w-3" />}
              label="Tổng lượt truy cập"
              value={stats.total}
            />
            <StatCard
              icon={<FaCalendarDay className="h-3 w-3" />}
              label="Hôm nay"
              value={stats.today}
            />
            <StatCard
              icon={<FaPlay className="h-3 w-3" />}
              label="Lượt xem phim"
              value={stats.movieTotal}
            />
            <StatCard
              icon={<FaFilm className="h-3 w-3" />}
              label="Phim được xem"
              value={stats.topMovies.length}
            />
          </div>

          {/* Nguồn truy cập (donut) + truy cập theo ngày (area chart) */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-800 bg-gradient-to-b from-gray-900/80 to-gray-900/40 p-5 backdrop-blur-sm">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-200">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gray-800 text-red-400">
                  <FaGlobe className="h-3 w-3" />
                </span>
                Nguồn truy cập
              </h3>
              <DonutChart items={stats.bySource} />
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gradient-to-b from-gray-900/80 to-gray-900/40 p-5 backdrop-blur-sm">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-200">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gray-800 text-red-400">
                  <FaChartBar className="h-3 w-3" />
                </span>
                Truy cập theo ngày
              </h3>
              <AreaChart data={stats.byDay} />
            </div>
          </div>

          {/* Phim + thể loại + quốc gia */}
          <div className="grid gap-6 lg:grid-cols-3">
            <BarList
              title="Phim được xem nhiều nhất"
              icon={<FaFilm className="h-3 w-3" />}
              items={stats.topMovies}
            />
            <BarList
              title="Xem theo thể loại"
              icon={<FaTags className="h-3 w-3" />}
              items={stats.topGenres}
            />
            <BarList
              title="Xem theo quốc gia"
              icon={<FaGlobe className="h-3 w-3" />}
              items={stats.topCountries}
            />
          </div>

          {/* Trang được truy cập nhiều */}
          {stats.topPaths.length > 0 && (
            <div className="rounded-2xl border border-gray-800 bg-gradient-to-b from-gray-900/80 to-gray-900/40 p-5 backdrop-blur-sm">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-200">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gray-800 text-red-400">
                  <FaHashtag className="h-3 w-3" />
                </span>
                Trang được truy cập nhiều nhất
              </h3>
              <ul className="space-y-2">
                {stats.topPaths.map((p) => (
                  <li
                    key={p.name}
                    className="flex items-center gap-3 rounded-lg bg-gray-900/50 px-3 py-2"
                  >
                    <span className="flex-1 truncate font-mono text-xs text-gray-300">
                      {p.name}
                    </span>
                    <span className="text-sm font-semibold text-white">{p.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Legacy route /thong-ke → redirect to the admin dashboard.           */
/* ------------------------------------------------------------------ */

export default function StatsPage() {
  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Navigate to="/admin" replace />
    </>
  );
}
