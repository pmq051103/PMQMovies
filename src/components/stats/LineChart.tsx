interface LineChartPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  points: LineChartPoint[];
}

/**
 * Minimal SVG area/line chart — no charting library needed for a
 * single daily-count series. Scales to the max value in the series.
 */
export default function LineChart({ points }: LineChartProps) {
  const width = 600;
  const height = 180;
  const padX = 10;
  const padY = 16;

  const max = Math.max(...points.map((p) => p.value), 1);
  const stepX = points.length > 1 ? (width - padX * 2) / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const x = padX + i * stepX;
    const y = height - padY - (p.value / max) * (height - padY * 2);
    return { x, y, ...p };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ');
  const areaPath = `${linePath} L${coords[coords.length - 1]?.x ?? 0},${height} L${coords[0]?.x ?? 0},${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" preserveAspectRatio="none">
      {/* Dashed gridlines */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={0}
          x2={width}
          y1={height - padY - f * (height - padY * 2)}
          y2={height - padY - f * (height - padY * 2)}
          stroke="currentColor"
          className="text-gray-800"
          strokeDasharray="4 4"
        />
      ))}

      <defs>
        <linearGradient id="statsAreaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={areaPath} fill="url(#statsAreaFill)" />
      <path d={linePath} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {coords.map((c) => (
        <circle key={c.label} cx={c.x} cy={c.y} r={c.value > 0 ? 4 : 2.5} fill="#ef4444" />
      ))}

      {coords.map((c) => (
        <text
          key={`${c.label}-label`}
          x={c.x}
          y={height + 4}
          fontSize="9"
          textAnchor="middle"
          className="fill-gray-600"
        >
          {c.label}
        </text>
      ))}
    </svg>
  );
}
