import { useMemo } from 'react';
import { Meter } from '../ui/bits.jsx';
import { ISSUES } from '../data/blocs.js';
import { issueSat } from '../engine/core.js';
import { fmtDate } from '../engine/util.js';

export default function MediaView({ s, v, act }) {
  const sat = useMemo(() => issueSat(s), [v]);
  const issues = ISSUES.map((i) => ({ ...i, sal: s.sal[i.id], sat: sat[i.id] })).sort((a, b) => b.sal - a.sal);
  const max = issues[0].sal;
  const byMonth = [];
  for (const n of s.news) {
    let g = byMonth.find((x) => x.turn === n.turn);
    if (!g) byMonth.push((g = { turn: n.turn, items: [] }));
    g.items.push(n);
  }
  const tone = s.media.tone;
  return (
    <>
      <div className="view-head">
        <div>
          <div className="label">Voters judge you on what they are thinking about. You can change what that is.</div>
          <h1 className="h1">The conversation</h1>
        </div>
        <div className="row">
          <span className="chip">Media tone: <b className={tone > 0.1 ? 'good' : tone < -0.1 ? 'bad' : ''}>{tone > 0.35 ? 'Glowing' : tone > 0.1 ? 'Friendly' : tone > -0.1 ? 'Neutral' : tone > -0.35 ? 'Critical' : 'Hostile'}</b></span>
          <button className="btn btn-sm" disabled={s.agenda < 1} onClick={() => act({ type: 'agenda', action: 'press' }, 'Press conference held.')}>Hold a press conference</button>
        </div>
      </div>
      <div className="two-col wl">
        <div className="panel panel-pad">
          <div className="panel-head">
            <span className="h3">Share of the national conversation</span>
            <span className="label">Your record on each</span>
          </div>
          {issues.map((i) => (
            <div key={i.id} className="issue-row">
              <span>{i.name}</span>
              <Meter value={i.sal} max={max} />
              <span className={`small ${i.sat > 0.05 ? 'good' : i.sat < -0.05 ? 'bad' : 'faint'}`}>{i.sat > 0.3 ? 'Strong' : i.sat > 0.05 ? 'Good' : i.sat > -0.05 ? 'Mixed' : i.sat > -0.3 ? 'Weak' : 'Toxic'}</span>
              <button className="btn btn-sm" disabled={s.agenda < 1} onClick={() => act({ type: 'agenda', action: 'address', target: i.id }, `You put ${i.name.toLowerCase()} on the agenda.`)} title="Address the nation on this issue (1 agenda slot)">
                Talk about it
              </button>
            </div>
          ))}
          <p className="small faint" style={{ marginBottom: 0 }}>
            Steer the conversation toward issues where your record is strong. Crises, scandals and disasters will drag it elsewhere.
          </p>
        </div>
        <div className="panel panel-pad">
          <div className="panel-head">
            <span className="h3">The papers</span>
            <span className="label">{s.news.length} stories</span>
          </div>
          {byMonth.slice(0, 8).map((g) => (
            <div key={g.turn} style={{ marginBottom: 12 }}>
              <div className="label" style={{ marginBottom: 2 }}>{fmtDate(g.turn)}</div>
              {g.items.map((n, i) => (
                <div key={i} className="headline">
                  {n.text}
                  <small>
                    <span className="tone-mark" style={{ background: n.tone > 0 ? 'var(--good)' : n.tone < 0 ? 'var(--bad)' : 'var(--text-3)', marginRight: 6 }} />
                    {n.outlet}
                  </small>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
