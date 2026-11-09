import { useMemo, useState } from 'react';
import { POLICIES, POLICY_CATEGORIES, POLICY_MAP } from '../data/policies.js';
import { BLOC_MAP } from '../data/blocs.js';
import { EffectChips } from '../ui/bits.jsx';
import { IND_LABELS, BAD_UP, whipCount, cfgOf } from '../engine/core.js';
import { billCost, canDecree, makeBill } from '../engine/game.js';
import { dist, fmtDate } from '../engine/util.js';
import { PLEDGE_MAP } from '../data/meta.js';

const SCALE = { growth: [0.1, 0.25], unemp: [0.15, 0.4], infl: [0.15, 0.4], gini: [0.6, 1.5], emis: [3, 8], cost: [0.2, 0.8], rev: [0.1, 0.4] };

export function policyChips(s, pol, from, to) {
  const a = pol.options[from];
  const b = pol.options[to];
  const chips = [];
  const keys = new Set([...Object.keys(a.fx), ...Object.keys(b.fx)]);
  for (const k of keys) {
    const d = (b.fx[k] || 0) - (a.fx[k] || 0);
    if (Math.abs(d) < 0.01) continue;
    const sc = SCALE[k] || [2, 5];
    const str = Math.abs(d) < sc[0] ? 1 : Math.abs(d) < sc[1] ? 2 : 3;
    if (k === 'cost') chips.push({ label: `Spending ${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(1)}% GDP`, dir: Math.sign(d), good: d < 0 ? true : null, strength: 0 });
    else if (k === 'rev') chips.push({ label: `Revenue ${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(2)}% GDP`, dir: Math.sign(d), good: d > 0 ? true : null, strength: 0 });
    else chips.push({ label: IND_LABELS[k] || k, dir: Math.sign(d), good: BAD_UP.has(k) ? d < 0 : d > 0, strength: str });
  }
  const blocs = [];
  for (const bl of s.blocs) {
    const v = (b.blocs?.[bl.id] || 0) - (a.blocs?.[bl.id] || 0) + 2.5 * (dist(bl.econ, bl.social, a.pos[0], a.pos[1]) - dist(bl.econ, bl.social, b.pos[0], b.pos[1]));
    if (Math.abs(v) >= 1.5) blocs.push({ label: BLOC_MAP[bl.id].short, dir: Math.sign(v), good: v > 0, strength: Math.abs(v) < 3.5 ? 1 : Math.abs(v) < 7 ? 2 : 3, v });
  }
  blocs.sort((x, y) => Math.abs(y.v) - Math.abs(x.v));
  return { chips, blocs };
}

export default function PolicyView({ s, v, act, openBill }) {
  const [cat, setCat] = useState('economy');
  const [sel, setSel] = useState({});
  const list = POLICIES.filter((p) => p.cat === cat);
  const changed = (catId) => POLICIES.filter((p) => p.cat === catId && s.policies[p.id] !== s.start.policies[p.id]).length;
  const notax = s.pledges.some((p) => p.id === 'notax' && p.status === 'active');

  return (
    <>
      <div className="view-head">
        <div>
          <div className="label">Pick a new position, then win the vote in the {cfgOf(s).legislature}</div>
          <h1 className="h1">Policy</h1>
        </div>
        <span className="chip">{s.stats.billsPassed} passed, {s.stats.billsFailed} defeated</span>
      </div>
      <div className="pol-layout">
        <div className="cat-list" role="tablist">
          {POLICY_CATEGORIES.map((c) => (
            <button key={c.id} className={c.id === cat ? 'on' : ''} onClick={() => setCat(c.id)} role="tab" aria-selected={c.id === cat}>
              <span>{c.name}</span>
              {changed(c.id) > 0 && <span className="faint num">{changed(c.id)}</span>}
            </button>
          ))}
        </div>
        <div>
          {cat === 'institutions' && (
            <div className="card" style={{ marginBottom: 12, borderColor: 'rgba(232,101,108,0.3)' }}>
              <b>The path of power.</b>{' '}
              <span className="dim small">These levers make governing easier — more capital each month, fewer courts in your way — and they hollow out the democracy that gave you the job. Allies will notice. So will history.</span>
            </div>
          )}
          {list.map((pol) => (
            <PolicyCard key={pol.id} s={s} v={v} pol={pol} sel={sel[pol.id]} setSel={(i) => setSel({ ...sel, [pol.id]: i })} act={act} openBill={openBill} notax={notax} />
          ))}
        </div>
      </div>
    </>
  );
}

