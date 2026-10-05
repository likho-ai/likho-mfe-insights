/**
 * The insights app: the day's calls with what the model said about each one - the summary, the
 * customer's mood and the auditor's score - and the same numbers by agent and by campaign.
 * Exposed to the shell as ./App; mounted at /insights. Everyone sees it.
 */
import { Tag } from '@likho-ai/ui';
import {
  lastDays,
  useInsightsStatus,
  useRecordingFacets,
  useRecordingsWithInsights,
  type RecordingFilter,
  type RecordingWithInsights,
} from '@likho-ai/web-sdk';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Dashboard } from './components/Dashboard';
import './app.css';

const SENTIMENT: Record<string, string> = {
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
  mixed: 'Mixed',
};

const field =
  'min-h-11 rounded-input border border-line-strong bg-surface px-3 text-ink focus-visible:outline-accent';
const card = 'rounded-card border border-line bg-surface p-5 shadow-card';
const th = 'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-3';
const td = 'px-3 py-2 align-top';

const pad = (n: number) => String(n).padStart(2, '0');
const number = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Today as YYYY-MM-DD in the browser's zone (the date input's format). */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The day's bounds in the browser's zone, as the API wants them. */
function dayBounds(day: string): { since: string; until: string } {
  const start = new Date(`${day}T00:00:00`);
  if (Number.isNaN(start.getTime())) return dayBounds(today());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { since: start.toISOString(), until: end.toISOString() };
}

const attribute = (r: RecordingWithInsights, key: string) =>
  r.attributes.find((a) => a.key === key)?.value ?? '';

/** A score as a share of its maximum, in percent; null when the call has no score. */
function percent(r: RecordingWithInsights): number | null {
  if (!r.insights || r.insights.scoreMax <= 0) return null;
  return (100 * r.insights.scoreTotal) / r.insights.scoreMax;
}

interface Numbers {
  calls: number;
  analysed: number;
  /** The mean of the calls' scores, in percent of the maximum; null without any. */
  score: number | null;
  negative: number;
}

function summarise(items: RecordingWithInsights[]): Numbers {
  const scores = items.map(percent).filter((p): p is number => p !== null);
  return {
    calls: items.length,
    analysed: items.filter((r) => r.insights).length,
    score: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
    negative: items.filter((r) => r.insights?.sentiment === 'negative').length,
  };
}

function groupBy(items: RecordingWithInsights[], key: string): { name: string; numbers: Numbers }[] {
  const groups = new Map<string, RecordingWithInsights[]>();
  for (const item of items) {
    const name = attribute(item, key) || '(none)';
    groups.set(name, [...(groups.get(name) ?? []), item]);
  }
  return [...groups]
    .map(([name, calls]) => ({ name, numbers: summarise(calls) }))
    .sort((a, b) => b.numbers.calls - a.numbers.calls || a.name.localeCompare(b.name));
}

