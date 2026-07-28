# HTS Benchmark Leaderboard

React app for exploring hierarchical time-series forecasting results measured in
scaled CRPS (sCRPS), where lower is better.

Three views: an **overall results table**, a **100-point leaderboard**, and
**per-dataset line charts** of sCRPS at each hierarchy level.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build to dist/
```

Requires Node 18+.

## Point system

Mean sCRPS alone is misleading, since the average is taken over whatever datasets an
entry reports — skipping a hard one flatters it. So the leaderboard scores quality
and breadth separately, out of 100:

| Points | Component | Definition |
|---|---|---|
| 35 | Skill | Best sCRPS on a dataset ÷ this entry's sCRPS, averaged over covered datasets. |
| 25 | Rank | Normalised placing per dataset (1st = 1, last = 0), averaged over covered datasets. |
| 25 | Levels | The skill ratio recomputed on every individual hierarchy level. |
| 15 | Coverage | Share of datasets with a reported result. |

Quality components are measured only on covered datasets, so a missing result costs
coverage points instead of vanishing from an average. Weights live in `WEIGHTS` in
[src/lib/scoring.js](src/lib/scoring.js).

## Data

[src/data/benchmark.json](src/data/benchmark.json) drives everything — update it and
all views follow. Use `null` for an unreported result; it renders as `—` and counts
against coverage rather than as zero. Keys must match the names in `overallModels` /
`levelModels` exactly.

Its `leaderboard` array is unused — rankings are recomputed from `overall` and
`byLevel` so they can't drift out of sync.