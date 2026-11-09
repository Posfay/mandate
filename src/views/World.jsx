import { useMemo, useState } from 'react';
import Globe from '../ui/Globe.jsx';
import { Flag, Meter } from '../ui/bits.jsx';
import { ACTORS, ACTOR_MAP, ACTOR_BY_NUM } from '../data/world.js';
import { DIPLO_ACTIONS, diploAvailable } from '../engine/game.js';
import { leaderOf } from '../engine/effects.js';
import { money } from '../engine/util.js';

const REGIME = { dem: 'Democracy', hybrid: 'Hybrid regime', auto: 'Autocracy' };
const lerp = (a, b, t) => a + (b - a) * t;
function relColor(r) {
  // red (hostile) → slate (neutral) → green (friendly)
  const t = (r + 100) / 200;
  const A = [201, 80, 90];
  const M = [74, 91, 115];
  const B = [77, 181, 146];
  const [x, y, k] = t < 0.5 ? [A, M, t * 2] : [M, B, (t - 0.5) * 2];
  return `rgb(${Math.round(lerp(x[0], y[0], k))},${Math.round(lerp(x[1], y[1], k))},${Math.round(lerp(x[2], y[2], k))})`;
}

export default function WorldView({ s, act }) {
  const [sel, setSel] = useState(() => (s.countryId === 'USA' ? 'CHN' : 'USA'));
  const me = ACTOR_MAP[s.countryId];
  const a = ACTOR_MAP[sel];
  const rel = s.world.rel[sel];
  const deal = s.world.deals[sel] || {};
  const g = s.world.globals;

  const colorFor = (num) => {
    const actor = ACTOR_BY_NUM[num];
    if (!actor) return '#1C365A';
    if (actor.id === s.countryId) return '#8C7444';
    return relColor(s.world.rel[actor.id] ?? 0);
  };
  const arcs = useMemo(
    () => Object.entries(s.world.deals).flatMap(([id, d]) => {
      const out = [];
      if (d.trade) out.push({ from: me.capital, to: ACTOR_MAP[id].capital, color: 'rgba(233,205,143,0.9)' });
      if (d.pact) out.push({ from: me.capital, to: ACTOR_MAP[id].capital, color: 'rgba(110,190,255,0.9)' });
      if (d.sanction) out.push({ from: me.capital, to: ACTOR_MAP[id].capital, color: 'rgba(232,101,108,0.9)' });
      return out;
    }),
    [JSON.stringify(s.world.deals)],
  );
  const friends = ACTORS.filter((x) => x.id !== s.countryId).sort((x, y) => s.world.rel[y.id] - s.world.rel[x.id]);

  return (
    <>
      <div className="view-head">
        <div>
          <div className="label">Relations shape trade, security and how much the world’s shocks hurt you</div>
          <h1 className="h1">The world</h1>
        </div>
        <span className="chip">Prestige {Math.round(s.ind.prestige)}</span>
      </div>
      <div className="world-grid">
        <div className="panel globe-box">
          <Globe
            colorFor={colorFor}
            selected={a.num}
            focus={a.capital}
            label={a.name}
            arcs={arcs}
            markers={[{ coords: me.capital, active: true }, ...Object.keys(s.world.deals).map((id) => ({ coords: ACTOR_MAP[id].capital, color: '#E9CD8F' }))]}
            isPickable={(num) => !!ACTOR_BY_NUM[num] && ACTOR_BY_NUM[num].id !== s.countryId}
            onPick={(num) => ACTOR_BY_NUM[num] && ACTOR_BY_NUM[num].id !== s.countryId && setSel(ACTOR_BY_NUM[num].id)}
            initialRotation={[-a.capital[0], -a.capital[1] + 12, 0]}
          />
          <div className="globe-legend">
            <span>Hostile</span>
            <span className="ramp" />
            <span>Friendly</span>
            <span style={{ marginLeft: 10 }}>Drag to turn, scroll to zoom</span>
          </div>
        </div>
        <div className="col" style={{ gap: 14 }}>
          <div className="panel panel-pad">
            <div className="row" style={{ gap: 12, marginBottom: 12 }}>
              <Flag iso2={a.iso2} lg title={a.name} />
              <div>
                <div className="h2">{a.name}</div>
                <div className="small faint">{a.ltitle}: {leaderOf(s, a.id)}</div>
              </div>
            </div>
            <div className="row wrap" style={{ gap: 5, marginBottom: 12 }}>
              <span className="chip">{REGIME[a.regime]}</span>
              {a.blocs.map((b) => <span key={b} className="chip">{b}</span>)}
              {deal.trade && <span className="chip good">Trade deal</span>}
              {deal.pact && <span className="chip good">Defence pact</span>}
              {deal.sanction && <span className="chip bad">Under your sanctions</span>}
            </div>
            <div className="spread small" style={{ marginBottom: 6 }}>
              <span className="dim">Relations</span>
              <b className="num" style={{ color: relColor(rel) }}>{rel > 0 ? '+' : ''}{Math.round(rel)}</b>
            </div>
            <div className="meter"><i style={{ width: `${(rel + 100) / 2}%`, background: relColor(rel) }} /></div>
            <div className="stats-grid" style={{ marginTop: 14, gridTemplateColumns: '1fr 1fr' }}>
              <div><span className="label">Economy</span><div className="v">{money(a.gdp)}</div></div>
              <div><span className="label">Population</span><div className="v">{a.pop >= 100 ? Math.round(a.pop) : a.pop}m</div></div>
            </div>
            <div className="col" style={{ gap: 6, marginTop: 14 }}>
              {DIPLO_ACTIONS.map((d) => {
                const why = diploAvailable(s, d.id, sel);
                if (d.id === 'lift' && !deal.sanction) return null;
                if (d.id === 'sanction' && deal.sanction) return null;
                return (
                  <button key={d.id} className="choice-card" style={{ padding: '9px 12px' }} disabled={!!why} onClick={() => act({ type: 'diplomacy', action: d.id, target: sel }, `${d.name}: ${a.name}`)}>
                    <div className="spread">
                      <b style={{ fontSize: 13.5 }}>{d.name}</b>
                      <span className="small faint">{d.cost.pc ? `${d.cost.pc} capital` : '1 agenda slot'}</span>
                    </div>
                    <div className="small faint">{why || d.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="panel panel-pad">
            <div className="panel-head"><span className="h3">Closest friends</span></div>
            {friends.slice(0, 5).map((x) => (
              <button key={x.id} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'space-between' }} onClick={() => setSel(x.id)}>
                <span className="row" style={{ gap: 8 }}><Flag iso2={x.iso2} title={x.name} />{x.name}</span>
                <span className="num good">+{Math.round(s.world.rel[x.id])}</span>
              </button>
            ))}
            <div className="panel-head" style={{ marginTop: 14 }}><span className="h3">Rivals</span></div>
            {friends.slice(-4).reverse().map((x) => (
              <button key={x.id} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'space-between' }} onClick={() => setSel(x.id)}>
                <span className="row" style={{ gap: 8 }}><Flag iso2={x.iso2} title={x.name} />{x.name}</span>
                <span className="num bad">{Math.round(s.world.rel[x.id])}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="globals">
        <div className="card"><span className="label">Oil price index</span><div className="v">{Math.round(g.oil)}</div><Meter value={g.oil} max={200} tone={g.oil > 120 ? 'bad' : ''} /></div>
        <div className="card"><span className="label">World growth</span><div className="v">{g.growth.toFixed(1)}%</div><Meter value={g.growth + 3} max={9} /></div>
        <div className="card"><span className="label">Global tension</span><div className="v">{Math.round(g.tension)}</div><Meter value={g.tension} tone={g.tension > 60 ? 'bad' : ''} /></div>
        <div className="card"><span className="label">AI adoption</span><div className="v">{Math.round(g.ai)}</div><Meter value={g.ai} /></div>
        <div className="card"><span className="label">Climate stress</span><div className="v">{Math.round(g.climate)}</div><Meter value={g.climate} tone={g.climate > 50 ? 'bad' : ''} /></div>
      </div>
    </>
  );
}
