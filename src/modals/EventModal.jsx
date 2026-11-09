import { useEffect, useState } from 'react';
import { store } from '../store.js';
import { getEvent, fill, describeOps, resolveOps } from '../engine/effects.js';
import { cfgOf, theName } from '../engine/core.js';
import { fmtDate } from '../engine/util.js';
import { EffectChips, GuillocheFrame, Seal, CAT_LABEL } from '../ui/bits.jsx';

export default function EventModal({ s, inst, onClose, onResolved }) {
  const [stamped, setStamped] = useState(null);
  const e = getEvent(inst.id);
  const c = cfgOf(s);
  useEffect(() => {
    const k = (ev) => ev.key === 'Escape' && !stamped && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [stamped]);

  const choose = (i) => {
    if (stamped != null) return;
    setStamped(i);
    setTimeout(() => {
      store.dispatch({ type: 'resolveEvent', uid: inst.uid, choice: i });
      setStamped(null);
      onResolved();
    }, 650);
  };

  return (
    <div className="scrim" onMouseDown={(ev) => ev.target === ev.currentTarget && !stamped && onClose()}>
      <article className="dispatch" role="dialog" aria-modal="true" aria-labelledby="ev-title">
        <GuillocheFrame />
        <div className="dispatch-inner">
          <div className="seal"><Seal text={`Office of the ${c.title} of ${theName(c)}`} glyph={e.cat} size={92} /></div>
          <div className="meta">
            <span><b>{CAT_LABEL[e.cat] || 'Politics'}</b>, for the attention of the {c.title}</span>
            <span>{fmtDate(s.turn)}</span>
          </div>
          <h2 id="ev-title">{fill(s, e.title, inst.ctx)}</h2>
          <p className="body">{fill(s, e.text, inst.ctx)}</p>
          <div className="choices">
            {e.choices.map((ch, i) => {
              const ok = !ch.req || ch.req(s);
              const chips = describeOps(s, resolveOps(s, ch, inst.ctx), inst.ctx);
              return (
                <button key={i} className="opt" disabled={!ok || stamped != null} onClick={() => choose(i)}>
                  <b>{fill(s, ch.label, inst.ctx)}</b>
                  {ch.desc && <p className="d">{fill(s, ch.desc, inst.ctx)}</p>}
                  {!ok && <p className="d" style={{ color: '#A52833' }}>{ch.reqText}</p>}
                  <EffectChips items={chips} />
                </button>
              );
            })}
          </div>
          {stamped != null && <div className="stamp">Decided</div>}
          {!stamped && (
            <div style={{ marginTop: 18, textAlign: 'right' }}>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--paper-ink-2)' }} onClick={onClose}>Decide later</button>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
