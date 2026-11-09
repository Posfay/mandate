import { fmtDate } from '../engine/util.js';
import { cfgOf } from '../engine/core.js';
import { IND_LABELS, BAD_UP } from '../engine/core.js';
import { Delta } from '../ui/bits.jsx';

const FMT = { growth: (v) => `${v.toFixed(1)}%`, unemp: (v) => `${v.toFixed(1)}%`, infl: (v) => `${v.toFixed(1)}%` };

export default function BriefingModal({ s, onClose, onOpenDecision }) {
  const b = s.lastBriefing;
  if (!b) return null;
  const c = cfgOf(s);
  const parties = s.parties.filter((p) => b.polls[p.id][1] >= 1.5).sort((x, y) => b.polls[y.id][1] - b.polls[x.id][1]);
  const max = Math.max(...parties.map((p) => b.polls[p.id][1]));
  const dA = b.approval[1] - b.approval[0];
  const blocMoves = s.blocs.map((x) => ({ ...x, d: b.blocs[x.id][1] - b.blocs[x.id][0] })).sort((x, y) => Math.abs(y.d) - Math.abs(x.d)).slice(0, 3);
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="brief-title" style={{ width: 'min(960px, 100%)' }}>
        <div className="modal-pad">
          <div className="spread" style={{ alignItems: 'flex-end', marginBottom: 18 }}>
            <div>
              <div className="label">Monthly briefing for the {c.title}</div>
              <h2 className="h1" id="brief-title">{fmtDate(b.turn)}</h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="label">Your approval</div>
              <div className="big-num" style={{ fontSize: 46, lineHeight: 1 }}>{Math.round(b.approval[1])}%</div>
              <Delta v={dA} />
            </div>
          </div>
          <div className="brief-grid">
            <div>
              <div className="h3" style={{ marginBottom: 8 }}>The polls</div>
              {parties.map((p) => {
                const [was, now] = b.polls[p.id];
                return (
                  <div key={p.id} className="result-bar" style={{ gridTemplateColumns: '100px 1fr 54px 52px' }}>
                    <span className="row" style={{ gap: 6 }}><i className="party-dot" style={{ background: p.color }} />{p.short}</span>
                    <div className="track"><i style={{ width: `${(now / max) * 100}%`, background: p.color }} /></div>
                    <span className="num" style={{ textAlign: 'right' }}>{now.toFixed(1)}%</span>
                    <span className="small"><Delta v={now - was} invert={!s.gov.includes(p.id)} /></span>
                  </div>
                );
              })}
              <div className="h3" style={{ margin: '18px 0 8px' }}>Biggest shifts</div>
              {blocMoves.map((x) => (
                <div key={x.id} className="delta-row">
                  <span>{x.name}</span>
                  <span className="num">{Math.round(x.approval)}%</span>
                  <Delta v={x.d} />
                </div>
              ))}
            </div>
            <div>
              <div className="h3" style={{ marginBottom: 8 }}>The numbers</div>
              {Object.entries(b.ind).map(([k, [was, now]]) => (
                <div key={k} className="delta-row">
                  <span>{IND_LABELS[k]}</span>
                  <span className="num">{FMT[k] ? FMT[k](now) : Math.round(now)}</span>
                  <Delta v={now - was} invert={BAD_UP.has(k)} d={FMT[k] ? 2 : 1} />
                </div>
              ))}
              <div className="delta-row"><span>Public debt</span><span className="num">{b.debt[1].toFixed(1)}%</span><Delta v={b.debt[1] - b.debt[0]} invert d={2} /></div>
              <div className="delta-row"><span>Political capital earned</span><span className="num">+{b.pcGain}</span><span /></div>
            </div>
          </div>
          {b.news.length > 0 && (
            <>
              <div className="h3" style={{ margin: '20px 0 4px' }}>Headlines</div>
              {b.news.map((n, i) => (
                <div key={i} className="headline">
                  {n.text}
                </div>
              ))}
            </>
          )}
          <div className="spread" style={{ marginTop: 22 }}>
            <span className="small dim">{s.inbox.length ? `${s.inbox.length} new decision${s.inbox.length > 1 ? 's are' : ' is'} waiting on your desk.` : 'Your desk is clear.'}</span>
            <div className="row">
              <button className="btn btn-ghost" onClick={onClose}>Close</button>
              {s.inbox.length > 0 && <button className="btn btn-primary" onClick={onOpenDecision}>Open the first decision</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
