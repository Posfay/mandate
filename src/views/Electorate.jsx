import { useCallback, useMemo, useState } from 'react';
import Swarm, { withRgb } from '../ui/Swarm.jsx';
import { Meter } from '../ui/bits.jsx';
import { approvalTargets, issueSat } from '../engine/core.js';
import { ISSUES } from '../data/blocs.js';
import { BLOC_MAP } from '../data/blocs.js';

export default function Electorate({ s, v }) {
  const [mode, setMode] = useState('party');
  const [sel, setSel] = useState('work');
  const [hover, setHover] = useState(null);
  const onHover = useCallback((id) => setHover(id), []);
  const parties = useMemo(() => withRgb(s.parties), [s.countryId]);
  const drivers = useMemo(() => approvalTargets(s, true), [v]);
  const sat = useMemo(() => issueSat(s), [v]);
  const b = s.blocs.find((x) => x.id === (hover || sel));
  const def = BLOC_MAP[b.id];
  const parts = drivers[b.id].parts.filter((p) => Math.abs(p.v) >= 0.3 && p.label !== 'Baseline');
  const maxPart = Math.max(8, ...parts.map((p) => Math.abs(p.v)));
  const concerns = ISSUES.map((i) => ({ ...i, w: (b.w[i.id] || 0.3) * s.sal[i.id] })).sort((a, z) => z.w - a.w).slice(0, 5);
  const ordered = [...s.parties].sort((a, z) => a.econ - z.econ);

  return (
    <>
      <div className="view-head">
        <div>
          <div className="label">Ten voter blocs, {s.blocs.length ? 'weighted by population' : ''}</div>
          <h1 className="h1">The electorate</h1>
        </div>
        <div className="seg">
          <button className={mode === 'party' ? 'on' : ''} onClick={() => setMode('party')}>Voting intention</button>
          <button className={mode === 'approval' ? 'on' : ''} onClick={() => setMode('approval')}>Approval</button>
        </div>
      </div>
      <div className="el-grid">
        <div className="col" style={{ gap: 18 }}>
          <div className="panel swarm-wrap" style={{ height: 'min(62vh, 620px)' }}>
            <Swarm blocs={s.blocs} parties={parties} polls={s.polls} govIds={s.gov} mode={mode} highlight={sel} stamp={v} onHoverBloc={onHover} />
          </div>
          <div className="panel panel-pad">
            <div className="panel-head">
              <span className="h3">{def.name}</span>
              <span className="label">{Math.round(b.size * 100)}% of citizens, {Math.round(b.turnout * 100)}% turn out</span>
            </div>
            <p className="dim" style={{ marginTop: 0, maxWidth: '64ch' }}>{def.blurb}</p>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 22 }}>
              <div>
                <div className="label" style={{ marginBottom: 8 }}>Why they feel the way they do</div>
                {parts.map((p) => (
                  <div key={p.label} className="driver">
                    <div>
                      <div className="spread small"><span className="dim">{p.label}</span><span className={`num ${p.v >= 0 ? 'good' : 'bad'}`}>{p.v >= 0 ? '+' : '−'}{Math.abs(p.v).toFixed(1)}</span></div>
                      <div className="bar" style={{ marginTop: 4 }}>
                        <i style={{ left: p.v >= 0 ? '50%' : `${50 - (Math.abs(p.v) / maxPart) * 50}%`, width: `${(Math.abs(p.v) / maxPart) * 50}%`, background: p.v >= 0 ? 'var(--good)' : 'var(--bad)' }} />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="spread" style={{ marginTop: 8 }}>
                  <span className="small dim">Heading toward</span>
                  <b className="num">{Math.round(b.target)}% approval</b>
                </div>
              </div>
              <div>
                <div className="label" style={{ marginBottom: 8 }}>What they care about now</div>
                {concerns.map((i) => (
                  <div key={i.id} className="spread small" style={{ padding: '5px 0', borderBottom: '1px solid var(--hair-soft)' }}>
                    <span>{i.name}</span>
                    <span className={sat[i.id] > 0.05 ? 'good' : sat[i.id] < -0.05 ? 'bad' : 'faint'}>
                      {sat[i.id] > 0.3 ? 'Pleased' : sat[i.id] > 0.05 ? 'Content' : sat[i.id] > -0.05 ? 'Neutral' : sat[i.id] > -0.3 ? 'Uneasy' : 'Angry'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="panel panel-pad" style={{ alignSelf: 'start' }}>
          <div className="panel-head">
            <span className="h3">Blocs</span>
            <span className="label">Approval and how they vote</span>
          </div>
          {s.blocs.map((x) => (
            <div key={x.id} className={`bloc-row${x.id === sel ? ' on' : ''}`} onClick={() => setSel(x.id)} onMouseEnter={() => setHover(null)}>
              <div>
                <div className="n">{x.short}</div>
                <div className="stack" style={{ marginTop: 6 }}>
                  {ordered.map((p) => <i key={p.id} style={{ width: `${(x.shares[p.id] || 0) * 100}%`, background: p.color }} title={`${p.short} ${Math.round((x.shares[p.id] || 0) * 100)}%`} />)}
                </div>
              </div>
              <div className="s num">{Math.round(x.size * 100)}%</div>
              <div>
                <div className="spread small"><span className="faint">Approve</span><b className={`num ${x.approval >= 50 ? 'good' : x.approval < 35 ? 'bad' : ''}`}>{Math.round(x.approval)}%</b></div>
                <Meter value={x.approval} tone={x.approval >= 50 ? 'good' : x.approval < 35 ? 'bad' : ''} style={{ marginTop: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
