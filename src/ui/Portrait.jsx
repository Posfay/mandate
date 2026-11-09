// Generated engraved-style bust portraits for fictional ministers and the player.
import { useMemo } from 'react';

const SKIN = ['#F2D5BF', '#E6BC9C', '#D29E78', '#B57D57', '#8E5B3B', '#6A4128', '#4E2E1C'];
const HAIR = ['#1C1714', '#352519', '#5A3D27', '#8C6239', '#B88B58', '#9C9A98', '#D8D3CB'];
const SUIT = ['#1F2E46', '#2C2F36', '#3A4654', '#4B2730', '#26403B', '#433A55'];

function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function Portrait({ seed = 1, female = false, age = 50, color = '#C9A35C', size = 56, ring = true, skin: skinIdx, darkHair }) {
  const p = useMemo(() => {
    const r = rng(seed);
    const pick = (arr) => arr[Math.floor(r() * arr.length)];
    const sk = pick(SKIN);
    const skin = skinIdx != null ? SKIN[skinIdx] : sk;
    const grey = age > 58 ? r() < 0.75 : age > 48 ? r() < 0.35 : false;
    const hc = pick(HAIR.slice(0, 5));
    const hair = grey ? (r() < 0.5 ? HAIR[5] : HAIR[6]) : darkHair ? HAIR[Math.floor(r() * 2)] : hc;
    const suit = pick(SUIT);
    const style = female ? Math.floor(r() * 4) : Math.floor(r() * 4);
    const glasses = r() < 0.32;
    const tie = !female && r() < 0.7;
    const faceW = 15 + r() * 2.5;
    const faceH = 19 + r() * 2;
    return { skin, hair, suit, style, glasses, tie, faceW, faceH, bald: !female && age > 50 && r() < 0.25 };
  }, [seed, female, age, skinIdx, darkHair]);
  const id = `pt${seed}`;
  const { skin, hair, suit, style, glasses, tie, faceW, faceH, bald } = p;
  const cx = 50;
  const cy = 44;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ flex: 'none' }}>
      <defs>
        <radialGradient id={`${id}bg`} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor={color} stopOpacity="0.55" />
          <stop offset="100%" stopColor="#0C1A2D" stopOpacity="1" />
        </radialGradient>
        <pattern id={`${id}h`} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="3" stroke="#000" strokeWidth="0.6" opacity="0.22" />
        </pattern>
        <clipPath id={`${id}c`}>
          <circle cx="50" cy="50" r="48" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#${id}bg)`} />
      <g clipPath={`url(#${id}c)`}>
        {/* long hair sits behind the shoulders */}
        {female && style === 1 && <path d={`M${cx - 20} ${cy - 6} Q${cx - 24} ${cy + 30} ${cx - 16} ${cy + 40} L${cx + 16} ${cy + 40} Q${cx + 24} ${cy + 30} ${cx + 20} ${cy - 6} Z`} fill={hair} />}
        {/* shoulders */}
        <path d={`M8 104 Q10 74 34 70 L${cx} 78 L66 70 Q90 74 92 104 Z`} fill={suit} />
        <path d={`M8 104 Q10 74 34 70 L${cx} 78 L66 70 Q90 74 92 104 Z`} fill={`url(#${id}h)`} />
        {/* neck */}
        <path d={`M${cx - 6} ${cy + 14} L${cx - 7} 74 L${cx} 80 L${cx + 7} 74 L${cx + 6} ${cy + 14} Z`} fill={skin} />
        <path d={`M${cx - 6} ${cy + 18} L${cx + 6} ${cy + 18} L${cx + 6} ${cy + 22} Q${cx} ${cy + 26} ${cx - 6} ${cy + 22} Z`} fill="#000" opacity="0.12" />
        {/* collar */}
        {female ? (
          <path d={`M${cx - 12} 72 L${cx} 86 L${cx + 12} 72 L${cx + 9} 70 L${cx} 80 L${cx - 9} 70 Z`} fill="#E9EDF2" opacity="0.9" />
        ) : (
          <>
            <path d={`M${cx - 10} 70 L${cx} 80 L${cx + 10} 70 L${cx + 7} 69 L${cx} 76 L${cx - 7} 69 Z`} fill="#F1F3F6" />
            {tie && <path d={`M${cx - 2.5} 78 L${cx + 2.5} 78 L${cx + 4} 100 L${cx} 104 L${cx - 4} 100 Z`} fill={color} opacity="0.95" />}
          </>
        )}
        {/* head */}
        <ellipse cx={cx} cy={cy} rx={faceW} ry={faceH} fill={skin} />
        <ellipse cx={cx - faceW + 1} cy={cy + 2} rx="2.6" ry="4" fill={skin} />
        <ellipse cx={cx + faceW - 1} cy={cy + 2} rx="2.6" ry="4" fill={skin} />
        <path d={`M${cx + 3} ${cy - faceH + 4} Q${cx + faceW + 2} ${cy} ${cx + 2} ${cy + faceH}`} fill="none" stroke="#000" strokeOpacity="0.08" strokeWidth="6" />
        {/* features */}
        <ellipse cx={cx - 6} cy={cy + 1} rx="1.5" ry="1.2" fill="#1E1A17" opacity="0.85" />
        <ellipse cx={cx + 6} cy={cy + 1} rx="1.5" ry="1.2" fill="#1E1A17" opacity="0.85" />
        <path d={`M${cx - 9} ${cy - 3.5} q3 -1.5 6 0 M${cx + 3} ${cy - 3.5} q3 -1.5 6 0`} stroke={hair === HAIR[6] ? '#8f8a84' : hair} strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <path d={`M${cx} ${cy + 2} l-1.6 6 h3`} stroke="#000" strokeOpacity="0.25" strokeWidth="0.9" fill="none" strokeLinecap="round" />
        <path d={`M${cx - 4.5} ${cy + 12} q4.5 2.4 9 0`} stroke="#6E3B2E" strokeOpacity="0.7" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        {glasses && (
          <g fill="none" stroke="#1B1B1F" strokeWidth="1" opacity="0.85">
            <rect x={cx - 11} y={cy - 2.5} width="8.5" height="6.5" rx="2.5" />
            <rect x={cx + 2.5} y={cy - 2.5} width="8.5" height="6.5" rx="2.5" />
            <path d={`M${cx - 2.5} ${cy} h5`} />
          </g>
        )}
        {/* hair */}
        {!bald && !female && style === 0 && <path d={`M${cx - faceW - 1} ${cy - 2} Q${cx - faceW - 2} ${cy - faceH - 6} ${cx} ${cy - faceH - 4} Q${cx + faceW + 2} ${cy - faceH - 6} ${cx + faceW + 1} ${cy - 2} Q${cx + faceW - 2} ${cy - faceH + 4} ${cx} ${cy - faceH + 5} Q${cx - faceW + 2} ${cy - faceH + 4} ${cx - faceW - 1} ${cy - 2} Z`} fill={hair} />}
        {!bald && !female && style === 1 && <path d={`M${cx - faceW - 1} ${cy} Q${cx - faceW} ${cy - faceH - 7} ${cx + 4} ${cy - faceH - 4} Q${cx + faceW + 3} ${cy - faceH - 2} ${cx + faceW + 1} ${cy} Q${cx + faceW - 3} ${cy - faceH + 3} ${cx - 4} ${cy - faceH + 7} Q${cx - faceW + 1} ${cy - faceH + 6} ${cx - faceW - 1} ${cy} Z`} fill={hair} />}
        {!bald && !female && style >= 2 && <path d={`M${cx - faceW} ${cy - 1} Q${cx - faceW - 1} ${cy - faceH - 3} ${cx} ${cy - faceH - 2} Q${cx + faceW + 1} ${cy - faceH - 3} ${cx + faceW} ${cy - 1} L${cx + faceW - 1} ${cy - 6} Q${cx} ${cy - faceH + 1} ${cx - faceW + 1} ${cy - 6} Z`} fill={hair} />}
        {bald && <path d={`M${cx - faceW - 0.5} ${cy + 2} Q${cx - faceW - 1} ${cy - 8} ${cx - faceW + 4} ${cy - 10} L${cx - faceW + 3} ${cy + 1} Z M${cx + faceW + 0.5} ${cy + 2} Q${cx + faceW + 1} ${cy - 8} ${cx + faceW - 4} ${cy - 10} L${cx + faceW - 3} ${cy + 1} Z`} fill={hair} />}
        {female && style === 0 && <path d={`M${cx - faceW - 3} ${cy + 12} Q${cx - faceW - 6} ${cy - faceH - 6} ${cx} ${cy - faceH - 5} Q${cx + faceW + 6} ${cy - faceH - 6} ${cx + faceW + 3} ${cy + 12} L${cx + faceW - 2} ${cy + 10} Q${cx + faceW - 1} ${cy - faceH + 6} ${cx} ${cy - faceH + 5} Q${cx - faceW + 1} ${cy - faceH + 6} ${cx - faceW + 2} ${cy + 10} Z`} fill={hair} />}
        {female && style === 1 && <path d={`M${cx - faceW - 2} ${cy + 4} Q${cx - faceW - 4} ${cy - faceH - 6} ${cx + 2} ${cy - faceH - 5} Q${cx + faceW + 5} ${cy - faceH - 4} ${cx + faceW + 2} ${cy + 4} Q${cx + faceW - 2} ${cy - faceH + 4} ${cx - 6} ${cy - faceH + 7} Q${cx - faceW} ${cy - 4} ${cx - faceW - 2} ${cy + 4} Z`} fill={hair} />}
        {female && style === 2 && (
          <>
            <circle cx={cx} cy={cy - faceH - 6} r="7" fill={hair} />
            <path d={`M${cx - faceW - 1} ${cy} Q${cx - faceW - 2} ${cy - faceH - 4} ${cx} ${cy - faceH - 3} Q${cx + faceW + 2} ${cy - faceH - 4} ${cx + faceW + 1} ${cy} Q${cx + faceW - 2} ${cy - faceH + 5} ${cx} ${cy - faceH + 5} Q${cx - faceW + 2} ${cy - faceH + 5} ${cx - faceW - 1} ${cy} Z`} fill={hair} />
          </>
        )}
        {female && style === 3 && <path d={`M${cx - faceW - 1.5} ${cy + 3} Q${cx - faceW - 3} ${cy - faceH - 5} ${cx} ${cy - faceH - 4} Q${cx + faceW + 3} ${cy - faceH - 5} ${cx + faceW + 1.5} ${cy + 3} L${cx + faceW - 1} ${cy - 4} Q${cx + 4} ${cy - faceH + 2} ${cx - 8} ${cy - faceH + 6} L${cx - faceW + 1} ${cy - 2} Z`} fill={hair} />}
        <circle cx="50" cy="50" r="48" fill={`url(#${id}h)`} opacity="0.5" />
      </g>
      {ring && <circle cx="50" cy="50" r="48" fill="none" stroke={color} strokeWidth="2.2" opacity="0.9" />}
    </svg>
  );
}
