import { useCallback, useMemo, useState } from 'react';
import Swarm, { withRgb } from '../ui/Swarm.jsx';
import { Sparkline } from '../ui/charts.jsx';
import { Meter, Icon } from '../ui/bits.jsx';
import { cfgOf, playerParty, govSeats, majorityOf } from '../engine/core.js';
import { fmtDate, monthsLabel } from '../engine/util.js';
import { ISSUES } from '../data/blocs.js';
import { PLEDGE_MAP } from '../data/meta.js';

const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];

export default function Overview({ s, v, setView }) {
  const [mode, setMode] = useState('party');
  const [hover, setHover] = useState(null);
  const onHover = useCallback((id, x, y) => setHover(id ? { id, x, y } : null), []);
  const parties = useMemo(() => withRgb(s.parties), [s.countryId]);
  const c = cfgOf(s);
  const me = playerParty(s);
  const h = s.history;
  const last = (arr, k = 2) => arr[arr.length - k];
  const termMonth = s.turn - s.termStart + 1;
  const campaign = s.nextElection - s.turn <= 4;

  const instruments = [
    { k: 'Approval', sub: 'all citizens', v: `${Math.round(s.approval)}%`, d: s.approval - (last(h.approval) ?? s.approval), data: h.approval },
    { k: 'Growth', sub: 'annualised', v: `${s.ind.growth.toFixed(1)}%`, d: s.ind.growth - (last(h.growth) ?? s.ind.growth), data: h.growth },
    { k: 'Unemployment', v: `${s.ind.unemp.toFixed(1)}%`, d: s.ind.unemp - (last(h.unemp) ?? s.ind.unemp), data: h.unemp, inv: true },
    { k: 'Inflation', v: `${s.ind.infl.toFixed(1)}%`, d: s.ind.infl - (last(h.infl) ?? s.ind.infl), data: h.infl, inv: true },
    { k: s.econ.deficit >= 0 ? 'Deficit' : 'Surplus', sub: '% of GDP', v: `${Math.abs(s.econ.deficit).toFixed(1)}%`, d: s.econ.deficit - (last(h.deficit) ?? s.econ.deficit), data: h.deficit, inv: true },
    { k: 'Public debt', sub: '% of GDP', v: `${Math.round(s.econ.debt)}%`, d: s.econ.debt - (last(h.debt) ?? s.econ.debt), data: h.debt, inv: true },
    { k: 'Trust', sub: 'in your word', v: `${Math.round(s.trust)}`, d: s.trust - (last(h.trust) ?? s.trust), data: h.trust },
  ];

  const sal = ISSUES.map((i) => ({ ...i, v: s.sal[i.id] })).sort((a, b) => b.v - a.v).slice(0, 7);
  const salMax = sal[0].v;
  const hb = hover && s.blocs.find((b) => b.id === hover.id);

  return (
    <>
      <div className="view-head">
        <div>
          <div className="label">Month {termMonth} of your {ORD[s.term - 1] || `${s.term}th`} term</div>
          <h1 className="h1">{fmtDate(s.turn)}</h1>
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          {campaign && <span className="chip" style={{ color: 'var(--brass-hi)', borderColor: 'var(--hair-strong)' }}>Campaign season</span>}
          <span className="chip">Election in {monthsLabel(s.nextElection - s.turn)}</span>
          <span className="chip">Government: {govSeats(s)} of {c.seats} seats, majority {majorityOf(s)}</span>
        </div>
      </div>

      <div className="ov-grid">
        <div className="col" style={{ gap: 18 }}>
          <div className="panel swarm-wrap" style={{ height: 'min(56vh, 560px)' }}>
            <Swarm blocs={s.blocs} parties={parties} polls={s.polls} govIds={s.gov} mode={mode} stamp={v} onHoverBloc={onHover} />
            <div className="swarm-title">
              <div className="h3">The electorate</div>
              <div className="small faint">{mode === 'party' ? 'Each dot is a slice of voters, pulled toward the party they back today' : 'Brass dots approve of your government'}</div>
            </div>
            <div className="swarm-controls seg">
              <button className={mode === 'party' ? 'on' : ''} onClick={() => setMode('party')}>Voting intention</button>
              <button className={mode === 'approval' ? 'on' : ''} onClick={() => setMode('approval')}>Approval</button>
            </div>
            <div className="swarm-legend">
              {s.parties.filter((p) => s.polls[p.id] >= 1).sort((a, b) => s.polls[b.id] - s.polls[a.id]).map((p) => (
                <span key={p.id}>
                  <i className="party-dot" style={{ background: p.color }} /> {p.short} <b>{s.polls[p.id].toFixed(1)}%</b>
                </span>
              ))}
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <div className="panel panel-pad">
              <div className="panel-head">
                <span className="h3">What the country is talking about</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setView('media')}>Shape it</button>
              </div>
              {sal.map((i) => (
                <div key={i.id} className="conv-bar">
                  <span>{i.name}</span>
                  <Meter value={i.v} max={salMax} />
                  <span className="num faint" style={{ textAlign: 'right' }}>{Math.round(i.v * 100)}%</span>
                </div>
              ))}
            </div>
            <div className="panel panel-pad">
              <div className="panel-head">
                <span className="h3">Your pledges</span>
                <span className="label">Judged at the election</span>
              </div>
              {s.pledges.length === 0 && <p className="small faint">You made no promises. Voters noticed.</p>}
              {s.pledges.map((p) => {
                const def = PLEDGE_MAP[p.id];
                return (
                  <div key={p.id} className="pledge">
                    <div className="spread">
                      <b style={{ fontSize: 13.5 }}>{def.name}</b>
                      <span className={`status ${p.status}`}>{p.status === 'active' ? p.label : p.status}</span>
                    </div>
                    <div className="small faint" style={{ marginBottom: 6 }}>{def.desc(s, p.target)}</div>
                    <Meter value={(p.progress ?? 0) * 100} tone={p.status === 'broken' ? 'bad' : p.progress >= 1 ? 'good' : ''} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="col" style={{ gap: 18 }}>
          <div className="panel panel-pad">
            <div className="panel-head">
              <span className="h3">Vital signs</span>
              <span className="label">Change on last month</span>
            </div>
            <div className="instruments">
              {instruments.map((it) => {
                const good = it.inv ? it.d < 0 : it.d > 0;
                return (
                  <div key={it.k} className="instrument">
                    <span className="k">{it.k}{it.sub && <small>{it.sub}</small>}</span>
                    <span className="v">
                      {it.v}
                      <span className={`d ${Math.abs(it.d) < 0.05 ? 'faint' : good ? 'good' : 'bad'}`}>{Math.abs(it.d) < 0.05 ? 'steady' : `${it.d > 0 ? '▲' : '▼'} ${Math.abs(it.d).toFixed(1)}`}</span>
                    </span>
                    <Sparkline data={it.data} color={good || Math.abs(it.d) < 0.05 ? 'var(--brass)' : 'var(--bad)'} />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="panel panel-pad">
            <div className="panel-head">
              <span className="h3">Your party</span>
              <span className="label">{me.name}</span>
            </div>
            <div className="spread small" style={{ marginBottom: 6 }}><span className="dim">Party unity</span><span className="num">{Math.round(s.unity)}</span></div>
            <Meter value={s.unity} tone={s.unity < 40 ? 'bad' : ''} />
            {s.gov.slice(1).map((id) => {
              const p = s.parties.find((x) => x.id === id);
              return (
                <div key={id} style={{ marginTop: 12 }}>
                  <div className="spread small" style={{ marginBottom: 6 }}>
                    <span className="dim"><i className="party-dot" style={{ background: p.color, marginRight: 6 }} />{p.short} satisfaction</span>
                    <span className="num">{Math.round(p.sat)}</span>
                  </div>
                  <Meter value={p.sat} tone={p.sat < 30 ? 'bad' : ''} />
                </div>
              );
            })}
            <div className="small faint" style={{ marginTop: 12 }}>
              {s.unity < 40 ? 'Backbenchers are restless. Expect rebellions on contested votes.' : s.gov.length > 1 ? 'Keep partners satisfied or they will walk.' : 'Your party is behind you, for now.'}
            </div>
          </div>
        </div>
      </div>

      {hb && (
        <div className="tooltip" style={{ left: hover.x + 16, top: hover.y + 12 }}>
          <b className="serif" style={{ fontSize: 16 }}>{hb.name}</b>
          <div className="faint small">{Math.round(hb.size * 100)}% of the population, turnout {Math.round(hb.turnout * 100)}%</div>
          <div style={{ marginTop: 6 }}>Approve of you: <b className={hb.approval >= 50 ? 'good' : 'bad'}>{Math.round(hb.approval)}%</b></div>
          <div className="small dim" style={{ marginTop: 4 }}>
            Backs: {Object.entries(hb.shares).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, sh]) => `${s.parties.find((p) => p.id === id)?.short} ${Math.round(sh * 100)}%`).join(', ')}
          </div>
        </div>
      )}
    </>
  );
}
