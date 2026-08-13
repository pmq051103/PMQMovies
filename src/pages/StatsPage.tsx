import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  FaChartBar,
  FaUsers,
  FaCalendarDay,
  FaPlay,
  FaFilm,
  FaGlobe,
  FaTags,
  FaHashtag,
} from 'react-icons/fa';

import StatsPasswordGate, { isStatsAuthed } from '@/pages/StatsPasswordGate';
import DonutChart from '@/components/stats/DonutChart';
import LineChart from '@/components/stats/LineChart';
import { useAnalyticsStats } from '@/hooks/useAnalyticsStats';
import { isAnalyticsConfigured } from '@/lib/supabase';

type RangeDays = 7 | 14 | 30;

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  children,
  className = '',
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-gray-800 bg-gray-900/60 p-5 ${className}`}>
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
        <span className="flex h-6 w-6 items-center justify-center rounded bg-red-600/15 text-red-500">
          <Icon className="h-3 w-3" />
        </span>
        {title}
      </div>
      {children}
    </div>
  );
}

function BarRow({ name, count, max }: { name: string; count: number; max: number }) {
  const pct = max > 0 ? Math.max((count / max) * 100, 6) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24 shrink-0 truncate text-gray-300" title={name}>
        {name}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-800">
        <div className="h-full rounded-full bg-red-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 shrink-0 text-right font-semibold text-white">{count}</span>
    </div>
  );
}

function StatsDashboard() {
  const [range, setRange] = useState<RangeDays>(7);
  const { data, isLoading, isError, error } = useAnalyticsStats(range);

  const maxMovie = Math.max(...(data?.topMovies.map((m) => m.count) ?? [0]));
  const maxCategory = Math.max(...(data?.topCategories.map((c) => c.count) ?? [0]));
  const maxCountry = Math.max(...(data?.topCountries.map((c) => c.count) ?? [0]));

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600/15 text-red-500">
            <FaChartBar className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Thống Kê Truy Cập</h1>
            <p className="text-sm text-gray-400">
              Lượt truy cập web và xem phim theo thể loại / quốc gia
            </p>
          </div>
        </div>

        <div className="flex overflow-hidden rounded-lg border border-gray-800">
          {([7, 14, 30] as RangeDays[]).map((d) => (
            <button
              key={d}
              onClick={() => setRange(d)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                range === d
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-900 text-gray-400 hover:text-white'
              }`}
            >
              {d} ngày
            </button>
          ))}
        </div>
      </div>

      {!isAnalyticsConfigured ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-300">
          Supabase chưa được cấu hình. Thêm <code className="text-amber-200">VITE_SUPABASE_URL</code> và{' '}
          <code className="text-amber-200">VITE_SUPABASE_ANON_KEY</code> vào file <code>.env</code>, sau đó
          chạy file <code>supabase-schema.sql</code> trong SQL Editor của dự án Supabase (xem README).
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
          Không tải được số liệu: {(error as Error)?.message}
        </div>
      ) : isLoading || !data ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-900/60" />
          ))}
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard icon={FaUsers} label="Tổng lượt truy cập" value={data.totalViews} />
            <StatCard icon={FaCalendarDay} label="Hôm nay" value={data.todayViews} />
            <StatCard icon={FaPlay} label="Lượt xem phim" value={data.movieViewCount} />
            <StatCard icon={FaFilm} label="Phim được xem" value={data.uniqueMoviesWatched} />
          </div>

          {/* Referrer donut + daily line chart */}
          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel icon={FaGlobe} title="Nguồn truy cập">
              <DonutChart
                centerLabel={String(data.totalViews)}
                centerSublabel="lượt"
                segments={[
                  { label: 'Vào trực tiếp', value: data.directCount, color: '#ef4444' },
                  { label: 'Trang khác', value: data.referralCount, color: '#3b82f6' },
                ]}
              />
            </Panel>
            <Panel icon={FaChartBar} title="Truy cập theo ngày">
              <div className="h-44">
                <LineChart points={data.dailySeries} />
              </div>
            </Panel>
          </div>

          {/* Top movies / categories / countries */}
          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Panel icon={FaFilm} title="Phim được xem nhiều nhất">
              {data.topMovies.length === 0 ? (
                <p className="text-sm text-gray-500">Chưa có dữ liệu</p>
              ) : (
                <div className="space-y-2.5">
                  {data.topMovies.map((m) => (
                    <BarRow key={m.name} name={m.name} count={m.count} max={maxMovie} />
                  ))}
                </div>
              )}
            </Panel>
            <Panel icon={FaTags} title="Xem theo thể loại">
              {data.topCategories.length === 0 ? (
                <p className="text-sm text-gray-500">Chưa có dữ liệu</p>
              ) : (
                <div className="space-y-2.5">
                  {data.topCategories.map((c) => (
                    <BarRow key={c.name} name={c.name} count={c.count} max={maxCategory} />
                  ))}
                </div>
              )}
            </Panel>
            <Panel icon={FaGlobe} title="Xem theo quốc gia">
              {data.topCountries.length === 0 ? (
                <p className="text-sm text-gray-500">Chưa có dữ liệu</p>
              ) : (
                <div className="space-y-2.5">
                  {data.topCountries.map((c) => (
                    <BarRow key={c.name} name={c.name} count={c.count} max={maxCountry} />
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {/* Top pages */}
          <Panel icon={FaHashtag} title="Trang được truy cập nhiều nhất">
            {data.topPaths.length === 0 ? (
              <p className="text-sm text-gray-500">Chưa có dữ liệu</p>
            ) : (
              <div className="space-y-2.5">
                {data.topPaths.map((p) => (
                  <div key={p.path} className="flex items-center justify-between text-sm">
                    <span className="truncate text-gray-300">{p.path}</span>
                    <span className="font-semibold text-white">{p.count}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

export default function StatsPage() {
  const [authed, setAuthed] = useState(isStatsAuthed());

  return (
    <>
      <Helmet>
        <title>Thống Kê Truy Cập</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      {authed ? <StatsDashboard /> : <StatsPasswordGate onAuthed={() => setAuthed(true)} />}
    </>
  );
}
