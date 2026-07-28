import { useMemo, useState } from 'react';
import { BarChart3, LineChart, Table2, Terminal, Trophy } from 'lucide-react';
import data from './data/benchmark.json';
import { computeLeaderboard, overallRankMap } from './lib/scoring.js';
import { buildStyleMap } from './lib/modelStyles.js';
import BenchmarkTable from './components/BenchmarkTable.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import LevelChart from './components/LevelChart.jsx';

const TABS = [
  { key: 'benchmark', label: 'Benchmark', Icon: Table2 },
  { key: 'leaderboard', label: 'Leaderboard', Icon: Trophy },
  { key: 'levels', label: 'By level', Icon: LineChart },
];

export default function App() {
  const [tab, setTab] = useState('benchmark');
  const [scale, setScale] = useState('linear');

  const entries = useMemo(() => computeLeaderboard(data), []);
  const rankMap = useMemo(() => overallRankMap(data), []);
  // One identity map for the whole app, so a model wears the same hue in the
  // table, the leaderboard, and every chart. Order comes from the overall table.
  const styleMap = useMemo(
    () => buildStyleMap([...new Set([...data.overallModels, ...data.levelModels])]),
    [],
  );

  const leader = entries[0];

  return (
    <div className="shell">
      <header className="masthead">
        <div className="masthead__eyebrow">
          <Terminal size={13} strokeWidth={1.8} />
          Hierarchical time series · probabilistic forecasting
        </div>
        <h1>
          HTS Benchmark <em>/</em> Leaderboard
        </h1>
        <p>{data.description}</p>

        <div className="masthead__stats">
          <div className="stat">
            <div className="stat__k">Metric</div>
            <div className="stat__v">{data.metric}</div>
          </div>
          <div className="stat">
            <div className="stat__k">Models</div>
            <div className="stat__v">{data.overallModels.length}</div>
          </div>
          <div className="stat">
            <div className="stat__k">Datasets</div>
            <div className="stat__v">{data.overall.length}</div>
          </div>
          <div className="stat">
            <div className="stat__k">Leader</div>
            <div className="stat__v">{leader.model.replace(/\s*\(.*\)/, '')}</div>
          </div>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} className="tab" data-active={tab === key} onClick={() => setTab(key)}>
            <Icon size={13} strokeWidth={1.8} />
            {label}
          </button>
        ))}
      </nav>

      {tab === 'benchmark' && (
        <section className="section">
          <div className="section__head">
            <div className="section__title">
              <Table2 size={14} strokeWidth={1.8} />
              Overall results
            </div>
            <div className="section__note">Lower is better · aggregated over all hierarchy levels</div>
          </div>
          <p className="prose">
            Mean scaled CRPS per dataset, aggregated across the full hierarchy.
          </p>
          <BenchmarkTable data={data} rankMap={rankMap} styleMap={styleMap} />
        </section>
      )}

      {tab === 'leaderboard' && (
        <section className="section">
          <div className="section__head">
            <div className="section__title">
              <Trophy size={14} strokeWidth={1.8} />
              Model leaderboard
            </div>
            <div className="section__note">100-point composite · higher is better</div>
          </div>
          <Leaderboard entries={entries} styleMap={styleMap} />
        </section>
      )}

      {tab === 'levels' && (
        <section className="section">
          <div className="section__head">
            <div className="section__title">
              <BarChart3 size={14} strokeWidth={1.8} />
              Performance by hierarchy level
            </div>
            <div className="toolbar">
              <span className="section__note">Y axis</span>
              <div className="segmented">
                <button data-active={scale === 'linear'} onClick={() => setScale('linear')}>
                  Linear
                </button>
                <button data-active={scale === 'log'} onClick={() => setScale('log')}>
                  Log
                </button>
              </div>
            </div>
          </div>
          <p className="prose">
            sCRPS at each individual level of the hierarchy — aggregate values are excluded.
          </p>
          <div className="chartgrid">
            {Object.entries(data.byLevel).map(([dataset, rows]) => (
              <LevelChart
                key={dataset}
                dataset={dataset}
                rows={rows}
                models={data.levelModels}
                styleMap={styleMap}
                scale={scale}
              />
            ))}
          </div>
        </section>
      )}

      <footer className="footnotes">
        <div>
          Models labelled <code>(not coherent)</code> do not guarantee that forecasts add up across
          the hierarchy, so their scores are not directly comparable to the coherent methods.
        </div>
        <div>
          Levels marked <code>geo.</code> are geographic, <code>prp.</code> purpose-based.
        </div>
      </footer>
    </div>
  );
}
