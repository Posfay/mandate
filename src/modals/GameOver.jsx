import { useMemo } from 'react';
import { legacy } from '../engine/game.js';
import { cfgOf, playerParty, theName } from '../engine/core.js';
import { ACHIEVEMENTS } from '../data/meta.js';
import { fmtDate, monthsLabel } from '../engine/util.js';
import { deleteSave, store } from '../store.js';
import Portrait from '../ui/Portrait.jsx';
import { Rosette } from '../ui/bits.jsx';

const TITLES = {
  defeated: 'Voted out',
  ousted: 'Removed by your own party',
  resigned: 'Resigned',
  revolution: 'Driven from power',
  termlimit: 'Term complete',
};

export default function GameOver({ s, onQuit }) {
  const L = useMemo(() => legacy(s), [s.turn]);
  const c = cfgOf(s);
  const me = playerParty(s);
  const surname = s.player.name;
  return (
    <div className="scrim" style={{ background: 'radial-gradient(ellipse at center, rgba(12,26,45,0.96), rgba(3,8,15,0.99))' }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="legacy-title" style={{ width: 'min(900px, 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -120, top: -120, width: 420, height: 420, color: 'var(--brass)', opacity: 0.25, pointerEvents: 'none' }}>
          <Rosette size={420} R={150} r={53} d={110} layers={6} opacity={0.6} strokeWidth={0.6} />
        </div>
        <div className="modal-pad" style={{ position: 'relative' }}>
          <div className="row" style={{ gap: 14 }}>
            <Portrait seed={s.player.seed} female={s.player.female} age={56} color={me.color} size={64} skin={s.player.skin} darkHair={s.player.darkHair} />
            <div>
              <div className="label">{TITLES[s.over.reason] || 'The end'}, {fmtDate(s.over.turn)}</div>
              <div className="dim">{c.title} of {theName(c)} for {s.turn ? monthsLabel(s.turn) : 'less than a month'}</div>
            </div>
          </div>
          <h2 className="legacy-name" id="legacy-title" style={{ marginTop: 22 }}>
            {surname}, <em>{L.epithet}</em>
          </h2>
          <p className="lede" style={{ marginTop: 12 }}>{s.over.text}</p>
          <div className="grades" style={{ marginTop: 22 }}>
            {L.dims.map((d) => (
              <div key={d.id} className="grade">
                <div className={`g ${d.grade}`}>{d.grade}</div>
                <div className="small dim" style={{ marginTop: 4 }}>{d.name}</div>
              </div>
            ))}
          </div>
          <div className="spread" style={{ marginTop: 22, flexWrap: 'wrap' }}>
            <div className="row wrap" style={{ gap: 6 }}>
              <span className="chip">Legacy score {L.score}</span>
              <span className="chip">{s.stats.billsPassed} laws passed</span>
              <span className="chip">{s.stats.electionsWon} elections won</span>
              {s.achievements.map((id) => <span key={id} className="chip good">{ACHIEVEMENTS.find((a) => a.id === id)?.name}</span>)}
            </div>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => {
                deleteSave();
                store.clear();
                onQuit();
              }}
            >
              Begin another mandate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
