/**
 * Leaderboard scoring for the hierarchical time-series benchmark.
 *
 * Models are ranked by their average positional rank across datasets.
 * On each dataset, models are ranked 1, 2, 3, ... by sCRPS (lower is better).
 * Models that did not run on a dataset are assigned last place.
 * A model's leaderboard position is the average of its ranks across all datasets.
 *
 * This method rewards consistency and reliability across diverse datasets.
 * A model that places 2nd on every dataset ranks higher than one that wins once
 * and bombs the rest — and coverage gaps are naturally penalized.
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
 * Ranks models by average positional rank across all datasets.
 * @returns {Array<object>} sorted best-first, each entry carrying `avgRank`,
 *   `covered`, `datasetCount`, `wins` and its 1-based `rank`.
 */
export function computeLeaderboard(data) {
  const models = data.overallModels;
  const overall = data.overall;
  const datasetCount = overall.length;

  // Per-dataset ranks: dataset -> (model -> rank)
  const datasetRanks = new Map(
    overall.map((row) => [row.dataset, rankRow(row, models)]),
  );

  // Per-dataset best values (for win counting)
  const bestPerDataset = new Map(
    overall.map((row) => [row.dataset, bestInRow(row, models)]),
  );

  const entries = models.map((model) => {
    let rankSum = 0;
    let covered = 0;
    let wins = 0;

    for (const row of overall) {
      const value = row[model];
      const ranks = datasetRanks.get(row.dataset);

      if (isNum(value)) {
        // Model ran on this dataset: use its actual rank.
        const rank = ranks.get(model);
        rankSum += rank;
        covered += 1;
        if (value === bestPerDataset.get(row.dataset)) wins += 1;
      } else {
        // Model did not run: assign last place (one past the last competitor).
        const lastPlace = Math.max(...ranks.values()) + 1;
        rankSum += lastPlace;
      }
    }

    return {
      model,
      avgRank: rankSum / datasetCount,
      covered,
      datasetCount,
      wins,
    };
  });

  // Sort by average rank (ascending = best).
  entries.sort((a, b) => a.avgRank - b.avgRank);
  entries.forEach((entry, i) => {
    entry.rank =
      i > 0 && entry.avgRank === entries[i - 1].avgRank ? entries[i - 1].rank : i + 1;
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
