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

Two sources drive the app, switched by the **Paper / Experiments** toggle in the nav:

| File | Shown as |
|---|---|
| [src/data/benchmark.csv](src/data/benchmark.csv) | Paper — published results |
| [src/data/experiments.csv](src/data/experiments.csv) | Experiments — your own runs |

Both are one long table, one row per measurement:

```csv
model,dataset,level,scrps
CLOVER (crps),Labour,Overall,0.008148
CLOVER (crps),Labour,1 (geo.),0.004484
```

* `level` `Overall` fills the benchmark table; every other level feeds the charts.
* A missing `scrps` (blank cell, or no row at all) renders as `—` and is scored as
  a model that did not run on that dataset.
* **Row order is display order**: table columns follow the order models first
  appear, dataset rows and chart x axes likewise. Reordering the file reorders
  the page, including each model's colour.

Adding a model means appending its rows — nothing existing has to be touched,
which is what makes the format safe to write from a pipeline.

### From a run

[scripts/add_results.py](scripts/add_results.py) turns a run's `level,scrps`
file into those rows (a `mean` column is accepted too):

```bash
python scripts/add_results.py "CLOVER (crps)" Labour ../CLOVER/results/labour_scrps.csv
```

Re-running replaces that model's rows for that dataset in place, so a repeated
seed sweep updates its numbers without duplicating them or shuffling the page.
Levels are numbered in file order; `PURPOSE_LEVELS` in the script says how many
trailing levels of each dataset are purpose-based rather than geographic.

Rankings are always recomputed from the data, so they cannot drift out of sync.
