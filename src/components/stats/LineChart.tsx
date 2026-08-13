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
  const yFor = (v: number) => height - padY - (v / max) * (height - padY * 2);

  const gridlines = [0.25, 0.5, 0.75].map((f) => (
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
  ));

  const gradientDef = (
    <defs>
      <linearGradient id="statsAreaFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
      </linearGradient>
    </defs>
  );

  // A single-day range (e.g. "Hôm nay") only has one bucket — there's no
  // second point to draw a line to, so a normal line/area chart would
  // just show a lone dot in the corner. Draw a flat reference line
  // spanning the full width instead, centered dot + label, so it still
  // reads as a chart rather than looking broken.
  if (points.length <= 1) {
    const point = points[0];
    const y = point ? yFor(point.value) : height - padY;
    const midX = width / 2;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" preserveAspectRatio="none">
        {gridlines}
        {gradientDef}
        {point && (
          <>
            <line
              x1={padX}
              x2={width - padX}
              y1={y}
              y2={y}
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity={point.value > 0 ? 1 : 0.35}
              strokeDasharray={point.value > 0 ? undefined : '4 4'}
            />
            <circle cx={midX} cy={y} r={point.value > 0 ? 5 : 3} fill="#ef4444" />
            <text x={midX} y={height + 4} fontSize="9" textAnchor="middle" className="fill-gray-600">
              {point.label}
            </text>
          </>
        )}
      </svg>
    );
  }

  const stepX = (width - padX * 2) / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = padX + i * stepX;
    const y = yFor(p.value);
    return { x, y, ...p };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ');
  const areaPath = `${linePath} L${coords[coords.length - 1]?.x ?? 0},${height} L${coords[0]?.x ?? 0},${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" preserveAspectRatio="none">
      {gridlines}
      {gradientDef}

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