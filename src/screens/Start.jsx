// Title screen and the four-step setup: nation, party, leader, pledges.
import { useMemo, useState } from 'react';
import Globe from '../ui/Globe.jsx';
import { Flag, Icon } from '../ui/bits.jsx';
import Portrait from '../ui/Portrait.jsx';
import { COUNTRIES, COUNTRY_MAP } from '../data/countries.js';
import { ACTORS, ACTOR_MAP } from '../data/world.js';
import { NAMES } from '../data/names.js';
import { BACKGROUNDS, DIFFICULTIES, PLEDGES } from '../data/meta.js';
import { createGame } from '../engine/game.js';
import { money } from '../engine/util.js';
import { store, hasSave, loadSave } from '../store.js';

const PLAYABLE_NUM = new Set(COUNTRIES.map((c) => ACTOR_MAP[c.id].num));
const NUM_TO_ID = Object.fromEntries(ACTORS.map((a) => [a.num, a.id]));
const SYSTEM_LABEL = { parliamentary: 'Parliamentary', presidential: 'Presidential', semi: 'Semi-presidential' };

export function Title({ onNew, onContinue, onInfo }) {
  const save = useMemo(() => hasSave(), []);
  const colorFor = (id) => (PLAYABLE_NUM.has(id) ? '#3C5F8C' : '#22406A');
  return (
    <div className="title-screen">
      <div className="title-globe">
        <Globe colorFor={colorFor} autoRotate={0.05} initialRotation={[-20, -28, 0]} zoomable={false} markers={COUNTRIES.map((c) => ({ coords: c.coords, color: '#E9CD8F' }))} />
      </div>
      <div className="title-vignette" />
      <div className="title-copy">
        <h1 className="title-word">Mandate</h1>
        <p className="title-tag">Every promise has a constituency. Every decision has a cost.</p>
        <p className="title-sub">
          Take power in one of twenty real nations in an alternate 2027. Win votes in a real parliament, keep a coalition together, make
          promises voters will remember, and watch millions of citizens shift with every choice you make.
        </p>
        <div className="title-actions">
          <button className="btn btn-primary btn-lg" onClick={onNew}>Begin a new mandate</button>
          {save && (
            <button className="btn btn-lg" onClick={onContinue}>
              Continue as {save.name} <span className="faint small">{COUNTRY_MAP[save.country]?.name}</span>
            </button>
          )}
        </div>
        <div className="row" style={{ marginTop: 18, gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onInfo('how')}><Icon name="help" size={16} /> How to play</button>
          <button className="btn btn-ghost btn-sm" onClick={() => onInfo('multi')}><Icon name="multi" size={16} /> Multiplayer roadmap</button>
        </div>
      </div>
      <div className="title-foot">
        <span>An alternate near-future. Real nations, real parties, fictional ministers.</span>
        <span>Saves automatically in this browser</span>
      </div>
    </div>
  );
}

const STEPS = ['Nation', 'Party', 'Leader', 'Pledges'];

export function Setup({ onBack, onStart }) {
  const [step, setStep] = useState(0);
  const [countryId, setCountryId] = useState('HUN');
  const [partyId, setPartyId] = useState(null);
  const [name, setName] = useState('');
  const [female, setFemale] = useState(false);
  const [bg, setBg] = useState('economist');
  const [difficulty, setDifficulty] = useState('normal');
  const [pledges, setPledges] = useState([]);
  const [hover, setHover] = useState(null);
  const [seedRef, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const c = COUNTRY_MAP[countryId];
  const party = c.parties.find((p) => p.id === partyId);

  const preview = useMemo(() => {
    // a throwaway state, used to compute pledge targets for this nation
    const pid = partyId || c.parties[0].id;
    return createGame({ countryId, partyId: pid, name: 'x', bg, difficulty, pledges: [], seed: seedRef });
  }, [countryId, partyId, bg, difficulty, seedRef]);

  const suggestName = () => {
    const pool = NAMES[countryId];
    const f = pool[female ? 'f' : 'm'][Math.floor(Math.random() * pool.m.length)];
    const l = pool.s[Math.floor(Math.random() * pool.s.length)];
    setName(['HUN', 'JPN', 'KOR'].includes(countryId) ? `${l} ${f}` : `${f} ${l}`);
  };

  const pickCountry = (id) => {
    setCountryId(id);
    setPartyId(null);
    setPledges([]);
  };

  const colorFor = (num) => {
    const id = NUM_TO_ID[num];
    if (id === countryId) return '#8C7444';
    if (PLAYABLE_NUM.has(num)) return id === hover ? '#4D73A4' : '#33557F';
    return '#1E3A5F';
  };

  const canNext = [true, !!partyId, name.trim().length > 1, pledges.length === 3][step];
  const next = () => {
    if (step < 3) setStep(step + 1);
    else {
      const s = createGame({ countryId, partyId, name: name.trim(), female, bg, difficulty, pledges, seed: seedRef });
      store.set(s);
      onStart();
    }
  };

  const available = PLEDGES.filter((p) => !p.available || p.available(preview));

  return (
    <div className="setup">
      <div className="setup-stage">
        <Globe
          colorFor={colorFor}
          focus={c.coords}
          focusZoom={1.25}
          selected={ACTOR_MAP[countryId].num}
          markers={COUNTRIES.map((x) => ({ coords: x.coords, active: x.id === countryId, color: x.id === countryId ? '#E9CD8F' : 'rgba(233,205,143,0.55)' }))}
          isPickable={(num) => PLAYABLE_NUM.has(num)}
          onPick={(num) => PLAYABLE_NUM.has(num) && step === 0 && pickCountry(NUM_TO_ID[num])}
          onHover={(num) => setHover(num ? NUM_TO_ID[num] : null)}
          initialRotation={[-c.coords[0], -c.coords[1] + 12, 0]}
        />
        <div className="setup-overlay">
          <div className="row" style={{ gap: 14, alignItems: 'center' }}>
            <Flag iso2={c.iso2} lg title={c.name} />
            <div>
              <div className="h1">{c.name}</div>
              <div className="dim">{SYSTEM_LABEL[c.system]} system, {c.legislature} of {c.seats}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="setup-side">
        <div className="setup-steps">
          {STEPS.map((t, i) => (
            <div key={t} className={`setup-step${i === step ? ' on' : i < step ? ' done' : ''}`}>{i + 1}. {t}</div>
          ))}
        </div>
        <div className="setup-body">
          {step === 0 && (
            <>
              <h2 className="h2">Choose a nation</h2>
              <p className="dim small" style={{ marginTop: 6 }}>Click a highlighted country on the globe or pick from the list.</p>
              <div className="card" style={{ margin: '16px 0' }}>
                <p style={{ margin: '0 0 12px', fontFamily: 'var(--font-display)', fontSize: 17, lineHeight: 1.45 }}>{c.blurb}</p>
                <div className="stats-grid">
                  <div><span className="label">Population</span><div className="v">{c.pop >= 100 ? Math.round(c.pop) : c.pop.toFixed(1)}m</div></div>
                  <div><span className="label">Economy</span><div className="v">{money(c.gdp)}</div></div>
                  <div><span className="label">Debt</span><div className="v">{c.debt}%</div></div>
                  <div><span className="label">Unemployment</span><div className="v">{c.unemp}%</div></div>
                  <div><span className="label">Inflation</span><div className="v">{c.infl}%</div></div>
                  <div><span className="label">Term</span><div className="v">{c.term / 12} yrs</div></div>
                </div>
                <div className="row wrap" style={{ marginTop: 12, gap: 6 }}>
                  {c.challenges.map((x) => <span key={x} className="chip">{x}</span>)}
                </div>
              </div>
              <div className="nation-list">
                {COUNTRIES.map((x) => (
                  <button key={x.id} className={`nation${x.id === countryId ? ' on' : ''}`} onClick={() => pickCountry(x.id)}>
                    <Flag iso2={x.iso2} title={x.name} />
                    <span style={{ flex: 1 }}>
                      <span className="nm">{x.name}</span>
                      <span className="sys" style={{ display: 'block' }}>{SYSTEM_LABEL[x.system]}</span>
                    </span>
                    <span className="diff-dots" title={`Difficulty ${x.difficulty} of 3`}>{[1, 2, 3].map((d) => <i key={d} className={d <= x.difficulty ? 'on' : ''} />)}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="h2">Choose your party</h2>
              <p className="dim small" style={{ marginTop: 6, maxWidth: '52ch' }}>
                Shares are recent real-world polling. In this timeline your party has just come first; whether you have a majority depends
                on {c.legislature === 'Congress' ? 'Congress' : 'the seat count'}, and you may need coalition partners.
              </p>
              <div className="col" style={{ marginTop: 16, gap: 8 }}>
                {c.parties.map((p) => (
                  <button key={p.id} className={`choice-card${p.id === partyId ? ' on' : ''}`} onClick={() => setPartyId(p.id)}>
                    <div className="spread">
                      <div className="row">
                        <span className="party-dot" style={{ background: p.color, width: 14, height: 14 }} />
                        <div>
                          <b style={{ fontSize: 15 }}>{p.name}</b>
                          <div className="small faint">{ideologyLabel(p)}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="big-num" style={{ fontSize: 22 }}>{p.share}%</div>
                        <MiniCompass econ={p.econ} social={p.social} color={p.color} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="h2">Who are you?</h2>
              <div className="row" style={{ gap: 16, marginTop: 16, alignItems: 'flex-end' }}>
                <button className="btn btn-ghost" style={{ padding: 2, borderRadius: '50%' }} onClick={() => setSeed(Math.floor(Math.random() * 2 ** 31))} title="Change portrait" aria-label="Change portrait">
                  <Portrait seed={preview.player.seed} female={female} age={52} color={party?.color} size={76} skin={preview.player.skin} darkHair={preview.player.darkHair} />
                </button>
                <div className="field" style={{ flex: 1 }}>
                  <label className="label" htmlFor="leader-name">Your name</label>
                  <div className="row">
                    <input id="leader-name" className="input" style={{ flex: 1 }} value={name} onChange={(e) => setName(e.target.value)} placeholder={`e.g. ${['HUN', 'JPN', 'KOR'].includes(countryId) ? `${NAMES[countryId].s[0]} ${NAMES[countryId].m[0]}` : `${NAMES[countryId].m[0]} ${NAMES[countryId].s[0]}`}`} maxLength={40} />
                    <button className="btn" onClick={suggestName} title="Suggest a name">Suggest</button>
                  </div>
                  <div className="seg" style={{ alignSelf: 'flex-start' }}>
                    <button className={!female ? 'on' : ''} onClick={() => setFemale(false)}>He / him</button>
                    <button className={female ? 'on' : ''} onClick={() => setFemale(true)}>She / her</button>
                  </div>
                </div>
              </div>
              <h3 className="h3" style={{ marginTop: 24, marginBottom: 10 }}>Background</h3>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {BACKGROUNDS.map((b) => (
                  <button key={b.id} className={`choice-card${b.id === bg ? ' on' : ''}`} onClick={() => setBg(b.id)}>
                    <b style={{ fontSize: 14 }}>{b.name}</b>
                    <div className="small dim" style={{ marginTop: 3 }}>{b.blurb}</div>
                    {b.id === bg && (
                      <ul className="small" style={{ margin: '8px 0 0', paddingLeft: 16, color: 'var(--text-2)' }}>
                        {b.perks.map((x) => <li key={x}>{x}</li>)}
                      </ul>
                    )}
                  </button>
                ))}
              </div>
              <h3 className="h3" style={{ marginTop: 24, marginBottom: 10 }}>Difficulty</h3>
              <div className="col" style={{ gap: 8 }}>
                {DIFFICULTIES.map((d) => (
                  <button key={d.id} className={`choice-card${d.id === difficulty ? ' on' : ''}`} onClick={() => setDifficulty(d.id)}>
                    <b>{d.name}</b> <span className="small dim">{d.blurb}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="h2">Make three promises</h2>
              <p className="dim small" style={{ marginTop: 6, maxWidth: '54ch' }}>
                Voters will judge you on them at the next election. Keeping them builds trust; missing them costs it. Break the no-new-taxes
                pledge and the papers will never let you forget.
              </p>
              <div className="col" style={{ marginTop: 16, gap: 8 }}>
                {available.map((p) => {
                  const on = pledges.includes(p.id);
                  const t = p.target(preview);
                  return (
                    <button
                      key={p.id}
                      className={`choice-card${on ? ' on' : ''}${!on && pledges.length >= 3 ? ' off' : ''}`}
                      onClick={() => setPledges(on ? pledges.filter((x) => x !== p.id) : pledges.length < 3 ? [...pledges, p.id] : pledges)}
                    >
                      <div className="spread">
                        <div>
                          <b style={{ fontSize: 14.5 }}>{p.name}</b>
                          <div className="small dim">{p.desc(preview, t)}</div>
                        </div>
                        <span className="check" style={on ? { background: 'var(--brass)', borderColor: 'var(--brass)' } : undefined}>{on && <Icon name="check" size={14} stroke={2.4} />}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <div className="setup-foot">
          <button className="btn btn-ghost" onClick={() => (step === 0 ? onBack() : setStep(step - 1))}>{step === 0 ? 'Back to title' : 'Back'}</button>
          <button className="btn btn-primary" disabled={!canNext} onClick={next}>
            {step < 3 ? `Continue to ${STEPS[step + 1].toLowerCase()}` : `Take office as ${c.title}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ideologyLabel(p) {
  const e = p.econ < -0.55 ? 'Hard left' : p.econ < -0.15 ? 'Centre-left' : p.econ <= 0.2 ? 'Centrist' : p.econ <= 0.6 ? 'Centre-right' : 'Free-market right';
  const s = p.social < -0.5 ? 'progressive' : p.social < 0.2 ? 'liberal' : p.social < 0.65 ? 'conservative' : 'nationalist';
  return `${e}, ${s}${p.regional ? ', regional' : ''}`;
}

export function MiniCompass({ econ, social, color, size = 34 }) {
  const x = ((econ + 1) / 2) * size;
  const y = (1 - (social + 1) / 2) * size;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ marginTop: 4 }}>
      <rect x="0.5" y="0.5" width={size - 1} height={size - 1} rx="4" fill="none" stroke="rgba(157,180,207,0.25)" />
      <line x1={size / 2} y1="2" x2={size / 2} y2={size - 2} stroke="rgba(157,180,207,0.18)" />
      <line x1="2" y1={size / 2} x2={size - 2} y2={size / 2} stroke="rgba(157,180,207,0.18)" />
      <circle cx={x} cy={y} r="3.5" fill={color} />
    </svg>
  );
}

export function startContinue() {
  return loadSave();
}
