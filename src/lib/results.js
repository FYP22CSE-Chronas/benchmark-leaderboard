const OVERALL = 'Overall';

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];

    if (quoted) {
      if (c !== '"') field += c;
      else if (text[i + 1] === '"') { field += '"'; i += 1; }
      else quoted = false;
      continue;
    }

    if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }

  row.push(field);
  if (row.length > 1 || row[0] !== '') rows.push(row);
  return rows;
}

export function buildDataset(csvText, meta) {
  const [header, ...body] = parseCsv(csvText);
  if (!header) throw new Error('results CSV is empty');

  const col = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
  for (const required of ['model', 'dataset', 'level', 'scrps']) {
    if (col[required] === undefined) throw new Error(`results CSV is missing a "${required}" column`);
  }

  const models = [];
  const overall = new Map();
  const byLevel = new Map();

  for (const cells of body) {
    const model = cells[col.model]?.trim();
    const dataset = cells[col.dataset]?.trim();
    const level = cells[col.level]?.trim();
    if (!model || !dataset || !level) continue;

    const raw = cells[col.scrps]?.trim();
    if (raw === undefined || raw === '') continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error(`"${raw}" is not a number (${model} / ${dataset} / ${level})`);

    if (!models.includes(model)) models.push(model);

    if (level === OVERALL) {
      if (!overall.has(dataset)) overall.set(dataset, { dataset });
      overall.get(dataset)[model] = value;
    } else {
      if (!byLevel.has(dataset)) byLevel.set(dataset, new Map());
      const levels = byLevel.get(dataset);
      if (!levels.has(level)) levels.set(level, { level });
      levels.get(level)[model] = value;
    }
  }

  const present = (rows) => models.filter((m) => rows.some((r) => m in r));
  const overallRows = [...overall.values()];
  const levelRows = Object.fromEntries(
    [...byLevel].map(([dataset, levels]) => [dataset, [...levels.values()]]),
  );

  return {
    metric: meta.metric,
    description: meta.description,
    lowerIsBetter: meta.lowerIsBetter ?? true,
    overallModels: present(overallRows),
    levelModels: present(Object.values(levelRows).flat()),
    overall: overallRows,
    byLevel: levelRows,
  };
}
