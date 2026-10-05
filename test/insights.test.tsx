import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { fakeApi, person, renderAt } from './helpers';

const insights = (summary: string, sentiment: string, scoreTotal: number) => ({
  id: `ins_${summary.length}`,
  transcriptId: 'trn_1',
  recordingId: 'rec_1',
  transcriptVersion: 1,
  summary,
  intent: 'order',
  products: ['Ashwagandha'],
  sentiment,
  checks: [],
  scores: [],
  scoreTotal,
  scoreMax: 20,
  model: 'fake/one',
  inputTokens: 1,
  outputTokens: 1,
  formVersion: 'example-1',
  createdAt: '2026-10-05T05:00:00.000Z',
});

const call = (id: string, agent: string, campaign: string, made: ReturnType<typeof insights> | null) => ({
  id,
  originalName: `${id}.mp3`,
  mediaId: `med_${id}`,
  sizeBytes: 1000,
  sha256: '',
  durationSeconds: 61.5,
  channels: 1,
  sampleRate: 8000,
  source: 'ameyo',
  externalId: id,
  status: 'done',
  failureReason: '',
  latestTranscriptId: 'trn_1',
  detectedLanguage: 'hi',
  languageProbability: 0.9,
  callTime: '2026-10-05T04:30:00.000Z',
  createdAt: '2026-10-05T04:40:00.000Z',
  updatedAt: '2026-10-05T04:45:00.000Z',
  attributes: [
    { key: 'agent', value: agent },
    { key: 'campaign', value: campaign },
  ],
  jobs: [],
  insights: made,
});

/** What likho-analytics answers for the last two weeks. */
const analytics = {
  AnalyticsOverview: () => ({
    analyticsOverview: {
      calls: 240,
      transcribed: 230,
      failed: 4,
      minutes: 512.5,
      realtimeFactor: 0.9,
      analysed: 120,
      score: 0.82,
      sentiments: [
        { key: 'positive', count: 80 },
        { key: 'negative', count: 20 },
        { key: 'neutral', count: 20 },
      ],
      languages: [
        { key: 'hi', count: 200 },
        { key: 'ur', count: 30 },
      ],
    },
  }),
  AnalyticsTimeseries: (v: Record<string, unknown>) => ({
    analyticsTimeseries: [
      { at: '2026-09-22T00:00:00.000Z', value: v.metric === 'score' ? 0.8 : 10 },
      { at: '2026-09-23T00:00:00.000Z', value: v.metric === 'score' ? 0.9 : 20 },
    ],
  }),
  AnalyticsBreakdown: (v: Record<string, unknown>) => ({
    analyticsBreakdown:
      v.by === 'agent'
        ? [
            {
              key: 'asha',
              calls: 150,
              transcribed: 150,
              minutes: 300,
              analysed: 80,
              score: 0.85,
              negative: 10,
            },
            {
              key: 'ravi',
              calls: 90,
              transcribed: 80,
              minutes: 212.5,
              analysed: 40,
              score: 0.76,
              negative: 10,
            },
          ]
        : [
            {
              key: 'sale',
              calls: 240,
              transcribed: 230,
              minutes: 512.5,
              analysed: 120,
              score: 0.82,
              negative: 20,
            },
          ],
  }),
};

