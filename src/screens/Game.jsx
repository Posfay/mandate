// The governing shell: state bar, navigation, the stage, the dispatch tray and the ticker.
import { useEffect, useRef, useState } from 'react';
import { store, useGame, useVersion, exportSave } from '../store.js';
import { cfgOf, playerParty, partyOf, govSeats, majorityOf, theName } from '../engine/core.js';
import { getEvent, fill } from '../engine/effects.js';
import { AGENDA_ACTIONS } from '../engine/game.js';
import { fmtDate, monthsLabel, round } from '../engine/util.js';
import { ISSUES } from '../data/blocs.js';
import { ACHIEVEMENTS } from '../data/meta.js';
import { Flag, Icon, Seal, CAT_LABEL } from '../ui/bits.jsx';
import Portrait from '../ui/Portrait.jsx';
import Overview from '../views/Overview.jsx';
import Electorate from '../views/Electorate.jsx';
import PolicyView from '../views/Policy.jsx';
import BudgetView from '../views/Budget.jsx';
import ParliamentView from '../views/Parliament.jsx';
import CabinetView from '../views/Cabinet.jsx';
import WorldView from '../views/World.jsx';
import MediaView from '../views/Media.jsx';
import RecordsView from '../views/Records.jsx';
import EventModal from '../modals/EventModal.jsx';
import BillModal from '../modals/BillModal.jsx';
import BriefingModal from '../modals/BriefingModal.jsx';
import ElectionModal from '../modals/ElectionModal.jsx';
import GameOver from '../modals/GameOver.jsx';
import Coalition from './Coalition.jsx';
import { ACTOR_MAP } from '../data/world.js';

const NAV = [
  { id: 'overview', name: 'Overview', icon: 'overview' },
  { id: 'electorate', name: 'Electorate', icon: 'electorate' },
  { id: 'policy', name: 'Policy', icon: 'policy' },
  { id: 'budget', name: 'Budget', icon: 'budget' },
  { id: 'parliament', name: 'Parliament', icon: 'parliament' },
  { id: 'cabinet', name: 'Cabinet', icon: 'cabinet' },
  { id: 'world', name: 'World', icon: 'world' },
  { id: 'media', name: 'Media', icon: 'media' },
  { id: 'records', name: 'Records', icon: 'records' },
];

