/**
 * Composite point system for the hierarchical time-series benchmark.
 *
 * The raw `avgSCRPS` shipped in benchmark.json is misleading: it averages only
 * over the datasets a model actually ran on, so a model that skips the hardest
 * dataset (e.g. Favorita) gets a flattering mean. The point system below fixes
 * that by scoring quality and breadth separately, then recombining them.
 *
 * Every model earns 0-100 points from four bounded sub-scores:
 *
 *   SKILL     35 pts  Ratio of the dataset-best sCRPS to the model's sCRPS,
 *                     averaged over the datasets it covers. 1.0 = best
 *                     everywhere. Scale-free, so Labour (~0.007) and Favorita
 *                     (~0.3) contribute equally instead of the harder dataset
 *                     dominating a raw mean.
 *   RANK      25 pts  Normalised placing (1st = 1, last = 0) averaged over the
 *                     datasets it covers. Rewards consistently beating peers
 *                     even where the margin in sCRPS is small.
 *   LEVELS    25 pts  Same ratio as SKILL but computed over every individual
 *                     hierarchy level, so a model that wins the aggregate while
 *                     being weak deep in the hierarchy is not over-rewarded.
 *   COVERAGE  15 pts  Fraction of the 6 datasets with a reported result.
 *                     Kept as its own term so "good but narrow" is visible
 *                     rather than silently folded into the quality scores.
 *
 * Lower sCRPS is better throughout; all sub-scores are higher-is-better.
 */

export const WEIGHTS = {
  skill: 35,
  rank: 25,
  levels: 25,
  coverage: 15,
};

export const WEIGHT_META = [
  {
    key: 'skill',
    label: 'Skill',
    weight: WEIGHTS.skill,
    blurb: 'Best sCRPS on the dataset / this model’s sCRPS, averaged over covered datasets.',
  },
  {
    key: 'rank',
    label: 'Rank',
    weight: WEIGHTS.rank,
    blurb: 'Normalised placing per dataset (1st = 1, last = 0), averaged over covered datasets.',
  },
  {
    key: 'levels',
    label: 'Levels',
    weight: WEIGHTS.levels,
    blurb: 'Skill ratio recomputed on every individual hierarchy level, then averaged.',
  },
  {
    key: 'coverage',
    label: 'Coverage',
    weight: WEIGHTS.coverage,
    blurb: 'Share of the benchmark’s datasets the model reports a result for.',
  },
];

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

/**
 * Builds the ranked leaderboard plus the per-model sub-score breakdown.
 * @returns {Array<object>} sorted best-first, each entry carrying `points`,
 *   `parts` (raw 0-1 sub-scores), `contrib` (points contributed per part).
 */
export function computeLeaderboard(data) {
  const models = data.overallModels;
  const overall = data.overall;
  const datasetCount = overall.length;

  // --- per-dataset best + ranks on the overall table -------------------------
  const overallBest = new Map();
  const overallRanks = new Map();
  for (const row of overall) {
    overallBest.set(row.dataset, bestInRow(row, models));
    overallRanks.set(row.dataset, rankRow(row, models));
  }

  // --- per-level best across every dataset ----------------------------------
  const levelRows = [];
  for (const [dataset, rows] of Object.entries(data.byLevel)) {
    for (const row of rows) {
      levelRows.push({ dataset, row, best: bestInRow(row, data.levelModels) });
    }
  }

  const entries = models.map((model) => {
    let skillSum = 0;
    let rankSum = 0;
    let covered = 0;
    let wins = 0;
    let podiums = 0;
    let scrpsSum = 0;

    for (const row of overall) {
      const value = row[model];
      if (!isNum(value)) continue;
      covered += 1;
      scrpsSum += value;

      const best = overallBest.get(row.dataset);
      skillSum += best / value;

      const ranks = overallRanks.get(row.dataset);
      const rank = ranks.get(model);
      const n = ranks.size;
      rankSum += n > 1 ? (n - rank) / (n - 1) : 1;
      if (rank === 1) wins += 1;
      if (rank <= 3) podiums += 1;
    }

    let levelSum = 0;
    let levelCount = 0;
    let levelWins = 0;
    for (const { row, best } of levelRows) {
      const value = row[model];
      if (!isNum(value) || best === null) continue;
      levelSum += best / value;
      levelCount += 1;
      if (value === best) levelWins += 1;
    }

    const parts = {
      skill: covered ? skillSum / covered : 0,
      rank: covered ? rankSum / covered : 0,
      levels: levelCount ? levelSum / levelCount : 0,
      coverage: datasetCount ? covered / datasetCount : 0,
    };

    const contrib = {
      skill: parts.skill * WEIGHTS.skill,
      rank: parts.rank * WEIGHTS.rank,
      levels: parts.levels * WEIGHTS.levels,
      coverage: parts.coverage * WEIGHTS.coverage,
    };

    const points = contrib.skill + contrib.rank + contrib.levels + contrib.coverage;

    return {
      model,
      points,
      parts,
      contrib,
      covered,
      datasetCount,
      wins,
      podiums,
      levelWins,
      levelCount,
      avgSCRPS: covered ? scrpsSum / covered : null,
    };
  });

  entries.sort((a, b) => b.points - a.points || a.avgSCRPS - b.avgSCRPS);
  entries.forEach((entry, i) => {
    entry.rank = i > 0 && entry.points === entries[i - 1].points ? entries[i - 1].rank : i + 1;
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

export function worstInRow(row, models) {
  const values = models.map((m) => row[m]).filter(isNum);
  return values.length ? Math.max(...values) : null;
}

export const formatScore = (v) => (isNum(v) ? v.toFixed(4) : '—');
export const formatPoints = (v) => v.toFixed(1);
export const isNumber = isNum;