describe('the insights page', () => {
  it('shows the last two weeks in numbers, charts and tables', async () => {
    const { client, calls } = fakeApi({
      Me: () => ({ me: person }),
      ...analytics,
      InsightsStatus: () => ({
        insightsStatus: { enabled: true, model: 'fake/one', formVersion: 'example-1' },
      }),
      RecordingsWithInsights: () => ({ recordings: { items: [], hasMore: false, endCursor: null } }),
      RecordingFacets: () => ({ recordingFacets: [] }),
    });
    renderAt('/insights?campaign=sale', <App />, client);
    const numbers = await screen.findByLabelText('The last 14 days in numbers');
    await waitFor(() => expect(numbers).toHaveTextContent('Calls240'));
    expect(numbers).toHaveTextContent('Transcribed2304 failed');
    expect(numbers).toHaveTextContent('Minutes512.5');
    expect(numbers).toHaveTextContent('Speed0.90×');
    expect(numbers).toHaveTextContent('Average score82%');
    expect(await screen.findByRole('img', { name: /Calls a day: 22\/9: 10, 23\/9: 20/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /QA score a day: 22\/9: 80%, 23\/9: 90%/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Languages: Hindi 87%, Urdu 13%' })).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Moods: Positive 67%, Negative 17%, Neutral 17%' }),
    ).toBeInTheDocument();
    const agents = within(await screen.findByRole('table', { name: 'Agents, last 14 days' }))
      .getAllByRole('row')
      .slice(1);
    expect(agents[0]!.textContent).toMatch(/^asha\s*150\s*300\s*80\s*85%\s*10$/);
    // The campaign from the address narrows the numbers too.
    const asked = calls.find((c) => c.name === 'AnalyticsOverview')!.variables as {
      facts: { campaign?: string };
    };
    expect(asked.facts).toEqual({ campaign: 'sale', agent: undefined });
  });

  it('lists the day’s calls with their mood and score, and the numbers by agent and campaign', async () => {
    const { client, calls } = fakeApi({
      Me: () => ({ me: person }),
      ...analytics,
      InsightsStatus: () => ({
        insightsStatus: { enabled: true, model: 'fake/one', formVersion: 'example-1' },
      }),
      RecordingsWithInsights: () => ({
        recordings: {
          items: [
            call(
              'rec_1',
              'asha',
              'sale',
              insights('Ordered Ashwagandha; delivery in two days.', 'positive', 16),
            ),
            call('rec_2', 'asha', 'sale', insights('Complained that the parcel is late.', 'negative', 8)),
            call('rec_3', 'ravi', 'support', null),
          ],
          hasMore: false,
          endCursor: 'rec_3',
        },
      }),
      RecordingFacets: (v) => ({
        recordingFacets:
          v.key === 'campaign'
            ? [
                { value: 'sale', count: 2 },
                { value: 'support', count: 1 },
              ]
            : [
                { value: 'asha', count: 2 },
                { value: 'ravi', count: 1 },
              ],
      }),
    });
    renderAt('/insights?day=2026-10-05', <App />, client);

    const table = await screen.findByRole('table', { name: 'Calls' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Ordered Ashwagandha; delivery in two days.');
    expect(rows[0]).toHaveTextContent('Positive');
    expect(rows[0]).toHaveTextContent('16 / 20');
    expect(within(rows[0]!).getByRole('link', { name: 'rec_1.mp3' })).toHaveAttribute(
      'href',
      '/recordings/rec_1',
    );
    expect(rows[2]).toHaveTextContent('Not analysed');

    // The day: three calls, two analysed, scores of 80% and 40%, one negative.
    const numbers = screen.getByLabelText('The day in numbers');
    expect(numbers).toHaveTextContent('Calls3');
    expect(numbers).toHaveTextContent('Analysed2');
    expect(numbers).toHaveTextContent('Average score60%');
    expect(numbers).toHaveTextContent('Negative calls1');
    const agents = within(screen.getByRole('table', { name: 'By agent' }))
      .getAllByRole('row')
      .slice(1);
    expect(agents[0]).toHaveTextContent('asha');
    expect(agents[0]!.textContent).toMatch(/asha\s*2\s*2\s*60%\s*1/);
    expect(agents[1]!.textContent).toMatch(/ravi\s*1\s*0\s*–\s*0/);
    const campaigns = within(screen.getByRole('table', { name: 'By campaign' }))
      .getAllByRole('row')
      .slice(1);
    expect(campaigns[0]!.textContent).toMatch(/^sale\s*2\s*2\s*60%\s*1$/);
    expect(campaigns[1]!.textContent).toMatch(/^support\s*1\s*0\s*–\s*0$/);

    // The day's bounds went to the API, in the browser's zone.
    const asked = calls.find((c) => c.name === 'RecordingsWithInsights')!.variables as {
      filter: { since: string; until: string };
    };
    expect(asked.filter.since).toBe(new Date('2026-10-05T00:00:00').toISOString());
    expect(asked.filter.until).toBe(new Date('2026-10-06T00:00:00').toISOString());

    // Choosing an agent narrows the calls, in the address too.
    await userEvent.setup().selectOptions(screen.getByLabelText('Agent'), 'ravi');
    await waitFor(() =>
      expect(calls.filter((c) => c.name === 'RecordingsWithInsights').at(-1)!.variables).toMatchObject({
        filter: { agent: 'ravi' },
      }),
    );
  });

  it('says when insights are off, and when the day has no calls', async () => {
    const { client } = fakeApi({
      Me: () => ({ me: person }),
      ...analytics,
      InsightsStatus: () => ({ insightsStatus: { enabled: false, model: '', formVersion: 'example-1' } }),
      RecordingsWithInsights: () => ({ recordings: { items: [], hasMore: false, endCursor: null } }),
      RecordingFacets: () => ({ recordingFacets: [] }),
    });
    renderAt('/insights', <App />, client);
    expect(await screen.findByRole('status')).toHaveTextContent('no model is configured');
    expect(await screen.findByText('No calls on this day.')).toBeInTheDocument();
  });
});