export default function GameScreen({ onQuit, onInfo }) {
  const s = useGame();
  const v = useVersion();
  const [view, setView] = useState('overview');
  const [openEvent, setOpenEvent] = useState(null);
  const [bill, setBill] = useState(null);
  const [briefing, setBriefing] = useState(false);
  const [toast, setToast] = useState(null);
  const [trayOpen, setTrayOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const stageRef = useRef(null);
  useEffect(() => {
    stageRef.current?.scrollTo(0, 0);
  }, [view]);

  const notify = (text, tone) => {
    setToast({ text, tone, id: Date.now() });
  };
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (s?.newAchievement) {
      const a = ACHIEVEMENTS.find((x) => x.id === s.newAchievement);
      notify(`Achievement unlocked: ${a?.name}. ${a?.desc}`, 'good');
      store.dispatch({ type: 'ack' });
    }
  }, [s?.newAchievement]);

  if (!s) return null;
  if (s.phase === 'coalition') {
    return (
      <>
        <Coalition s={s} />
        {s.electionResult && !s.electionResult.seen && <ElectionModal s={s} onClose={() => store.dispatch({ type: 'ackElection' })} />}
      </>
    );
  }

  const c = cfgOf(s);
  const me = playerParty(s);
  const act = (action, okMsg) => {
    const r = store.dispatch(action);
    if (r?.ok === false) notify(r.error || 'That is not possible right now.', 'bad');
    else if (okMsg) notify(okMsg, 'good');
    return r;
  };

  const endMonth = () => {
    if (s.inbox.length) {
      setOpenEvent(s.inbox[0].uid);
      return;
    }
    const r = store.dispatch({ type: 'endMonth' });
    if (r.ok && !s.over && !(s.electionResult && !s.electionResult.seen)) setBriefing(true);
  };

  const history = s.history;
  const prevApproval = history.approval[history.approval.length - 2] ?? s.approval;
  const campaign = s.nextElection - s.turn <= 4;
  const eventInst = openEvent ? s.inbox.find((x) => x.uid === openEvent) : null;
  const electionPending = s.electionResult && !s.electionResult.seen;

  const viewProps = { s, v, act, notify, openBill: setBill, openEvent: setOpenEvent, setView };

  return (
    <div className="shell">
      <header className="topbar">
        <button className="btn btn-ghost" style={{ padding: 4 }} onClick={() => setMenu(!menu)} aria-label="Game menu">
          <Seal text={`${c.title} of ${theName(c)}`} glyph="parliament" size={44} ink="#C9A35C" />
        </button>
        <div className="brand">
          <Portrait seed={s.player.seed} female={s.player.female} age={52} color={me.color} size={40} skin={s.player.skin} darkHair={s.player.darkHair} />
          <div className="who">
            <b>{s.player.name}</b>
            <span>
              {c.title} of {theName(c)}, {fmtDate(s.turn)}
            </span>
          </div>
          <Flag iso2={c.iso2} title={c.name} />
        </div>
        <div className="vitals">
          <div className="vital" title="Share of all citizens who approve of you">
            <span className="k">Approval</span>
            <span className="v">
              {Math.round(s.approval)}%<span className={`d ${s.approval >= prevApproval ? 'good' : 'bad'}`}>{s.approval >= prevApproval ? '▲' : '▼'}{Math.abs(s.approval - prevApproval).toFixed(1)}</span>
            </span>
          </div>
          <div className="vital" title="Political capital: spent on bills, lobbying, decrees and diplomacy">
            <span className="k">Political capital</span>
            <span className="v">{Math.round(s.pc)}</span>
          </div>
          <div className="vital" title="Agenda slots: your personal time this month">
            <span className="k">Agenda</span>
            <span className="agenda-dots">{Array.from({ length: s.agendaMax }, (_, i) => <i key={i} className={i < s.agenda ? 'on' : ''} />)}</span>
          </div>
          <div className="vital opt" title="How much voters believe your promises">
            <span className="k">Trust</span>
            <span className="v">{Math.round(s.trust)}</span>
          </div>
          <div className="vital opt" title="Budget balance, % of GDP">
            <span className="k">{s.econ.deficit >= 0 ? 'Deficit' : 'Surplus'}</span>
            <span className="v">{Math.abs(s.econ.deficit).toFixed(1)}%</span>
          </div>
          <div className="vital" title={`Next ${s.system === 'presidential' ? 'presidential' : 'general'} election`}>
            <span className="k">{campaign ? 'Campaign' : 'Election in'}</span>
            <span className="v" style={campaign ? { color: 'var(--brass-hi)' } : undefined}>{monthsLabel(s.nextElection - s.turn)}</span>
          </div>
        </div>
        <button className="btn btn-primary end-month" onClick={endMonth} disabled={!!s.over}>
          {s.inbox.length ? `${s.inbox.length} decision${s.inbox.length > 1 ? 's' : ''} waiting` : 'End the month'}
        </button>
        <button className="btn btn-ghost" style={{ padding: 8 }} onClick={() => setTrayOpen(!trayOpen)} aria-label="Toggle dispatch tray">
          <Icon name="tray" />
        </button>
        {menu && (
          <div className="panel" style={{ position: 'absolute', top: 62, left: 10, padding: 8, zIndex: 30, minWidth: 220 }} onMouseLeave={() => setMenu(false)}>
            <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => { setMenu(false); onInfo('how'); }}><Icon name="help" size={16} /> How to play</button>
            <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => { setMenu(false); onInfo('multi'); }}><Icon name="multi" size={16} /> Multiplayer roadmap</button>
            <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => { setMenu(false); exportSave(); }}><Icon name="save" size={16} /> Export save file</button>
            {s.system !== 'presidential' && (
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => { setMenu(false); if (confirm('Call a snap election in two months? It costs 10 political capital.')) act({ type: 'snap' }, 'Snap election called.'); }}>Call a snap election</button>
            )}
            <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => { setMenu(false); onQuit(); }}>Save and quit to title</button>
          </div>
        )}
      </header>

      <nav className="rail" aria-label="Sections">
        {NAV.map((n) => (
          <button key={n.id} className={view === n.id ? 'on' : ''} onClick={() => setView(n.id)} aria-current={view === n.id ? 'page' : undefined}>
            <Icon name={n.icon} size={22} />
            {n.name}
          </button>
        ))}
        <div className="spacer" />
      </nav>

      <main className="stage" ref={stageRef}>
        {view === 'overview' && <Overview {...viewProps} />}
        {view === 'electorate' && <Electorate {...viewProps} />}
        {view === 'policy' && <PolicyView {...viewProps} />}
        {view === 'budget' && <BudgetView {...viewProps} />}
        {view === 'parliament' && <ParliamentView {...viewProps} />}
        {view === 'cabinet' && <CabinetView {...viewProps} />}
        {view === 'world' && <WorldView {...viewProps} />}
        {view === 'media' && <MediaView {...viewProps} />}
        {view === 'records' && <RecordsView {...viewProps} />}
      </main>

      <aside className={`tray${trayOpen ? ' open' : ''}`} aria-label="Dispatch tray">
        <Tray s={s} act={act} openEvent={setOpenEvent} setView={setView} />
      </aside>

      <Ticker s={s} />

      {eventInst && (
        <EventModal
          s={s}
          inst={eventInst}
          onClose={() => setOpenEvent(null)}
          onResolved={() => {
            const nxt = s.inbox[0];
            setOpenEvent(nxt ? nxt.uid : null);
          }}
        />
      )}
      {bill && <BillModal s={s} draft={bill} onClose={() => setBill(null)} notify={notify} />}
      {briefing && !eventInst && !s.over && <BriefingModal s={s} onClose={() => setBriefing(false)} onOpenDecision={() => { setBriefing(false); if (s.inbox[0]) setOpenEvent(s.inbox[0].uid); }} />}
      {electionPending && <ElectionModal s={s} onClose={() => store.dispatch({ type: 'ackElection' })} />}
      {s.over && !electionPending && <GameOver s={s} onQuit={onQuit} />}
      {toast && (
        <div className="toast" role="status" key={toast.id}>
          <span className="tone-mark" style={{ background: toast.tone === 'bad' ? 'var(--bad)' : 'var(--good)' }} />
          {toast.text}
        </div>
      )}
    </div>
  );
}

