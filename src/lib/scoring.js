/**
 * Leaderboard scoring for the hierarchical time-series benchmark.
 *
 * The ranking is deliberately simple: models are ordered by their mean sCRPS
 * over the datasets in the overall table. Lower is better, ties broken by the
 * number of datasets won. Nothing else feeds the ranking — no weights, no
 * composite. Coverage and wins are reported alongside as context only, because
 * a model that skipped a dataset is averaging over an easier set.
 */

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Competition ranking (1,2,2,4) over ascending values. Returns Map model -> rank. */
function rankRow(row, models) {
  const scored = models
    .filter((m) => isNum(row[m]))
    .map((m) => ({ model: m, value: row[m] }))
    .sort((a, b) => a.value - b.value);

  const ranks = new Map();
  scored.forEach((entry, i) => {
    if (i > 0 && entry.value === scored[i - 1].value) {
      ranks.set(entry.model, ranks.get(scored[i - 1].model));
    } else {
      ranks.set(entry.model, i + 1);
    }
  });
  return ranks;
}

/** Smallest (best) value across the given models in a row, or null. */
export function bestInRow(row, models) {
  const values = models.map((m) => row[m]).filter(isNum);
  return values.length ? Math.min(...values) : null;
}

export function worstInRow(row, models) {
  const values = models.map((m) => row[m]).filter(isNum);
  return values.length ? Math.max(...values) : null;
}

/**
 * Ranks models by mean sCRPS across the overall table.
 * @returns {Array<object>} sorted best-first, each entry carrying `avgSCRPS`,
 *   `covered`, `datasetCount`, `wins` and its 1-based `rank`.
 */
export function computeLeaderboard(data) {
  const models = data.overallModels;
  const overall = data.overall;
  const datasetCount = overall.length;

  const bestPerDataset = new Map(
    overall.map((row) => [row.dataset, bestInRow(row, models)]),
  );

  const entries = models.map((model) => {
    let sum = 0;
    let covered = 0;
    let wins = 0;

    for (const row of overall) {
      const value = row[model];
      if (!isNum(value)) continue;
      covered += 1;
      sum += value;
      if (value === bestPerDataset.get(row.dataset)) wins += 1;
    }

    return {
      model,
      avgSCRPS: covered ? sum / covered : null,
      covered,
      datasetCount,
      wins,
    };
  });

  // Models with no result at all sink to the bottom rather than sorting on NaN.
  entries.sort((a, b) => {
    if (a.avgSCRPS === null) return 1;
    if (b.avgSCRPS === null) return -1;
    return a.avgSCRPS - b.avgSCRPS || b.wins - a.wins;
  });
  entries.forEach((entry, i) => {
    entry.rank =
      i > 0 && entry.avgSCRPS === entries[i - 1].avgSCRPS ? entries[i - 1].rank : i + 1;
  });
  return entries;
}

/** Rank lookup for the overall table: Map dataset -> Map model -> rank. */
export function overallRankMap(data) {
  const map = new Map();
  for (const row of data.overall) {
    map.set(row.dataset, rankRow(row, data.overallModels));
  }
  return map;
}

/** Ratio of a value to the row best, mapped to 0-1 for shading (1 = best). */
export function intensity(value, best, worst) {
  if (!isNum(value) || best === null || worst === null || worst === best) return 1;
  return 1 - (value - best) / (worst - best);
}

export const formatScore = (v) => (isNum(v) ? v.toFixed(4) : '—');
export const isNumber = isNum;
