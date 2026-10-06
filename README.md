# likho-mfe-insights

The insights app of [Likho](https://github.com/likho-ai): what the model says about the day's
calls. Mounted by [likho-web-shell](https://github.com/likho-ai/likho-web-shell) at `/insights`.

## What it does

For one day (and a campaign or an agent, from the address: `?day=2026-10-05&campaign=sale&agent=...`):

- **The day in numbers:** calls, how many are analysed, the average score as a share of the
  form's maximum, and how many calls ended on a negative note.
- **By agent and by campaign:** the same numbers per name, most calls first.
- **The calls:** time, name (a link to the transcript, where the checks are), agent, campaign,
  the customer's mood, the score, and the summary. A call that has not been analysed says so.

It reads `recordings(filter)` with each recording's `insights` (`useRecordingsWithInsights` in
the SDK) and `recordingFacets` for the campaign and agent lists. When no model is configured
(`insightsStatus.enabled` is false) the page says so: nothing is analysed and no transcript text
leaves the installation.

## Run it

```bash
pnpm install
pnpm dev            # http://localhost:5278/mfe/insights/ on its own, against the gateway at 8080
```

In the shell, the gateway proxies `/mfe/insights/` here (likho-infra's nginx) and the manifest
names `/mfe/insights/remoteEntry.js`; open http://localhost:8080/insights.

## Develop

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

The tests render the page against a fake API; nothing here needs the stack. The CSS is scoped
to `[data-mfe="insights"]` at build time, so it cannot leak into the shell or another app.
