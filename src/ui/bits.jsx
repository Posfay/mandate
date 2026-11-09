// Small visual building blocks: flags, icons, guilloché engraving, the state seal, effect chips.
import { useMemo } from 'react';

// Only the flags of nations the game tracks are bundled.
const FLAGS = import.meta.glob('/node_modules/flag-icons/flags/4x3/{us,ca,mx,br,ar,cl,co,ve,pe,gb,ie,fr,de,it,es,pt,nl,be,ch,at,se,no,dk,fi,pl,cz,sk,hu,ro,gr,rs,ua,by,ru,tr,il,ir,sa,ae,qa,eg,iq,ma,dz,ng,za,ke,et,in,pk,bd,cn,tw,jp,kr,kp,id,vn,th,ph,my,sg,au,nz,kz}.svg', { eager: true, query: '?url', import: 'default' });
const flagUrl = (iso2) => FLAGS[`/node_modules/flag-icons/flags/4x3/${iso2}.svg`];

export function Flag({ iso2, lg, title }) {
  const url = flagUrl(iso2);
  return <span className={`flag${lg ? ' lg' : ''}`} style={{ backgroundImage: url ? `url("${url}")` : undefined }} title={title} role="img" aria-label={title || iso2} />;
}

const P = {
  overview: 'M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 3v5l3.5 2',
  electorate: 'M5 6.5a1.5 1.5 0 1 0 0-.01M10 4.5a1.5 1.5 0 1 0 0-.01M15 6.5a1.5 1.5 0 1 0 0-.01M7 11.5a1.5 1.5 0 1 0 0-.01M13 11.5a1.5 1.5 0 1 0 0-.01M10 15.5a1.5 1.5 0 1 0 0-.01',
  policy: 'M5 2.5h7l3 3v12H5zM12 2.5v3h3M7.5 9h5M7.5 12h5M7.5 15h3',
  budget: 'M10 2.5v15M4 6h12M4 6l-2.5 6a3 3 0 0 0 5 0zM16 6l-2.5 6a3 3 0 0 0 5 0zM6.5 17.5h7',
  parliament: 'M2 16a8 8 0 0 1 16 0M5.5 16a4.5 4.5 0 0 1 9 0M2 16h16',
  cabinet: 'M7 8a2.5 2.5 0 1 0 0-.01M13.5 8.5a2 2 0 1 0 0-.01M2.5 16c.5-3 2.3-4.5 4.5-4.5s4 1.5 4.5 4.5M11.5 12.2c.6-.5 1.2-.7 2-.7 1.8 0 3.3 1.3 3.8 4.5',
  world: 'M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM2 10h16M10 2c2.5 2.6 2.5 13.4 0 16M10 2c-2.5 2.6-2.5 13.4 0 16',
  media: 'M3 4.5h11v11H4.5A1.5 1.5 0 0 1 3 14zM14 7.5h3v7a1 1 0 0 1-2 0M5.5 7.5h6M5.5 10h6M5.5 12.5h4',
  records: 'M3 17h14M5 14V9M9 14V5M13 14v-3M17 14V7',
  menu: 'M3 5h14M3 10h14M3 15h14',
  economy: 'M3 15l4-5 3 3 6-7M12 6h4v4',
  labor: 'M4 16v-5l3-2v-3h3v3l3 2v5zM8 16v-3h2v3',
  society: 'M6.5 7a2 2 0 1 0 0-.01M13.5 7a2 2 0 1 0 0-.01M3 15c.4-2.6 1.7-4 3.5-4s3.1 1.4 3.5 4M10 15c.4-2.6 1.7-4 3.5-4s3.1 1.4 3.5 4',
  health: 'M8 3h4v5h5v4h-5v5H8v-5H3V8h5z',
  education: 'M2 7.5 10 4l8 3.5-8 3.5zM5.5 9.2V13c1.5 1.4 7.5 1.4 9 0V9.2',
  environment: 'M15.5 3.5C8 3.5 4.5 7 4.5 13c0 1 .2 2 .5 3M15.5 3.5C15.5 11 12 15 6 15M9 10l-4 6',
  disaster: 'M10 2.5 18 17H2zM10 8v4M10 14.5v.01',
  security: 'M10 2.5 16 5v4.5c0 4-2.6 6.6-6 8-3.4-1.4-6-4-6-8V5z',
  foreign: 'M3 9l7-6 7 6M5 8v8h10V8M8.5 16v-4h3v4',
  scandal: 'M8.5 3.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12.2 12.2l4.3 4.3',
  politics: 'M10 3v4M5 7h10l-1 9H6zM8 10v3M12 10v3',
  tech: 'M5 5h10v10H5zM8 8h4v4H8zM8 2v3M12 2v3M8 15v3M12 15v3M2 8h3M2 12h3M15 8h3M15 12h3',
  welfare: 'M10 16.5S3 12.4 3 7.6A3.6 3.6 0 0 1 10 6a3.6 3.6 0 0 1 7 1.6c0 4.8-7 8.9-7 8.9z',
  migration: 'M3 10h11M10.5 6 14.5 10l-4 4M17 4v12',
  close: 'M5 5l10 10M15 5 5 15',
  check: 'M4 10.5l4 4 8-9',
  up: 'M10 15V5M5.5 9.5 10 5l4.5 4.5',
  down: 'M10 5v10M5.5 10.5 10 15l4.5-4.5',
  help: 'M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM7.8 7.6a2.3 2.3 0 1 1 3.2 2.1c-.6.3-1 .9-1 1.6v.5M10 14.4v.01',
  save: 'M4 3h9.5L16 5.5V17H4zM7 3v4h6V3M7 17v-5h6v5',
  multi: 'M7 7.5a2.5 2.5 0 1 0 0-.01M14 7.5a2.5 2.5 0 1 0 0-.01M2.5 16c.5-3 2.2-4.5 4.5-4.5s4 1.5 4.5 4.5M9.5 16c.5-3 2.2-4.5 4.5-4.5s4 1.5 4.5 4.5',
  tray: 'M3 4h14v12H3zM3 11h4l1 2h4l1-2h4',
};

