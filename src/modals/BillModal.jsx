import { useMemo, useState } from 'react';
import { store } from '../store.js';
import Hemicycle from '../ui/Hemicycle.jsx';
import { cfgOf } from '../engine/core.js';
import { whipCount } from '../engine/core.js';
import { billCost, budgetCost, lobbyCost, makeBill } from '../engine/game.js';
import { POLICY_MAP } from '../data/policies.js';
import { Icon } from '../ui/bits.jsx';

const lean = (y) =>
  y >= 0.85 ? ['Firmly for', 'var(--good)', 'var(--good-dim)'] : y >= 0.6 ? ['Leaning for', 'var(--good)', 'transparent'] : y >= 0.4 ? ['Undecided', 'var(--warn)', 'transparent'] : y >= 0.15 ? ['Leaning against', 'var(--bad)', 'transparent'] : ['Firmly against', 'var(--bad)', 'var(--bad-dim)'];

export default function BillModal({ s, draft, onClose, notify }) {
  const [lobby, setLobby] = useState({});
  const [result, setResult] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [fromLevel] = useState(() => (draft.kind === 'policy' ? s.policies[draft.policy] : null));
  const c = cfgOf(s);
  const bill = useMemo(() => makeBill(s, { ...draft, lobby }), [lobby, result]);
  const whip = useMemo(() => whipCount(s, bill), [bill]);
  const base = draft.kind === 'policy' ? billCost(s, draft.policy, draft.to) : budgetCost(s, draft.draft);
  const lobbyTotal = Object.entries(lobby).reduce((a, [pid, n]) => a + n * lobbyCost(s, pid), 0);
  const total = base + lobbyTotal;
  const pol = draft.kind === 'policy' ? POLICY_MAP[draft.policy] : null;
  const title = pol ? `${pol.name} bill` : 'The budget';
  const ordered = [...s.parties].filter((p) => (s.seats[p.id] || 0) > 0).sort((a, b) => a.econ - b.econ);
  const hemi = ordered.map((p) => ({ id: p.id, color: p.color, seats: s.seats[p.id] }));
  const expected = Object.fromEntries(whip.rows.map((r) => [r.id, r.yesFrac]));
  const margin = whip.expYes - whip.need;
  const verdict = margin > whip.total * 0.04 ? ['Likely to pass', 'good'] : margin > -whip.total * 0.03 ? ['Too close to call', 'warn'] : ['Likely to fail', 'bad'];

  const call = () => {
    const r = store.dispatch({ type: 'bill', draft: { ...draft, lobby } });
    if (r.ok === false) {
      notify(r.error, 'bad');
      return;
    }
    setResult(r.result);
  };
  const close = () => {
    if (result) {
      store.dispatch({ type: 'ackVote' });
      if (result.passed) draft.onDone?.();
    }
    onClose();
  };

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && !result && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="bill-title" style={{ width: 'min(920px, 100%)' }}>
        <div className="modal-pad">
          <div className="spread" style={{ alignItems: 'flex-start' }}>
            <div>
              <div className="label">{c.legislature}, {pol?.constitutional ? 'two-thirds majority required' : 'simple majority required'}</div>
              <h2 className="h1" id="bill-title" style={{ fontSize: 36 }}>{title}</h2>
              {pol && (
                <div className="dim" style={{ marginTop: 4 }}>
                  {pol.options[fromLevel].label} <span className="faint">becomes</span> <b style={{ color: 'var(--brass-hi)' }}>{pol.options[draft.to].label}</b>
                </div>
              )}
            </div>
            <button className="btn btn-ghost" onClick={close} aria-label="Close"><Icon name="close" /></button>
          </div>

          <div className="two-col wr" style={{ marginTop: 18, gap: 22 }}>
            <div>
              <Hemicycle parties={hemi} total={c.seats} expected={result ? null : expected} result={result} onDone={() => setRevealed(true)} centerLabel={result ? (revealed ? `${result.yes}–${result.no}` : '…') : `${Math.round(whip.expYes)}`} centerSub={result ? 'ayes to noes' : `expected ayes, ${whip.need} needed`} />
              {!result && <div className={`small ${verdict[1]}`} style={{ textAlign: 'center', marginTop: 6 }}>{verdict[0]}</div>}
              {result && revealed && (
                <div className={`vote-banner ${result.passed ? 'pass' : 'fail'}`}>
                  <div className="h2">{result.passed ? 'The ayes have it' : 'The noes have it'}</div>
                  <div className="small dim">{result.passed ? `${title} passes, ${result.yes} to ${result.no}.` : `Your government is defeated, ${result.yes} to ${result.no}. The capital is spent.`}</div>
                </div>
              )}
            </div>
            <div>
              <div className="whip-row label" style={{ paddingTop: 0 }}>
                <span>Party</span><span>Seats</span><span>Whip count</span><span>Ayes</span><span>Lobby</span>
              </div>
              {whip.rows.slice().sort((a, b) => b.seats - a.seats).map((r) => {
                const p = s.parties.find((x) => x.id === r.id);
                const [lab, col, bg] = lean(r.yesFrac);
                const voted = result?.byParty?.[r.id];
                const lc = lobbyCost(s, r.id);
                const n = lobby[r.id] || 0;
                return (
                  <div key={r.id} className="whip-row">
                    <span className="row" style={{ gap: 8 }}><i className="party-dot" style={{ background: p.color }} />{p.short}{s.gov.includes(p.id) && <span className="faint small">gov</span>}</span>
                    <span className="num">{r.seats}</span>
                    <span className="lean" style={{ color: col, background: bg, border: `1px solid ${col}` }}>{lab}</span>
                    <span className="num">{voted ? <b>{voted.yes}</b> : `~${Math.round(r.expYes)}`}</span>
                    <span>
                      {!result && (
                        <button className="btn btn-sm" disabled={n >= 3 || s.pc < total + lc} onClick={() => setLobby({ ...lobby, [r.id]: n + 1 })} title={`Spend ${lc} capital to win votes in ${p.short}`}>
                          +{lc}{n > 0 && <span className="faint"> ×{n}</span>}
                        </button>
                      )}
                    </span>
                  </div>
                );
              })}
              {!result && (
                <div className="spread" style={{ marginTop: 18 }}>
                  <div className="small dim">
                    Cost <b className="num" style={{ color: 'var(--text)' }}>{total}</b> of your {Math.round(s.pc)} capital
                    {lobbyTotal > 0 && <span className="faint"> (includes {lobbyTotal} lobbying)</span>}
                  </div>
                  <div className="row">
                    <button className="btn btn-ghost" onClick={onClose}>Withdraw</button>
                    <button className="btn btn-primary" disabled={s.pc < total} onClick={call}>Call the vote</button>
                  </div>
                </div>
              )}
              {result && revealed && (
                <div style={{ textAlign: 'right', marginTop: 18 }}>
                  <button className="btn btn-primary" onClick={close}>Continue</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
