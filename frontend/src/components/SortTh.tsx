export function SortTh({
  label,
  active,
  dir,
  align,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: 'asc' | 'desc';
  align?: 'right';
  onClick: () => void;
}) {
  return (
    <th className={`sortable ${align === 'right' ? 'text-right' : ''}`}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 ${align === 'right' ? 'w-full justify-end' : ''}`}
      >
        {label}
        <span className="text-xs">{active ? (dir === 'asc' ? '▲' : '▼') : '↕'}</span>
      </button>
    </th>
  );
}
