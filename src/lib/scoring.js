const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

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

export function bestInRow(row, models) {
  const values = models.map((m) => row[m]).filter(isNum);
  return values.length ? Math.min(...values) : null;
}

export function worstInRow(row, models) {
  const values = models.map((m) => row[m]).filter(isNum);
  return values.length ? Math.max(...values) : null;
}

export function computeLeaderboard(data) {
  const models = data.overallModels;
  const overall = data.overall;
  const datasetCount = overall.length;

  const datasetRanks = new Map(
    overall.map((row) => [row.dataset, rankRow(row, models)]),
  );

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
        const rank = ranks.get(model);
        rankSum += rank;
        covered += 1;
        if (value === bestPerDataset.get(row.dataset)) wins += 1;
      } else {
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

  entries.sort((a, b) => a.avgRank - b.avgRank);
  entries.forEach((entry, i) => {
    entry.rank =
      i > 0 && entry.avgRank === entries[i - 1].avgRank ? entries[i - 1].rank : i + 1;
  });
  return entries;
}

export function overallRankMap(data) {
  const map = new Map();
  for (const row of data.overall) {
    map.set(row.dataset, rankRow(row, data.overallModels));
  }
  return map;
}

export function intensity(value, best, worst) {
  if (!isNum(value) || best === null || worst === null || worst === best) return 1;
  return 1 - (value - best) / (worst - best);
}

export const formatScore = (v) => (isNum(v) ? v.toFixed(4) : '—');
export const isNumber = isNum;
