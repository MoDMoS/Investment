type Slice = {
  label: string;
  value: number;
};

const COLORS = [
  '#60a5fa',
  '#3b82f6',
  '#38bdf8',
  '#818cf8',
  '#22d3ee',
  '#f07178',
  '#2dd4bf',
  '#a78bfa',
  '#f472b6',
  '#fb923c',
];

export function DonutChart({
  slices,
  center,
  sub,
}: {
  slices: Slice[];
  center: string;
  sub?: string;
}) {
  const total = slices.reduce((sum, row) => sum + row.value, 0);
  const size = 196;
  const stroke = 28;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1c2a42"
            strokeWidth={stroke}
          />
          {total > 0
            ? slices.map((slice, index) => {
                const len = (slice.value / total) * circ;
                const dash = `${len} ${circ - len}`;
                const el = (
                  <circle
                    key={slice.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={stroke}
                    strokeDasharray={dash}
                    strokeDashoffset={-offset}
                    strokeLinecap="butt"
                  />
                );
                offset += len;
                return el;
              })
            : null}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <p className="text-sm font-semibold text-stone-900">{center}</p>
          {sub ? <p className="mt-0.5 text-xs text-stone-500">{sub}</p> : null}
        </div>
      </div>
      <ul className="w-full space-y-1.5 text-sm">
        {slices.length === 0 ? (
          <li className="text-stone-500">ยังไม่มีหุ้นในกลุ่มนี้</li>
        ) : (
          slices.map((slice, index) => (
            <li key={slice.label} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: COLORS[index % COLORS.length] }}
                />
                <span className="truncate font-medium">{slice.label}</span>
              </span>
              <span className="shrink-0 text-stone-500">
                {total > 0 ? `${((slice.value / total) * 100).toFixed(1)}%` : '—'}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
