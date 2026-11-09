import { useEffect, useMemo, useState } from 'react';
import { BudgetFlow } from '../ui/charts.jsx';
import { computeBudget, cfgOf } from '../engine/core.js';
import { budgetCost, budgetDelta } from '../engine/game.js';
import { SPEND_LINES, TAX_LINES } from '../data/policies.js';
import { money } from '../engine/util.js';

const SPEND_COLORS = ['#5EC3A0', '#6FA8DC', '#C9A35C', '#B85C5C', '#8E7CC3', '#5C7FA8', '#4FB3BF', '#7CB342', '#D4A5C9'];
const clone = (o) => JSON.parse(JSON.stringify(o));

export default function BudgetView({ s, v, openBill }) {
  const [draft, setDraft] = useState(() => clone(s.budget));
  const [base, setBase] = useState(() => JSON.stringify(s.budget));
  const live = JSON.stringify(s.budget);
  // events can change the budget behind your back; follow them unless you are mid-draft
  useEffect(() => {
    if (live !== base) {
      if (JSON.stringify(draft) === base) setDraft(clone(s.budget));
      setBase(live);
    }
  }, [live]);
  const dirty = JSON.stringify(draft) !== live;
  const cur = useMemo(() => computeBudget(s), [v]);
  const proj = useMemo(() => computeBudget(s, draft), [draft, v]);
  const cost = dirty ? budgetCost(s, draft) : 0;
  const delta = budgetDelta(s, draft);
  const notax = s.pledges.some((p) => p.id === 'notax' && p.status === 'active');
  const raises = TAX_LINES.some((t) => draft.tax[t.id] > s.budget.tax[t.id] + 0.001);

  const sources = [
    ...TAX_LINES.map((t, i) => ({ id: t.id, name: t.name.replace(', top rate', ''), v: proj.taxes[t.id], color: ['#C9A35C', '#E9CD8F', '#8A6D3B'][i] })),
    { id: 'other', name: 'Other revenue', v: proj.otherRev + proj.policyRev, color: '#6B7F99' },
  ];
  if (proj.deficit > 0) sources.push({ id: 'borrow', name: 'Borrowing', v: proj.deficit, color: '#E8656C' });
  const uses = [
    ...SPEND_LINES.map((l, i) => ({ id: l.id, name: l.name, v: draft.spend[l.id], color: SPEND_COLORS[i] })),
    { id: 'other', name: 'Administration & programmes', v: proj.otherSpend + proj.policyCost, color: '#6B7F99' },
    { id: 'interest', name: 'Debt interest', v: proj.interest, color: '#E8656C' },
  ].sort((a, b) => b.v - a.v);
  if (proj.deficit < 0) uses.push({ id: 'surplus', name: 'Surplus', v: -proj.deficit, color: '#5EC3A0' });

  const setTax = (id, val) => setDraft({ ...draft, tax: { ...draft.tax, [id]: val } });
  const setSpend = (id, val) => setDraft({ ...draft, spend: { ...draft.spend, [id]: val } });
  const c = cfgOf(s);
  const bn = (pct) => money((pct / 100) * s.econ.gdp);

  return (
    <>
      <div className="view-head">
        <div>
          <div className="label">All figures are shares of GDP ({money(s.econ.gdp)})</div>
          <h1 className="h1">The budget</h1>
        </div>
        <div className="row wrap">
          <span className="chip">Bond yield {s.econ.yield.toFixed(2)}%</span>
          <span className="chip">Policy rate {s.econ.rate.toFixed(2)}%</span>
          {s.econ.stress > 0.15 && <span className="chip bad">Markets nervous</span>}
        </div>
      </div>
      <div className="fiscal-sum" style={{ marginBottom: 18 }}>
        {[
          ['Revenue', proj.revenue, cur.revenue],
          ['Spending', proj.spending, cur.spending],
          [proj.deficit >= 0 ? 'Deficit' : 'Surplus', Math.abs(proj.deficit), Math.abs(cur.deficit), proj.deficit >= 0],
          ['Debt interest', proj.interest, cur.interest, true],
        ].map(([k, val, was, badUp]) => (
          <div key={k}>
            <span className="label">{k}</span>
            <div className="v">{val.toFixed(1)}%</div>
            <div className="small faint">{bn(val)} a year{dirty && Math.abs(val - was) > 0.01 && <span className={(val > was) === !!badUp ? ' bad' : ' good'}> ({val > was ? '+' : '−'}{Math.abs(val - was).toFixed(1)})</span>}</div>
          </div>
        ))}
      </div>
      <div className="panel panel-pad" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <span className="h3">Where the money comes from and goes</span>
          <span className="label">{dirty ? 'Showing your draft' : 'Current budget'}</span>
        </div>
        <BudgetFlow sources={sources} uses={uses} height={340} />
        <p className="small faint" style={{ marginBottom: 0 }}>
          Public debt stands at {Math.round(s.econ.debt)}% of GDP. Borrowing more than markets expect raises yields; a sharp rise can turn into a crisis that forces your hand.
        </p>
      </div>
      <div className="bud-grid">
        <div className="panel panel-pad">
          <div className="panel-head">
            <span className="h3">Spending</span>
            <span className="label">Share of GDP, cash per year</span>
          </div>
          {SPEND_LINES.map((l) => {
            const st = s.start.budget.spend[l.id];
            const max = Math.max(1, Math.ceil(Math.max(st * 2.2, st + 4)));
            return (
              <div key={l.id} className="slider-row">
                <span>{l.name}</span>
                <input type="range" min={0} max={max} step={0.1} value={draft.spend[l.id]} onChange={(e) => setSpend(l.id, Number(e.target.value))} aria-label={l.name} />
                <span className="v">{draft.spend[l.id].toFixed(1)}%<small className="faint">{bn(draft.spend[l.id])}</small></span>
              </div>
            );
          })}
        </div>
        <div className="panel panel-pad">
          <div className="panel-head">
            <span className="h3">Taxes</span>
            <button className="btn btn-ghost btn-sm" disabled={!dirty} onClick={() => setDraft(clone(s.budget))}>Reset draft</button>
          </div>
          {TAX_LINES.map((t) => (
            <div key={t.id} className="slider-row">
              <span>{t.name}</span>
              <input type="range" min={t.min} max={t.max} step={0.5} value={draft.tax[t.id]} onChange={(e) => setTax(t.id, Number(e.target.value))} aria-label={t.name} />
              <span className="v">{draft.tax[t.id].toFixed(1)}%<small className="faint">{(proj.taxes[t.id]).toFixed(1)}% GDP</small></span>
            </div>
          ))}
          <p className="small faint">Each point on income tax raises about {s.econ.yields.income.toFixed(2)}% of GDP; on sales tax about {s.econ.yields.vat.toFixed(2)}%.</p>
          <hr className="rule" />
          {raises && notax && <p className="small bad" style={{ marginTop: 0 }}>Raising any rate breaks your no-new-taxes pledge.</p>}
          <div className="spread">
            <div className="small dim">
              {dirty ? (
                <>
                  Net change: spending {delta.spendTotal >= 0 ? '+' : '−'}{Math.abs(delta.spendTotal).toFixed(1)}, revenue {delta.revTotal >= 0 ? '+' : '−'}{Math.abs(delta.revTotal).toFixed(1)} points of GDP
                </>
              ) : (
                'Move a slider to draft changes.'
              )}
            </div>
            <button className="btn btn-primary" disabled={!dirty || s.billsThisMonth.__budget} onClick={() => openBill({ kind: 'budget', draft, onDone: () => {} })}>
              {s.billsThisMonth.__budget ? 'Voted on this month' : `Present to ${c.legislature} (${cost})`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
