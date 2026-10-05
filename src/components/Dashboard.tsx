/** The last two weeks in numbers: calls and minutes a day, speed, languages, moods, the QA score, and the agents and campaigns. */
import {
  lastDays,
  useAnalyticsBreakdown,
  useAnalyticsOverview,
  useAnalyticsTimeseries,
  type AnalyticsFacts,
  type AnalyticsRow,
} from '@likho-ai/web-sdk';
import { useMemo } from 'react';
import { Bars, Mix } from './Bars';

const card = 'rounded-card border border-line bg-surface p-5 shadow-card';
const th = 'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-3';
const td = 'px-3 py-2 align-top';

const SENTIMENT: Record<string, string> = {
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
  mixed: 'Mixed',
};
const LANGUAGE: Record<string, string> = { hi: 'Hindi', ur: 'Urdu', en: 'English', '(none)': 'unknown' };

const one = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
const percent = (v: number) => `${Math.round(100 * v)}%`;

export function Dashboard({ facts, days = 14 }: { facts: AnalyticsFacts; days?: number }) {
  const window = useMemo(() => lastDays(days), [days]);
  const overview = useAnalyticsOverview(window, facts);
  const calls = useAnalyticsTimeseries('calls', window, facts);
  const minutes = useAnalyticsTimeseries('minutes', window, facts);
  const score = useAnalyticsTimeseries('score', window, facts);
  const agents = useAnalyticsBreakdown('agent', window, facts, 10);
  const campaigns = useAnalyticsBreakdown('campaign', window, facts, 10);
  const o = overview.data;

  return (
    <section aria-labelledby="dashboard-title" className="space-y-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="dashboard-title" className="text-xl font-bold">
          The last {days} days
        </h2>
        {overview.isError && (
          <p role="alert" className="text-sm text-[var(--likho-status-failed-ink)]">
            {overview.error.message}
          </p>
        )}
      </div>

      <dl
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
        aria-label={`The last ${days} days in numbers`}
      >
        <Stat label="Calls" value={o ? String(o.calls) : '–'} />
        <Stat
          label="Transcribed"
          value={o ? String(o.transcribed) : '–'}
          note={o && o.failed > 0 ? `${o.failed} failed` : undefined}
        />
        <Stat label="Minutes" value={o ? one(o.minutes) : '–'} />
        <Stat
          label="Speed"
          value={o && o.realtimeFactor > 0 ? `${o.realtimeFactor.toFixed(2)}×` : '–'}
          note="work per audio second"
        />
        <Stat label="Analysed" value={o ? String(o.analysed) : '–'} />
        <Stat label="Average score" value={o && o.analysed > 0 ? percent(o.score) : '–'} />
      </dl>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className={card}>
          <Bars title="Calls a day" points={calls.data ?? []} />
        </div>
        <div className={card}>
          <Bars title="Minutes a day" points={minutes.data ?? []} format={one} />
        </div>
        <div className={card}>
          <Bars title="QA score a day" points={score.data ?? []} format={percent} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className={card}>
          <Mix
            title="Languages"
            parts={(o?.languages ?? []).map((l) => ({ key: LANGUAGE[l.key] ?? l.key, count: l.count }))}
          />
        </div>
        <div className={card}>
          <Mix
            title="Moods"
            parts={(o?.sentiments ?? []).map((s) => ({ key: SENTIMENT[s.key] ?? s.key, count: s.count }))}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Breakdown title={`Agents, last ${days} days`} rows={agents.data ?? []} />
        <Breakdown title={`Campaigns, last ${days} days`} rows={campaigns.data ?? []} />
      </div>
    </section>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className={card}>
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className="mt-1 text-2xl font-bold">{value}</dd>
      {note && <dd className="text-xs text-ink-3">{note}</dd>}
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: AnalyticsRow[] }) {
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return (
    <section className={card} aria-labelledby={id}>
      <h3 id={id} className="font-bold">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-ink-2">Nothing yet.</p>
      ) : (
        <table className="mt-3 w-full text-sm" aria-label={title}>
          <thead>
            <tr className="border-b border-line">
              <th className={th}>Name</th>
              <th className={`${th} text-right`}>Calls</th>
              <th className={`${th} text-right`}>Minutes</th>
              <th className={`${th} text-right`}>Analysed</th>
              <th className={`${th} text-right`}>Score</th>
              <th className={`${th} text-right`}>Negative</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-line last:border-0">
                <td className={td}>{r.key}</td>
                <td className={`${td} text-right font-mono text-xs`}>{r.calls}</td>
                <td className={`${td} text-right font-mono text-xs`}>{one(r.minutes)}</td>
                <td className={`${td} text-right font-mono text-xs`}>{r.analysed}</td>
                <td className={`${td} text-right font-mono text-xs`}>
                  {r.analysed > 0 ? percent(r.score) : '–'}
                </td>
                <td className={`${td} text-right font-mono text-xs`}>{r.negative}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
