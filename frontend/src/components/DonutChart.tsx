import { useState } from 'react';

type Slice = {
  label: string;
  value: number;
};

/** High-contrast slice colors (easy to tell apart) */
const COLORS = [
  '#22c55e', // green
  '#eab308', // yellow
  '#f97316', // orange
  '#ef4444', // red
  '#a855f7', // purple
  '#14b8a6', // teal
  '#84cc16', // lime
  '#ec4899', // pink
  '#65a30d', // olive
  '#f59e0b', // amber
];

type Tip = {
  label: string;
  value: number;
  percent: number;
  color: string;
  x: number;
  y: number;
};

export function DonutChart({
  slices,
  center,
  sub,
  formatValue,
}: {
  slices: Slice[];
  center: string;
  sub?: string;
  /** Optional value formatter for tooltip */
  formatValue?: (value: number) => string;
}) {
  const total = slices.reduce((sum, row) => sum + row.value, 0);
  const size = 196;
  const stroke = 28;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  let offset = 0;
  const [tip, setTip] = useState<Tip | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div
        className="relative shrink-0"
        style={{ width: size, height: size }}
        onMouseLeave={() => {
          setTip(null);
          setActiveIndex(null);
        }}
      >
        <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1a3a32"
            strokeWidth={stroke}
          />
          {total > 0
            ? slices.map((slice, index) => {
                const len = (slice.value / total) * circ;
                const dash = `${len} ${circ - len}`;
                const color = COLORS[index % COLORS.length];
                const percent = (slice.value / total) * 100;
                const currentOffset = offset;
                offset += len;
                const active = activeIndex === index;

                return (
                  <circle
                    key={slice.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={active ? stroke + 4 : stroke}
                    strokeDasharray={dash}
                    strokeDashoffset={-currentOffset}
                    strokeLinecap="butt"
                    className="cursor-pointer transition-[stroke-width] duration-150"
                    style={{ opacity: activeIndex != null && !active ? 0.45 : 1 }}
                    onMouseEnter={(event) => {
                      const rect = (
                        event.currentTarget.ownerSVGElement?.parentElement as HTMLElement
                      ).getBoundingClientRect();
                      setActiveIndex(index);
                      setTip({
                        label: slice.label,
                        value: slice.value,
                        percent,
                        color,
                        x: event.clientX - rect.left,
                        y: event.clientY - rect.top,
                      });
                    }}
                    onMouseMove={(event) => {
                      const rect = (
                        event.currentTarget.ownerSVGElement?.parentElement as HTMLElement
                      ).getBoundingClientRect();
                      setTip((prev) =>
                        prev
                          ? {
                              ...prev,
                              x: event.clientX - rect.left,
                              y: event.clientY - rect.top,
                            }
                          : prev,
                      );
                    }}
                  />
                );
              })
            : null}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <p className="text-sm font-semibold text-stone-900">{center}</p>
          {sub ? <p className="mt-0.5 text-xs text-stone-500">{sub}</p> : null}
        </div>

        {tip ? (
          <div
            className="pointer-events-none absolute z-10 min-w-36 rounded-lg border border-stone-200 bg-stone-100 px-3 py-2 shadow-xl"
            style={{
              left: Math.min(Math.max(tip.x + 12, 8), size - 8),
              top: Math.min(Math.max(tip.y + 12, 8), size - 8),
              transform: 'translate(-10%, -10%)',
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: tip.color }}
              />
              <p className="truncate text-sm font-semibold text-stone-900">{tip.label}</p>
            </div>
            <p className="mt-1 text-xs text-stone-500">
              {formatValue ? formatValue(tip.value) : tip.value.toLocaleString()}
              {' · '}
              {tip.percent.toFixed(1)}%
            </p>
          </div>
        ) : null}
      </div>

      <ul className="w-full space-y-1.5 text-sm">
        {slices.length === 0 ? (
          <li className="text-stone-500">ยังไม่มีหุ้นในกลุ่มนี้</li>
        ) : (
          slices.map((slice, index) => (
            <li
              key={slice.label}
              className={`flex items-center justify-between gap-3 rounded-md px-1 py-0.5 transition ${
                activeIndex === index ? 'bg-stone-50' : ''
              }`}
              onMouseEnter={() => {
                setActiveIndex(index);
                setTip({
                  label: slice.label,
                  value: slice.value,
                  percent: total > 0 ? (slice.value / total) * 100 : 0,
                  color: COLORS[index % COLORS.length],
                  x: size / 2,
                  y: size / 2,
                });
              }}
              onMouseLeave={() => {
                setActiveIndex(null);
                setTip(null);
              }}
            >
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