function Tray({ s, act, openEvent, setView }) {
  const [pick, setPick] = useState(null);
  const campaign = s.nextElection - s.turn <= 4;
  const doAgenda = (id, target) => {
    act({ type: 'agenda', action: id, target });
    setPick(null);
  };
  const echoes = s.echoes.filter((e) => e.teaser).sort((a, b) => a.at - b.at);
  return (
    <>
      <section className="tray-sec">
        <div className="spread">
          <span className="tray-title">Decisions</span>
          <span className="label">{s.inbox.length ? `${s.inbox.length} awaiting you` : 'Desk is clear'}</span>
        </div>
        {s.inbox.length === 0 && <p className="small faint" style={{ margin: 0 }}>Nothing needs your signature. Use your agenda, pass legislation, or end the month.</p>}
        {s.inbox.map((inst) => {
          const e = getEvent(inst.id);
          return (
            <button key={inst.uid} className="decision" onClick={() => openEvent(inst.uid)}>
              <span className="cat-glyph"><Icon name={e.cat} size={17} /></span>
              <span>
                <span className="c">{CAT_LABEL[e.cat] || 'Politics'}</span>
                <span className="t" style={{ display: 'block' }}>{fill(s, e.title, inst.ctx)}</span>
              </span>
            </button>
          );
        })}
      </section>

      <section className="tray-sec">
        <div className="spread">
          <span className="tray-title">Your agenda</span>
          <span className="label">{s.agenda} of {s.agendaMax} slots left</span>
        </div>
        {campaign && <p className="small" style={{ margin: '0 0 8px', color: 'var(--brass-hi)' }}>Campaign season: rallies are worth more and lift your party’s vote.</p>}
        <div className="agenda-grid">
          {AGENDA_ACTIONS.filter((a) => !a.needsPartners || s.gov.length > 1).map((a) => (
            <button key={a.id} className="agenda-btn" disabled={s.agenda < 1} onClick={() => (a.target ? setPick(pick === a.id ? null : a.id) : doAgenda(a.id))} title={a.desc}>
              <b>{a.name}</b>
              <span className="faint">{a.target ? 'Choose…' : a.desc.split('.')[0]}</span>
            </button>
          ))}
        </div>
        {pick && (
          <div className="card" style={{ marginTop: 8, padding: 10 }}>
            <div className="label" style={{ marginBottom: 6 }}>{pick === 'address' ? 'Which issue?' : pick === 'rally' ? 'Which voters?' : 'Which party?'}</div>
            <div className="row wrap" style={{ gap: 5 }}>
              {pick === 'address' && ISSUES.map((i) => <button key={i.id} className="chip" onClick={() => doAgenda('address', i.id)}>{i.name}</button>)}
              {pick === 'rally' && s.blocs.map((b) => <button key={b.id} className="chip" onClick={() => doAgenda('rally', b.id)}>{b.short} {Math.round(b.approval)}%</button>)}
              {pick === 'woo' && s.parties.filter((p) => !s.gov.includes(p.id) && (s.seats[p.id] || 0) > 0).map((p) => (
                <button key={p.id} className="chip" onClick={() => doAgenda('woo', p.id)}><span className="party-dot" style={{ background: p.color }} />{p.short}</button>
              ))}
            </div>
          </div>
        )}
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={() => setView('world')}>State visits and diplomacy are in World</button>
      </section>

      {echoes.length > 0 && (
        <section className="tray-sec">
          <div className="spread">
            <span className="tray-title">Echoes</span>
            <span className="label">Consequences on their way</span>
          </div>
          {echoes.slice(0, 6).map((e, i) => (
            <div key={i} className="echo-item">
              <span className="when">{monthsLabel(e.at - s.turn)}</span>
              <span>{e.teaser}</span>
            </div>
          ))}
        </section>
      )}

      <section className="tray-sec">
        <div className="spread">
          <span className="tray-title">Latest</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setView('media')}>All news</button>
        </div>
        {s.news.slice(0, 6).map((n, i) => (
          <div key={i} className="news-item">
            <div className="o"><span className="tone-mark" style={{ background: n.tone > 0 ? 'var(--good)' : n.tone < 0 ? 'var(--bad)' : 'var(--text-3)' }} />{n.outlet}, {fmtDate(n.turn)}</div>
            {n.text}
          </div>
        ))}
      </section>
    </>
  );
}

function Ticker({ s }) {
  const items = s.news.slice(0, 10);
  if (!items.length) return <div className="ticker" />;
  const row = items.map((n, i) => (
    <span key={i}>
      <b>{n.outlet}:</b> {n.text}
    </span>
  ));
  return (
    <div className="ticker" aria-label="News ticker">
      <span className="tag">The wire</span>
      <div className="track">
        {row}
        {row.map((r, i) => <span key={`d${i}`} aria-hidden="true">{r.props.children}</span>)}
      </div>
    </div>
  );
}
