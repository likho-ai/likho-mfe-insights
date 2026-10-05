/** A small bar chart of one number per day, drawn as SVG: no library, scales with its box. */

export interface BarPoint {
  at: string;
  value: number;
}

const dayOf = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

export function Bars({
  title,
  points,
  format = (v) => String(Math.round(v)),
}: {
  title: string;
  points: BarPoint[];
  format?: (value: number) => string;
}) {
  const height = 120;
  const max = Math.max(1e-9, ...points.map((p) => p.value));
  const slot = 100 / Math.max(points.length, 1);
  const every = Math.max(1, Math.ceil(points.length / 7));
  const said = points.map((p) => `${dayOf(p.at)}: ${format(p.value)}`).join(', ');
  return (
    <figure className="min-w-0">
      <figcaption className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{title}</span>
        <span className="text-ink-3">peak {format(max)}</span>
      </figcaption>
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${title}: ${said || 'nothing yet'}`}
        className="mt-2 h-32 w-full"
      >
        {points.map((p, i) => {
          const h = max > 0 ? (p.value / max) * (height - 18) : 0;
          return (
            <rect
              key={p.at}
              x={i * slot + slot * 0.15}
              y={height - 14 - h}
              width={slot * 0.7}
              height={Math.max(h, p.value > 0 ? 1 : 0)}
              className="fill-accent"
            >
              <title>{`${dayOf(p.at)}: ${format(p.value)}`}</title>
            </rect>
          );
        })}
        <line x1="0" y1={height - 14} x2="100" y2={height - 14} className="stroke-line" strokeWidth="0.5" />
        {points.map((p, i) =>
          i % every === 0 ? (
            <text
              key={`label-${p.at}`}
              x={i * slot + slot / 2}
              y={height - 3}
              textAnchor="middle"
              fontSize="6"
              className="fill-ink-3"
            >
              {dayOf(p.at)}
            </text>
          ) : null,
        )}
      </svg>
    </figure>
  );
}

/** A share of a whole as one bar split by key, with a legend: languages, moods. */
export function Mix({ title, parts }: { title: string; parts: { key: string; count: number }[] }) {
  const total = parts.reduce((a, b) => a + b.count, 0);
  const shades = ['bg-accent', 'bg-accent/70', 'bg-accent/45', 'bg-accent/25', 'bg-ink-3/40'];
  return (
    <div className="min-w-0">
      <p className="text-sm font-medium">{title}</p>
      {total === 0 ? (
        <p className="mt-2 text-sm text-ink-3">Nothing yet.</p>
      ) : (
        <>
          <div
            className="mt-2 flex h-3 overflow-hidden rounded-full bg-surface-2"
            role="img"
            aria-label={`${title}: ${parts.map((p) => `${p.key} ${Math.round((100 * p.count) / total)}%`).join(', ')}`}
          >
            {parts.map((p, i) => (
              <div
                key={p.key}
                className={shades[Math.min(i, shades.length - 1)]}
                style={{ width: `${(100 * p.count) / total}%` }}
                title={`${p.key}: ${p.count}`}
              />
            ))}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {parts.map((p, i) => (
              <li key={p.key} className="flex items-center gap-1.5">
                <span
                  className={`inline-block size-2.5 rounded-sm ${shades[Math.min(i, shades.length - 1)]}`}
                  aria-hidden="true"
                />
                <span>{p.key}</span>
                <span className="text-ink-3">{Math.round((100 * p.count) / total)}%</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
