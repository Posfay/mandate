// An engraved orthographic globe on canvas: drag to rotate, scroll to zoom, click to select.
import { useEffect, useRef } from 'react';
import { geoOrthographic, geoPath, geoGraticule10, geoContains, geoInterpolate, geoDistance, geoCentroid } from 'd3-geo';
import { feature } from 'topojson-client';
import topo from 'world-atlas/countries-110m.json';

export const FEATURES = feature(topo, topo.objects.countries).features.filter((f) => f.id !== '010');
const CENTROIDS = Object.fromEntries(FEATURES.map((f) => [f.id, geoCentroid(f)]));
const GRAT = geoGraticule10();
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const wrap180 = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

export default function Globe(props) {
  const canvasRef = useRef(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const S = useRef({ rot: props.initialRotation || [-15, -25, 0], zoom: 1, drag: null, hover: null, fly: null, last: 0, w: 0, h: 0, dpr: 1, t0: performance.now() });

  // fly to a focus point whenever it changes
  useEffect(() => {
    const f = props.focus;
    if (!f) return;
    const s = S.current;
    const from = s.rot.slice();
    const to = [-f[0], -f[1] + (props.tilt ?? 12), 0];
    to[0] = from[0] + wrap180(to[0] - from[0]);
    s.fly = { from, to, t0: performance.now(), dur: 1400, zoomFrom: s.zoom, zoomTo: props.focusZoom ?? s.zoom };
  }, [props.focus?.[0], props.focus?.[1]]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const proj = geoOrthographic().clipAngle(90).precision(0.4);
    const path = geoPath(proj, ctx);
    const s = S.current;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const hatch = document.createElement('canvas');
    hatch.width = hatch.height = 6;
    const hc = hatch.getContext('2d');
    hc.strokeStyle = 'rgba(255,240,210,0.075)';
    hc.lineWidth = 1;
    hc.beginPath();
    hc.moveTo(0, 6);
    hc.lineTo(6, 0);
    hc.stroke();
    const pattern = ctx.createPattern(hatch, 'repeat');

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      s.dpr = Math.min(2, window.devicePixelRatio || 1);
      s.w = r.width;
      s.h = r.height;
      canvas.width = Math.round(r.width * s.dpr);
      canvas.height = Math.round(r.height * s.dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const radius = () => Math.min(s.w, s.h) * 0.46 * s.zoom * (propsRef.current.scale ?? 1);
    const setProj = () => proj.scale(radius()).translate([s.w / 2 + (propsRef.current.offsetX ?? 0) * s.w, s.h / 2]).rotate(s.rot);
    const visible = (lonlat) => geoDistance(lonlat, [-s.rot[0], -s.rot[1]]) < Math.PI / 2 - 0.05;

    const pick = (x, y) => {
      setProj();
      const ll = proj.invert([x, y]);
      if (!ll || Number.isNaN(ll[0])) return null;
      const cx = s.w / 2 + (propsRef.current.offsetX ?? 0) * s.w;
      if (Math.hypot(x - cx, y - s.h / 2) > radius()) return null;
      return FEATURES.find((f) => geoContains(f, ll)) || null;
    };

    let raf;
    const draw = (now) => {
      const p = propsRef.current;
      if (s.fly) {
        const k = Math.min(1, (now - s.fly.t0) / s.fly.dur);
        const e = ease(k);
        s.rot = [s.fly.from[0] + (s.fly.to[0] - s.fly.from[0]) * e, s.fly.from[1] + (s.fly.to[1] - s.fly.from[1]) * e, 0];
        s.zoom = s.fly.zoomFrom + (s.fly.zoomTo - s.fly.zoomFrom) * e;
        if (k >= 1) s.fly = null;
      } else if (p.autoRotate && !s.drag && !reduce && now - s.last > 2500) {
        s.rot[0] += p.autoRotate;
      }
      setProj();
      const { w, h, dpr } = s;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const r = radius();
      const cx = w / 2 + (p.offsetX ?? 0) * w;
      const cy = h / 2;

      // atmosphere
      const atm = ctx.createRadialGradient(cx, cy, r * 0.96, cx, cy, r * 1.22);
      atm.addColorStop(0, 'rgba(201,163,92,0.22)');
      atm.addColorStop(0.35, 'rgba(110,150,200,0.08)');
      atm.addColorStop(1, 'rgba(110,150,200,0)');
      ctx.fillStyle = atm;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.22, 0, Math.PI * 2);
      ctx.fill();

      // ocean
      const oc = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.05, cx, cy, r * 1.02);
      oc.addColorStop(0, '#20416A');
      oc.addColorStop(0.6, '#122947');
      oc.addColorStop(1, '#091526');
      ctx.fillStyle = oc;
      ctx.beginPath();
      path({ type: 'Sphere' });
      ctx.fill();

      ctx.beginPath();
      path(GRAT);
      ctx.strokeStyle = 'rgba(201,163,92,0.09)';
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // land
      const colorFor = p.colorFor;
      for (const f of FEATURES) {
        ctx.beginPath();
        path(f);
        ctx.fillStyle = (colorFor && colorFor(f.id)) || '#24456F';
        ctx.fill();
      }
      ctx.beginPath();
      for (const f of FEATURES) path(f);
      ctx.fillStyle = pattern;
      ctx.fill();
      ctx.strokeStyle = 'rgba(9,20,36,0.85)';
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // selection & hover
      const sel = p.selected;
      for (const id of [s.hover?.id, sel]) {
        if (!id) continue;
        const f = FEATURES.find((x) => x.id === id);
        if (!f) continue;
        ctx.beginPath();
        path(f);
        ctx.strokeStyle = id === sel ? '#E9CD8F' : 'rgba(233,205,143,0.6)';
        ctx.lineWidth = id === sel ? 1.8 : 1.1;
        ctx.stroke();
        if (id === sel) {
          ctx.fillStyle = 'rgba(233,205,143,0.12)';
          ctx.fill();
        }
      }

      // arcs (trade, alliances)
      if (p.arcs?.length) {
        const t = (now - s.t0) / 1000;
        for (const a of p.arcs) {
          const interp = geoInterpolate(a.from, a.to);
          const coords = Array.from({ length: 48 }, (_, i) => interp(i / 47));
          ctx.beginPath();
          path({ type: 'LineString', coordinates: coords });
          ctx.strokeStyle = a.color || 'rgba(233,205,143,0.85)';
          ctx.lineWidth = 1.6;
          ctx.setLineDash([5, 7]);
          ctx.lineDashOffset = reduce ? 0 : -t * 22;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // markers
      if (p.markers) {
        const pulse = (Math.sin((now - s.t0) / 420) + 1) / 2;
        for (const m of p.markers) {
          if (!visible(m.coords)) continue;
          const [x, y] = proj(m.coords);
          if (m.active) {
            ctx.beginPath();
            ctx.arc(x, y, 6 + pulse * 10, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(233,205,143,${0.55 - pulse * 0.5})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.arc(x, y, m.active ? 4 : 2.6, 0, Math.PI * 2);
          ctx.fillStyle = m.color || '#E9CD8F';
          ctx.fill();
        }
      }

      // label for the selected country
      if (p.label && sel && CENTROIDS[sel] && visible(CENTROIDS[sel])) {
        const [x, y] = proj(CENTROIDS[sel]);
        ctx.font = '600 15px "Bodoni Moda Variable", serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(7,17,31,0.75)';
        const tw = ctx.measureText(p.label).width;
        ctx.fillRect(x - tw / 2 - 8, y - 30, tw + 16, 22);
        ctx.fillStyle = '#E9CD8F';
        ctx.fillText(p.label, x, y - 14);
      }

      // rim and specular highlight
      ctx.beginPath();
      path({ type: 'Sphere' });
      ctx.strokeStyle = 'rgba(201,163,92,0.55)';
      ctx.lineWidth = 1;
      ctx.stroke();
      const spec = ctx.createRadialGradient(cx - r * 0.45, cy - r * 0.5, 0, cx - r * 0.45, cy - r * 0.5, r * 0.9);
      spec.addColorStop(0, 'rgba(255,255,255,0.07)');
      spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = spec;
      ctx.beginPath();
      path({ type: 'Sphere' });
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    // interaction
    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    const down = (e) => {
      if (propsRef.current.interactive === false) return;
      const [x, y] = pos(e);
      s.drag = { x, y, rot: s.rot.slice(), moved: 0 };
      s.fly = null;
      s.last = performance.now();
      canvas.setPointerCapture?.(e.pointerId);
    };
    let hoverT = 0;
    const move = (e) => {
      const [x, y] = pos(e);
      if (s.drag) {
        const dx = x - s.drag.x;
        const dy = y - s.drag.y;
        s.drag.moved = Math.max(s.drag.moved, Math.hypot(dx, dy));
        const k = 0.28 / s.zoom;
        s.rot = [s.drag.rot[0] + dx * k, Math.max(-75, Math.min(75, s.drag.rot[1] - dy * k)), 0];
        s.last = performance.now();
        return;
      }
      const now = performance.now();
      if (now - hoverT < 40) return;
      hoverT = now;
      const f = pick(x, y);
      if ((f?.id || null) !== (s.hover?.id || null)) {
        s.hover = f;
        propsRef.current.onHover?.(f ? f.id : null, e.clientX, e.clientY);
      } else if (f) propsRef.current.onHover?.(f.id, e.clientX, e.clientY);
      canvas.style.cursor = f && propsRef.current.isPickable?.(f.id) ? 'pointer' : 'grab';
    };
    const up = (e) => {
      if (!s.drag) return;
      const moved = s.drag.moved;
      s.drag = null;
      if (moved < 5) {
        const [x, y] = pos(e);
        const f = pick(x, y);
        if (f) propsRef.current.onPick?.(f.id);
      }
    };
    const leave = () => {
      s.hover = null;
      propsRef.current.onHover?.(null);
    };
    const wheel = (e) => {
      if (propsRef.current.interactive === false || propsRef.current.zoomable === false) return;
      e.preventDefault();
      s.zoom = Math.max(0.75, Math.min(3.4, s.zoom * (1 - e.deltaY * 0.0012)));
      s.last = performance.now();
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointerleave', leave);
    canvas.addEventListener('wheel', wheel, { passive: false });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('wheel', wheel);
    };
  }, []);

  return <canvas ref={canvasRef} className={props.className} style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', ...props.style }} aria-label={props.ariaLabel || 'Interactive globe'} role="img" />;
}