export function Icon({ name, size = 20, stroke = 1.6, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      <path d={P[name] || P.politics} />
    </svg>
  );
}

// Hypotrochoid rosettes — the engraved line-work of banknotes and passports.
function trochoid(R, r, d, cx, cy, rot = 0, steps = 720) {
  const k = (R - r) / r;
  const g = gcd(Math.round(R), Math.round(r));
  const turns = Math.round(r) / g;
  let path = '';
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2 * turns;
    const x = (R - r) * Math.cos(t) + d * Math.cos(k * t);
    const y = (R - r) * Math.sin(t) - d * Math.sin(k * t);
    const xr = cx + x * Math.cos(rot) - y * Math.sin(rot);
    const yr = cy + x * Math.sin(rot) + y * Math.cos(rot);
    path += `${i ? 'L' : 'M'}${xr.toFixed(2)} ${yr.toFixed(2)}`;
  }
  return path;
}
function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
}

export function Rosette({ size = 200, R = 60, r = 23, d = 40, layers = 5, color = 'currentColor', opacity = 0.5, strokeWidth = 0.5 }) {
  const paths = useMemo(() => Array.from({ length: layers }, (_, i) => trochoid(R, r, d - i * 3, size / 2, size / 2, (i * Math.PI) / (layers * 6))), [size, R, r, d, layers]);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%" aria-hidden="true">
      {paths.map((p, i) => (
        <path key={i} d={p} fill="none" stroke={color} strokeWidth={strokeWidth} opacity={opacity * (1 - i * 0.12)} />
      ))}
    </svg>
  );
}