export default function App() {
  const [params, setParams] = useSearchParams();
  const day = params.get('day') || today();
  const campaign = params.get('campaign') ?? '';
  const agent = params.get('agent') ?? '';
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const bounds = dayBounds(day);
  const filter: RecordingFilter = {
    ...bounds,
    campaign: campaign || undefined,
    agent: agent || undefined,
  };
  const status = useInsightsStatus();
  const calls = useRecordingsWithInsights(filter, 100);
  // The campaigns and agents to choose from come from the last two weeks (the dashboard's
  // window), with their counts, so the lists are there even on a day without calls.
  const fortnight = useMemo(() => lastDays(14), []);
  const campaigns = useRecordingFacets('campaign', fortnight);
  const agents = useRecordingFacets('agent', { ...fortnight, campaign: campaign || undefined });
  const items = useMemo(() => calls.data?.items ?? [], [calls.data]);
  const numbers = useMemo(() => summarise(items), [items]);
  const byAgent = useMemo(() => groupBy(items, 'agent'), [items]);
  const byCampaign = useMemo(() => groupBy(items, 'campaign'), [items]);
  const off = status.data?.enabled === false;

  return (
    <div data-mfe="insights" className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Insights</h1>
        <p className="mt-1 max-w-2xl text-ink-2">
          What the model says about the day&apos;s calls: a summary of each, the customer&apos;s mood, and the
          auditor&apos;s form pre-filled with a score. Open a call to read the checks beside its transcript.
        </p>
        {off && (
          <p role="status" className="mt-2 text-sm text-ink-2">
            Insights are off: no model is configured, so no transcript text leaves this installation.
          </p>
        )}
      </div>

      <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => e.preventDefault()}>
        <label className="grid gap-1 text-sm">
          <span className="text-ink-2">Day</span>
          <input type="date" value={day} onChange={(e) => set('day', e.target.value)} className={field} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-ink-2">Campaign</span>
          <select value={campaign} onChange={(e) => set('campaign', e.target.value)} className={field}>
            <option value="">Any campaign</option>
            {(campaigns.data ?? []).map((f) => (
              <option key={f.value} value={f.value}>
                {f.value} ({f.count})
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-ink-2">Agent</span>
          <select value={agent} onChange={(e) => set('agent', e.target.value)} className={field}>
            <option value="">Any agent</option>
            {(agents.data ?? []).map((f) => (
              <option key={f.value} value={f.value}>
                {f.value} ({f.count})
              </option>
            ))}
          </select>
        </label>
      </form>

      <Dashboard facts={{ campaign: campaign || undefined, agent: agent || undefined }} />

      <h2 className="text-xl font-bold">The day</h2>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="The day in numbers">
        <Stat label="Calls" value={String(numbers.calls)} />
        <Stat label="Analysed" value={String(numbers.analysed)} />
        <Stat label="Average score" value={numbers.score === null ? '–' : `${Math.round(numbers.score)}%`} />
        <Stat label="Negative calls" value={String(numbers.negative)} />
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <Groups title="By agent" rows={byAgent} />
        <Groups title="By campaign" rows={byCampaign} />
      </div>

      <section className={card} aria-labelledby="calls-title">
        <h2 id="calls-title" className="text-xl font-bold">
          Calls
        </h2>
        {calls.isPending ? (
          <p className="mt-3 text-sm text-ink-3" aria-busy="true">
            Loading…
          </p>
        ) : calls.isError ? (
          <p role="alert" className="mt-3 text-sm text-[var(--likho-status-failed-ink)]">
            {calls.error.message}
          </p>
        ) : items.length === 0 ? (
          <p className="mt-3 text-sm text-ink-2">No calls on this day.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm" aria-label="Calls">
              <thead>
                <tr className="border-b border-line">
                  <th className={th}>Time</th>
                  <th className={th}>Call</th>
                  <th className={th}>Agent</th>
                  <th className={th}>Campaign</th>
                  <th className={th}>Mood</th>
                  <th className={th}>Score</th>
                  <th className={th}>Summary</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-b border-line last:border-0">
                    <td className={`${td} whitespace-nowrap font-mono text-xs`}>
                      {r.callTime
                        ? new Date(r.callTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : ''}
                    </td>
                    <td className={td}>
                      <Link to={`/recordings/${r.id}`} className="break-all font-medium hover:underline">
                        {r.originalName}
                      </Link>
                    </td>
                    <td className={td}>{attribute(r, 'agent')}</td>
                    <td className={td}>{attribute(r, 'campaign')}</td>
                    <td className={td}>
                      {r.insights ? (
                        <Tag>{SENTIMENT[r.insights.sentiment] ?? r.insights.sentiment}</Tag>
                      ) : null}
                    </td>
                    <td className={`${td} whitespace-nowrap font-mono text-xs`}>
                      {r.insights && r.insights.scoreMax > 0
                        ? `${number(r.insights.scoreTotal)} / ${number(r.insights.scoreMax)}`
                        : ''}
                    </td>
                    <td className={`${td} min-w-64 max-w-xl text-ink-2`}>
                      {r.insights ? r.insights.summary : <span className="text-ink-3">Not analysed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {calls.data?.hasMore && (
              <p className="mt-3 text-sm text-ink-3">The first 100 calls of the day are shown.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={card}>
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className="mt-1 text-2xl font-bold">{value}</dd>
    </div>
  );
}

function Groups({ title, rows }: { title: string; rows: { name: string; numbers: Numbers }[] }) {
  const id = title.toLowerCase().replace(/\s+/g, '-');
  return (
    <section className={card} aria-labelledby={id}>
      <h2 id={id} className="text-xl font-bold">
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-ink-2">Nothing yet.</p>
      ) : (
        <table className="mt-3 w-full text-sm" aria-label={title}>
          <thead>
            <tr className="border-b border-line">
              <th className={th}>Name</th>
              <th className={`${th} text-right`}>Calls</th>
              <th className={`${th} text-right`}>Analysed</th>
              <th className={`${th} text-right`}>Score</th>
              <th className={`${th} text-right`}>Negative</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ name, numbers }) => (
              <tr key={name} className="border-b border-line last:border-0">
                <td className={td}>{name}</td>
                <td className={`${td} text-right font-mono text-xs`}>{numbers.calls}</td>
                <td className={`${td} text-right font-mono text-xs`}>{numbers.analysed}</td>
                <td className={`${td} text-right font-mono text-xs`}>
                  {numbers.score === null ? '–' : `${Math.round(numbers.score)}%`}
                </td>
                <td className={`${td} text-right font-mono text-xs`}>{numbers.negative}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