function PolicyCard({ s, v, pol, sel, setSel, act, openBill, notax }) {
  const cur = s.policies[pol.id];
  const target = sel != null && sel !== cur ? sel : null;
  const info = useMemo(() => (target != null ? policyChips(s, pol, cur, target) : null), [target, cur, v]);
  const whip = useMemo(() => (target != null ? whipCount(s, makeBill(s, { kind: 'policy', policy: pol.id, to: target })) : null), [target, cur, v]);
  const cost = target != null ? billCost(s, pol.id, target) : 0;
  const decree = target != null && canDecree(s, pol.id);
  const done = s.billsThisMonth[pol.id];
  const last = s.policyLog.find((x) => x.id === pol.id);
  const verdict = whip ? (whip.expYes >= whip.need + whip.total * 0.04 ? ['Likely to pass', 'good'] : whip.expYes >= whip.need - whip.total * 0.03 ? ['Too close to call', 'warn'] : ['Likely to fail', 'bad']) : null;
  const breaksPledge = notax && pol.tax && target != null && target > cur;
  return (
    <div className="panel policy">
      <div className="head">
        <div>
          <div className="h3">{pol.name}</div>
          <div className="small dim" style={{ maxWidth: '70ch', marginTop: 2 }}>{pol.desc}</div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {pol.constitutional && <span className="chip" title="Needs a two-thirds majority">Two-thirds vote</span>}
          {pol.exec && (s.system !== 'parliamentary') && <span className="chip" title="Can be changed by executive order">Decree possible</span>}
        </div>
      </div>
      <div className="ladder" role="radiogroup" aria-label={pol.name}>
        {pol.options.map((o, i) => (
          <button key={i} className={`${i === cur ? 'cur' : ''}${i === target ? ' sel' : ''}`} onClick={() => setSel(i === cur ? null : i)} role="radio" aria-checked={i === (target ?? cur)}>
            {o.label}
          </button>
        ))}
      </div>
      {last && target == null && <div className="small faint" style={{ marginTop: 8 }}>Changed {fmtDate(last.turn)} by {last.via === 'law' ? 'vote' : last.via}.</div>}
      {target != null && (
        <div className="proposal">
          <div className="col" style={{ gap: 8 }}>
            <div>
              <div className="label" style={{ marginBottom: 5 }}>Long-run effects</div>
              {info.chips.length ? <EffectChips items={info.chips} /> : <span className="small faint">Mostly symbolic.</span>}
            </div>
            {info.blocs.length > 0 && (
              <div>
                <div className="label" style={{ marginBottom: 5 }}>Voter reaction</div>
                <EffectChips items={info.blocs} max={7} />
              </div>
            )}
            {breaksPledge && <div className="small bad">This breaks your pledge of no new taxes.</div>}
          </div>
          <div className="col" style={{ alignItems: 'flex-end', gap: 8 }}>
            <span className={`small ${verdict[1]}`}>{verdict[0]}: about {Math.round(whip.expYes)} of {whip.need} needed</span>
            <div className="row">
              {decree && (
                <button className="btn" disabled={done || s.pc < Math.round(cost * 1.3)} onClick={() => { if (confirm(`Sign an executive order changing ${pol.name.toLowerCase()} for ${Math.round(cost * 1.3)} political capital? Courts may strike it down.`)) { act({ type: 'decree', policy: pol.id, to: target }, 'Executive order signed.'); setSel(null); } }}>
                  Decree ({Math.round(cost * 1.3)})
                </button>
              )}
              <button className="btn btn-primary" disabled={done} onClick={() => openBill({ kind: 'policy', policy: pol.id, to: target, onDone: () => setSel(null) })}>
                {done ? 'Voted on this month' : `Draft the bill (${cost})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