// A wavy guilloché band used as the frame of state documents.
export function GuillocheFrame() {
  const w = 1000;
  const h = 1000;
  const band = (inset, amp, freq, phase) => {
    const pts = [];
    const per = 2 * (w + h - 4 * inset);
    for (let i = 0; i <= 900; i++) {
      const u = (i / 900) * per;
      let x;
      let y;
      let nx;
      let ny;
      const W = w - 2 * inset;
      const H = h - 2 * inset;
      if (u < W) [x, y, nx, ny] = [inset + u, inset, 0, 1];
      else if (u < W + H) [x, y, nx, ny] = [w - inset, inset + (u - W), -1, 0];
      else if (u < 2 * W + H) [x, y, nx, ny] = [w - inset - (u - W - H), h - inset, 0, -1];
      else [x, y, nx, ny] = [inset, h - inset - (u - 2 * W - H), 1, 0];
      const o = Math.sin((u / per) * Math.PI * 2 * freq + phase) * amp;
      pts.push(`${i ? 'L' : 'M'}${(x + nx * o).toFixed(1)} ${(y + ny * o).toFixed(1)}`);
    }
    return pts.join('');
  };
  const paths = useMemo(() => [band(10, 5, 120, 0), band(10, 5, 120, Math.PI), band(10, 3, 240, 1), band(22, 0.001, 1, 0)], []);
  return (
    <svg className="dispatch-frame" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true" style={{ width: 'calc(100% - 20px)', height: 'calc(100% - 20px)' }}>
      {paths.map((p, i) => (
        <path key={i} d={p} fill="none" stroke="currentColor" strokeWidth={i === 3 ? 1 : 0.7} vectorEffect="non-scaling-stroke" opacity={i === 3 ? 0.7 : 0.55} />
      ))}
    </svg>
  );
}

export function Seal({ text = 'Office of the Head of Government', glyph = 'politics', size = 92, ink = '#2B4466' }) {
  const id = useMemo(() => `seal-${Math.random().toString(36).slice(2, 8)}`, []);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <defs>
        <path id={id} d="M50 50 m-36 0 a36 36 0 1 1 72 0 a36 36 0 1 1 -72 0" />
      </defs>
      <circle cx="50" cy="50" r="47" fill="none" stroke={ink} strokeWidth="1.2" />
      <circle cx="50" cy="50" r="43.5" fill="none" stroke={ink} strokeWidth="0.5" strokeDasharray="1 1.6" />
      <circle cx="50" cy="50" r="28" fill="none" stroke={ink} strokeWidth="0.8" />
      <g opacity="0.55">
        <Rosette size={100} R={22} r={8} d={14} layers={3} color={ink} opacity={0.9} strokeWidth={0.35} />
      </g>
      <text fontFamily="var(--font-display)" fontSize="7.4" fill={ink} letterSpacing="0.6" fontStyle="italic">
        <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">{text}</textPath>
      </text>
      <g transform="translate(40 40)" color={ink}>
        <Icon name={glyph} size={20} stroke={1.5} />
      </g>
    </svg>
  );
}

export function EffectChips({ items, max = 9 }) {
  if (!items?.length) return null;
  return (
    <div className="chips">
      {items.slice(0, max).map((c, i) => {
        const cls = c.good === true ? 'good' : c.good === false ? 'bad' : '';
        const arrows = c.strength ? (c.dir > 0 ? '▲' : '▼').repeat(c.strength) : '';
        return (
          <span key={i} className={`chip ${cls}${c.uncertain ? ' unc' : ''}`} title={c.uncertain ? 'Uncertain: depends on chance' : c.temp ? 'Temporary' : ''}>
            {c.uncertain && '? '}
            {c.label}
            {arrows && <span className="str">{arrows}</span>}
          </span>
        );
      })}
    </div>
  );
}

export function Meter({ value, max = 100, tone, style }) {
  return (
    <div className={`meter ${tone || ''}`} style={style}>
      <i style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
    </div>
  );
}

export function Delta({ v, d = 1, invert, suffix = '' }) {
  if (v == null || Math.abs(v) < 10 ** -d / 2) return <span className="faint">±0{suffix}</span>;
  const good = invert ? v < 0 : v > 0;
  return (
    <span className={good ? 'good' : 'bad'}>
      {v > 0 ? '▲' : '▼'} {Math.abs(v).toFixed(d)}
      {suffix}
    </span>
  );
}

export const CAT_LABEL = {
  economy: 'Economy', labor: 'Labour', society: 'Society', health: 'Health', education: 'Education', environment: 'Environment',
  disaster: 'Disaster', security: 'Security', foreign: 'Foreign affairs', scandal: 'Scandal', politics: 'Politics', tech: 'Technology',
  welfare: 'Welfare', migration: 'Migration',
};
