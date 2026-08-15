type Point = { label: string; value: number };

export function LineChart({
  points,
  format,
}: {
  points: Point[];
  format: (value: number) => string;
}) {
  if (points.length === 0) {
    return <p className="text-sm text-stone-500">ยังไม่มีข้อมูล</p>;
  }

  const width = 640;
  const height = 220;
  const pad = 28;
  const values = points.map((row) => row.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const coords = points.map((row, index) => {
    const x =
      pad +
      (points.length === 1
        ? (width - pad * 2) / 2
        : (index / (points.length - 1)) * (width - pad * 2));
    const y = height - pad - ((row.value - min) / span) * (height - pad * 2);
    return { x, y, ...row };
  });

  const path = coords
    .map((row, index) => `${index === 0 ? 'M' : 'L'} ${row.x.toFixed(1)} ${row.y.toFixed(1)}`)
    .join(' ');

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full min-w-[320px]">
        <line
          x1={pad}
          y1={height - pad}
          x2={width - pad}
          y2={height - pad}
          stroke="#e7e5e4"
        />
        <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#e7e5e4" />
        <path d={path} fill="none" stroke="#065f46" strokeWidth="2.5" />
        {coords.map((row) => (
          <circle key={row.label} cx={row.x} cy={row.y} r="3.5" fill="#065f46">
            <title>
              {row.label}: {format(row.value)}
            </title>
          </circle>
        ))}
        <text x={pad} y={16} className="fill-stone-400 text-[11px]">
          {format(max)}
        </text>
        <text x={pad} y={height - 8} className="fill-stone-400 text-[11px]">
          {format(min)}
        </text>
      </svg>
      <div className="mt-1 flex justify-between text-xs text-stone-400">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}
