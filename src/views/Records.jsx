import { LineChart } from '../ui/charts.jsx';
import { ACHIEVEMENTS } from '../data/meta.js';
import { fmtDate } from '../engine/util.js';

export default function RecordsView({ s }) {
  const h = s.history;
  const shown = s.parties.filter((p) => Math.max(...(h.polls[p.id] || [0])) >= 4);
  return (
    <>
      <div className="view-head">
        <div>
          <div className="label">Everything you did, and what it did</div>
          <h1 className="h1">The record</h1>
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))' }}>
        <div className="panel panel-pad">
          <div className="panel-head"><span className="h3">Voting intention</span><span className="label">% of decided voters</span></div>
          <LineChart turns={h.turns} series={shown.map((p) => ({ name: p.id, label: p.short, color: p.color, data: h.polls[p.id], width: s.gov.includes(p.id) ? 2.6 : 1.6, dim: !s.gov.includes(p.id) && p.id !== shown[0]?.id }))} yFormat={(x) => `${x.toFixed(0)}%`} />
        </div>
        <div className="panel panel-pad">
          <div className="panel-head"><span className="h3">Approval and trust</span></div>
          <LineChart turns={h.turns} refLine={50} series={[{ name: 'approval', label: 'Approval', color: 'var(--brass)', data: h.approval }, { name: 'trust', label: 'Trust', color: '#7FB5E8', data: h.trust }]} />
        </div>
        <div className="panel panel-pad">
          <div className="panel-head"><span className="h3">The economy</span><span className="label">Annual %</span></div>
          <LineChart turns={h.turns} series={[{ name: 'growth', label: 'Growth', color: '#5EC3A0', data: h.growth }, { name: 'unemp', label: 'Jobless', color: '#E7B34E', data: h.unemp }, { name: 'infl', label: 'Inflation', color: '#E8656C', data: h.infl }]} yFormat={(x) => x.toFixed(1)} />
        </div>
        <div className="panel panel-pad">
          <div className="panel-head"><span className="h3">Public finances</span><span className="label">% of GDP</span></div>
          <LineChart turns={h.turns} series={[{ name: 'debt', label: 'Debt', color: '#C9A35C', data: h.debt }]} yFormat={(x) => x.toFixed(0)} height={150} />
          <LineChart turns={h.turns} refLine={0} series={[{ name: 'deficit', label: 'Deficit', color: '#E8656C', data: h.deficit }]} yFormat={(x) => x.toFixed(1)} height={120} />
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', marginTop: 16 }}>
        <div className="panel panel-pad">
          <div className="panel-head"><span className="h3">Decisions</span><span className="label">{s.decisions.length} taken</span></div>
          {s.decisions.length === 0 && <p className="small faint">Your first decisions are waiting in the tray.</p>}
          {s.decisions.slice(0, 14).map((d, i) => (
            <div key={i} style={{ padding: '7px 0', borderBottom: '1px solid var(--hair-soft)' }}>
              <div className="small faint">{fmtDate(d.turn)}</div>
              <b className="serif" style={{ fontSize: 15 }}>{d.title}</b>
              <div className="small dim">{d.choice}</div>
            </div>
          ))}
        </div>
        <div className="panel panel-pad">
          <div className="panel-head"><span className="h3">Achievements</span><span className="label">{s.achievements.length} of {ACHIEVEMENTS.length}</span></div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {ACHIEVEMENTS.map((a) => {
              const got = s.achievements.includes(a.id);
              return (
                <div key={a.id} className="card" style={{ padding: 10, opacity: got ? 1 : 0.45, borderColor: got ? 'var(--hair-strong)' : undefined }}>
                  <b style={{ fontSize: 13, color: got ? 'var(--brass-hi)' : undefined }}>{a.name}</b>
                  <div className="small faint">{a.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
