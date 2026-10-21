// primitives.js — the generator engine. Each primitive takes DATA + opts and
// returns an on-brand SVG/HTML string. One generator -> infinite instances.
// Palette-aware (10-hue teaching spectrum), token-styled, animation-hook ready.
// ESM: import * as P from './primitives.js'
import { icon, ICON_NAMES } from './icons.js';

export const HUES = ['client','cdn','loadbal','gateway','service','cache','db','queue','worker','failure'];
export const col = n => `var(--${n})`;
const hue = i => HUES[((i % HUES.length) + HUES.length) % HUES.length];
const N = (v, d = 1) => (+v).toFixed(d);
// deterministic PRNG (seeded) so generated data is reproducible
export const rng = (seed = 1) => { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
const svg = (w, h, body, cls = '') => `<svg class="${cls}" viewBox="0 0 ${w} ${h}" width="100%" style="max-height:100%">${body}</svg>`;
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------- QUANTITY / COMPARISON ----------------
export const bars = (data, o = {}) => { const w = 300, h = 180, p = 20, max = Math.max(...data.map(d => d.v)), bw = (w - p * 2) / data.length;
  return svg(w, h, data.map((d, i) => { const bh = (h - p * 2) * d.v / max, x = p + i * bw, y = h - p - bh, c = col(d.c || hue(i));
    return `<rect x="${x + 4}" y="${y}" width="${bw - 10}" height="${bh}" rx="4" fill="${c}" opacity="${o.flat ? 1 : 0.55 + 0.4 * d.v / max}"/>${o.labels ? `<text x="${x + bw / 2}" y="${h - 6}" text-anchor="middle" font-size="9">${d.l || ''}</text>` : ''}`; }).join('') + `<line x1="${p}" y1="${h - p}" x2="${w - p}" y2="${h - p}" stroke="var(--line2)"/>`); };

export const hbars = (data, _o = {}) => { const w = 300, h = data.length * 34 + 12, max = Math.max(...data.map(d => d.v));
  return svg(w, h, data.map((d, i) => { const bw = (w - 90) * d.v / max, c = col(d.c || hue(i));
    return `<rect x="80" y="${10 + i * 34}" width="${bw}" height="20" rx="5" fill="${c}" opacity="${0.9 - i * 0.04}"/><text x="72" y="${24 + i * 34}" text-anchor="end" font-size="11" fill="var(--muted)">${d.l}</text><text x="${84 + bw}" y="${24 + i * 34}" font-size="10" fill="var(--faint)">${d.v}</text>`; }).join('')); };

export const groupedBars = (groups, _o = {}) => { const w = 300, h = 180, p = 22, gv = groups.flatMap(g => g.v), max = Math.max(...gv), gw = (w - p * 2) / groups.length;
  return svg(w, h, groups.map((g, i) => g.v.map((v, j) => { const bw = (gw - 12) / g.v.length, bh = (h - p * 2) * v / max, x = p + i * gw + 6 + j * bw, y = h - p - bh;
    return `<rect x="${x}" y="${y}" width="${bw - 3}" height="${bh}" rx="2" fill="${col(hue(j + 3))}"/>`; }).join('')).join('') + `<line x1="${p}" y1="${h - p}" x2="${w - p}" y2="${h - p}" stroke="var(--line2)"/>`); };

export const waffle = (pct, o = {}) => { const n = 100, on = Math.round(pct), c = col(o.c || 'db');
  return svg(200, 200, Array.from({ length: n }).map((_, i) => `<rect x="${(i % 10) * 19 + 5}" y="${Math.floor(i / 10) * 19 + 5}" width="15" height="15" rx="3" fill="${i < on ? c : 'var(--line2)'}"/>`).join('')); };

// ---------------- CHANGE OVER TIME ----------------
const pathFrom = (pts, w, h, p, max, min = 0) => pts.map((v, i) => `${p + (w - p * 2) * i / (pts.length - 1)},${h - p - (h - p * 2) * (v - min) / (max - min)}`).join(' ');
export const line = (series, o = {}) => { const w = 320, h = 190, p = 22, all = series.flatMap(s => s.v), max = Math.max(...all), min = Math.min(0, ...all);
  return svg(w, h, `<line x1="${p}" y1="${h - p}" x2="${w - p}" y2="${h - p}" stroke="var(--line2)"/>` + series.map((s, i) => { const pts = pathFrom(s.v, w, h, p, max, min); const c = col(s.c || hue(i));
    return `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="2.5"/>` + (o.dots ? pts.split(' ').map(pt => `<circle cx="${pt.split(',')[0]}" cy="${pt.split(',')[1]}" r="3" fill="${c}"/>`).join('') : ''); }).join('')); };

export const area = (vals, o = {}) => { const w = 320, h = 190, p = 22, max = Math.max(...vals), c = o.c || 'brand2';
  const pts = pathFrom(vals, w, h, p, max); const id = 'g' + (o.id || Math.floor(max));
  return svg(w, h, `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--${c})" stop-opacity=".5"/><stop offset="1" stop-color="var(--${c})" stop-opacity="0"/></linearGradient></defs><polygon points="${pts} ${w - p},${h - p} ${p},${h - p}" fill="url(#${id})"/><polyline points="${pts}" fill="none" stroke="var(--${c})" stroke-width="2.5"/>`); };

export const sparkline = (vals, o = {}) => { const w = 120, h = 34, max = Math.max(...vals), min = Math.min(...vals);
  return svg(w, h, `<polyline points="${pathFrom(vals, w, h, 3, max, min)}" fill="none" stroke="var(--${o.c || 'db'})" stroke-width="2"/>`); };

export const candles = (data, _o = {}) => { const w = 300, h = 180, p = 16, all = data.flatMap(d => [d.h, d.l]), max = Math.max(...all), min = Math.min(...all), bw = (w - p * 2) / data.length;
  const y = v => h - p - (h - p * 2) * (v - min) / (max - min);
  return svg(w, h, data.map((d, i) => { const x = p + i * bw + bw / 2, up = d.c >= d.o, c = up ? 'var(--db)' : 'var(--failure)';
    return `<line x1="${x}" y1="${y(d.h)}" x2="${x}" y2="${y(d.l)}" stroke="${c}"/><rect x="${x - bw / 3}" y="${y(Math.max(d.o, d.c))}" width="${bw * 2 / 3}" height="${Math.max(2, Math.abs(y(d.o) - y(d.c)))}" fill="${c}"/>`; }).join('')); };

// ---------------- DISTRIBUTION / CORRELATION ----------------
export const scatter = (pts, _o = {}) => { const w = 300, h = 190;
  return svg(w, h, `<rect x="8" y="8" width="${w - 16}" height="${h - 16}" rx="8" fill="none" stroke="var(--line2)"/>` + pts.map(pt => `<circle cx="${18 + pt.x * (w - 36)}" cy="${h - 18 - pt.y * (h - 36)}" r="${pt.r || 5}" fill="${col(pt.c || 'gateway')}" opacity=".9"/>`).join('')); };

export const histogram = (bins, o = {}) => { const w = 300, h = 180, p = 18, max = Math.max(...bins), bw = (w - p * 2) / bins.length;
  return svg(w, h, bins.map((v, i) => `<rect x="${p + i * bw}" y="${h - p - (h - p * 2) * v / max}" width="${bw - 3}" height="${(h - p * 2) * v / max}" fill="var(--${o.c || 'service'})" opacity=".8"/>`).join('') + (o.curve ? `<path d="M${p},${h - p} Q${w / 2},${-20} ${w - p},${h - p}" fill="none" stroke="var(--warn)" stroke-width="2" opacity=".7"/>` : '')); };

export const heatmap = (matrix, o = {}) => { const rows = matrix.length, cols = matrix[0].length, cs = 26, gap = 4, c = o.c || 'brand';
  return svg(cols * (cs + gap), rows * (cs + gap), matrix.flatMap((row, r) => row.map((v, k) => `<rect x="${k * (cs + gap)}" y="${r * (cs + gap)}" width="${cs}" height="${cs}" rx="4" fill="var(--${c})" opacity="${(0.1 + v * 0.85).toFixed(2)}"/>`)).join('')); };

// ---------------- PART-WHOLE ----------------
export const donut = (segs, o = {}) => { let off = 25; const tot = segs.reduce((a, s) => a + s.v, 0);
  return svg(42, 42, `<circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--line2)" stroke-width="${o.w || 6}"/>` + segs.map((s, i) => { const pct = 100 * s.v / tot; const el = `<circle cx="21" cy="21" r="15.9" fill="none" stroke="${col(s.c || hue(i))}" stroke-width="${o.w || 6}" stroke-dasharray="${N(pct)} ${N(100 - pct)}" stroke-dashoffset="${N(off)}"/>`; off -= pct; return el; }).join('') + (o.center ? `<text x="21" y="23" text-anchor="middle" font-size="6" fill="var(--ink)">${o.center}</text>` : '')); };

export const gauge = (pct, o = {}) => { const a = lerp(20, 160, pct / 100), ex = 90 + 70 * Math.cos(Math.PI - a * Math.PI / 180), ey = 110 - 70 * Math.sin(a * Math.PI / 180);
  const grad = o.grad !== false;
  return svg(180, 122, `<path d="M20 110 A70 70 0 0 1 160 110" fill="none" stroke="rgba(255,255,255,.09)" stroke-width="13"/><path d="M20 110 A70 70 0 0 1 ${N(ex)} ${N(ey)}" fill="none" stroke="${grad ? 'url(#gG)' : 'var(--' + (o.c || 'db') + ')'}" stroke-width="13" stroke-linecap="round"/><defs><linearGradient id="gG"><stop offset="0" stop-color="var(--ok)"/><stop offset=".7" stop-color="var(--warn)"/><stop offset="1" stop-color="var(--failure)"/></linearGradient></defs><text x="90" y="100" text-anchor="middle" font-family="Fraunces" font-size="30" fill="var(--ink)">${o.label || pct + '%'}</text>`); };

export const pyramid = (levels, _o = {}) => { const w = 240, h = 170;
  return svg(w, h, levels.map((l, i) => { const lw = (w - 40) * (i + 1) / levels.length; return `<rect x="${(w - lw) / 2}" y="${h - 20 - (i + 1) * (h - 30) / levels.length}" width="${lw}" height="${(h - 30) / levels.length - 6}" rx="4" fill="${col(hue(i))}" opacity=".85"/><text x="${w / 2}" y="${h - 8 - i * (h - 30) / levels.length - (h - 30) / levels.length / 2}" text-anchor="middle" font-size="10" fill="#0B0B0E">${l}</text>`; }).reverse().join('')); };

export const funnel = (steps, o = {}) => { const w = 220, max = Math.max(...steps.map(s => s.v));
  return svg(w, steps.length * 36 + 10, steps.map((s, i) => { const bw = (w - 20) * s.v / max; return `<rect x="${(w - bw) / 2}" y="${10 + i * 36}" width="${bw}" height="26" rx="4" fill="var(--${o.c || 'cdn'})" opacity="${(0.9 - i * 0.14).toFixed(2)}"/><text x="${w / 2}" y="${27 + i * 36}" text-anchor="middle" font-size="10" fill="#08120d">${s.l}</text>`; }).join('')); };

export const radar = (axes, o = {}) => { const R = 60, cx = 75, cy = 75; const pt = (v, i) => { const a = i * (2 * Math.PI / axes.length) - Math.PI / 2; return [cx + R * v * Math.cos(a), cy + R * v * Math.sin(a)]; };
  return svg(150, 150, axes.map((_, i) => { const [x, y] = pt(1, i); return `<line x1="${cx}" y1="${cy}" x2="${N(x)}" y2="${N(y)}" stroke="var(--line2)"/>`; }).join('') + `<polygon points="${axes.map((a, i) => pt(a.v, i).map(n => N(n)).join(',')).join(' ')}" fill="var(--${o.c || 'brand'})" fill-opacity=".3" stroke="var(--brand2)" stroke-width="2"/>`); };

// ---------------- FLOW / SYSTEMS ----------------
const nodeBox = (n, i) => { const c = n.c || hue(i); return `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 20px;border-radius:16px;border:2px solid var(--${c});background:rgba(255,255,255,.02);min-width:110px"><span style="color:var(--${c});display:flex">${n.icon ? icon(n.icon, 34) : ''}</span><span style="font-family:var(--display);font-weight:600;font-size:22px">${n.l}</span>${n.tag ? `<span style="font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${n.tag}</span>` : ''}</div>`; };
export const flow = (nodes, o = {}) => `<div style="display:flex;align-items:center;justify-content:center;gap:${o.gap || 18}px;flex-wrap:wrap">${nodes.map((n, i) => nodeBox(n, i) + (i < nodes.length - 1 ? `<span style="color:var(--${o.edge || 'gateway'});font-size:26px">${o.dash ? '⇢' : '→'}</span>` : '')).join('')}</div>`;

export const cycle = (nodes, _o = {}) => { const R = 78, cx = 110, cy = 110; return `<div style="position:relative;width:220px;height:220px">${nodes.map((n, i) => { const a = i * (2 * Math.PI / nodes.length) - Math.PI / 2, x = cx + R * Math.cos(a), y = cy + R * Math.sin(a), c = n.c || hue(i);
  return `<div style="position:absolute;left:${N(x)}px;top:${N(y)}px;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:4px;color:var(--${c})"><span style="display:flex">${icon(n.icon || 'circle', 30)}</span><span style="font-family:var(--mono);font-size:11px;color:var(--ink)">${n.l}</span></div>`; }).join('')}<svg viewBox="0 0 220 220" style="position:absolute;inset:0"><circle cx="110" cy="110" r="78" fill="none" stroke="var(--line2)" stroke-dasharray="4 5"/></svg></div>`; };

export const layered = (layers, _o = {}) => `<div style="display:flex;flex-direction:column;gap:8px;width:260px">${layers.map((l, i) => `<div style="border:1.5px solid var(--${l.c || hue(i)});border-radius:10px;padding:12px;text-align:center;font-family:var(--mono);font-size:13px;color:var(--${l.c || hue(i)});display:flex;align-items:center;justify-content:center;gap:8px">${l.icon ? icon(l.icon, 18) : ''}${l.l}</div>`).join('')}</div>`;

export const tree = (root, _o = {}) => { // {l, children:[...]} one level shown
  const kids = root.children || []; const w = Math.max(240, kids.length * 90), cx = w / 2;
  return svg(w, 160, `<path d="${kids.map((_, i) => `M${cx},46 L${45 + i * (w - 90) / Math.max(1, kids.length - 1)},96`).join(' ')}" stroke="var(--line2)" fill="none"/>` + `<rect x="${cx - 34}" y="18" width="68" height="30" rx="7" fill="none" stroke="var(--brand2)"/><text x="${cx}" y="38" text-anchor="middle" font-size="12" fill="var(--ink)">${root.l}</text>` + kids.map((k, i) => { const x = 45 + i * (w - 90) / Math.max(1, kids.length - 1); return `<rect x="${x - 34}" y="96" width="68" height="30" rx="7" fill="none" stroke="var(--${k.c || hue(i)})"/><text x="${x}" y="116" text-anchor="middle" font-size="11" fill="var(--ink)">${k.l}</text>`; }).join('')); };

export const network = (nodes, links, _o = {}) => svg(220, 170, links.map(l => `<line x1="${nodes[l[0]].x}" y1="${nodes[l[0]].y}" x2="${nodes[l[1]].x}" y2="${nodes[l[1]].y}" stroke="var(--line2)"/>`).join('') + nodes.map((n, i) => `<circle cx="${n.x}" cy="${n.y}" r="${n.r || 9}" fill="var(--${n.c || hue(i)})"/>`).join(''));

export const sequence = (actors, msgs, _o = {}) => { const w = 260, lane = w / (actors.length + 1);
  return svg(w, msgs.length * 30 + 40, actors.map((a, i) => `<line x1="${lane * (i + 1)}" y1="24" x2="${lane * (i + 1)}" y2="${msgs.length * 30 + 30}" stroke="var(--line2)"/><text x="${lane * (i + 1)}" y="16" text-anchor="middle" font-size="10" fill="var(--${hue(i)})">${a}</text>`).join('') + msgs.map((m, i) => { const x1 = lane * (m.from + 1), x2 = lane * (m.to + 1), y = 44 + i * 30; return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="var(--${m.c || 'gateway'})" stroke-width="2" ${m.dash ? 'stroke-dasharray="4 3"' : ''}/><text x="${(x1 + x2) / 2}" y="${y - 5}" text-anchor="middle" font-size="8">${m.l}</text>`; }).join('')); };

export const gantt = (tasks, _o = {}) => svg(240, tasks.length * 26 + 20, `<line x1="0" y1="12" x2="240" y2="12" stroke="var(--line2)"/>` + tasks.map((t, i) => `<rect x="${t.s * 2.2}" y="${20 + i * 26}" width="${t.d * 2.2}" height="15" rx="4" fill="var(--${t.c || hue(i)})" opacity=".85"/><text x="${t.s * 2.2 + 4}" y="${31 + i * 26}" font-size="9" fill="#0B0B0E">${t.l || ''}</text>`).join(''));

export const venn = (a, b, _o = {}) => svg(200, 150, `<circle cx="78" cy="75" r="50" fill="var(--brand)" fill-opacity=".22" stroke="var(--brand2)"/><circle cx="122" cy="75" r="50" fill="var(--db)" fill-opacity=".22" stroke="var(--db)"/><text x="55" y="79" text-anchor="middle" font-size="11" fill="var(--ink)">${a}</text><text x="145" y="79" text-anchor="middle" font-size="11" fill="var(--ink)">${b}</text>`);

// ---------------- CODE / PRODUCT ----------------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const codeBlock = (lines, o = {}) => `<div style="font-family:var(--mono);font-size:15px;line-height:1.75;text-align:left;border:1px solid var(--line2);border-radius:12px;background:var(--s1);padding:16px 20px;min-width:320px">${o.file ? `<div style="color:var(--faint);font-size:12px;margin-bottom:8px">${o.file}</div>` : ''}${lines.map(l => `<div style="${l.hl ? 'background:rgba(245,198,79,.12);border-left:2px solid var(--warn);padding-left:8px;margin-left:-10px' : ''};color:${l.c === 'c' ? 'var(--faint)' : l.c === 'g' ? 'var(--db)' : l.c === 'r' ? 'var(--failure)' : 'var(--ink)'}">${esc(l.t)}</div>`).join('')}</div>`;

export const terminal = (lines, o = {}) => `<div style="font-family:var(--mono);font-size:14px;background:#0d0d12;border:1px solid var(--line2);border-radius:10px;min-width:300px;text-align:left;overflow:hidden"><div style="padding:8px 14px;border-bottom:1px solid var(--line);color:var(--faint)">${o.cmd || '▸ run'}</div>${lines.map(l => `<div style="padding:4px 14px;color:${l.c === 'g' ? 'var(--db)' : l.c === 'r' ? 'var(--failure)' : 'var(--faint)'}">${esc(l.t)}</div>`).join('')}</div>`;

export const diff = (lines, _o = {}) => `<div style="font-family:var(--mono);font-size:15px;text-align:left;border-radius:10px;overflow:hidden;min-width:300px">${lines.map(l => `<div style="padding:4px 12px;color:var(--${l.s === '+' ? 'ok' : l.s === '-' ? 'failure' : 'muted'});background:${l.s === '+' ? 'rgba(94,224,140,.08)' : l.s === '-' ? 'rgba(255,107,107,.08)' : 'transparent'}">${l.s || ' '} ${esc(l.t)}</div>`).join('')}</div>`;

export const kpi = (tiles, o = {}) => `<div style="display:grid;grid-template-columns:repeat(${o.cols || 2},1fr);gap:14px">${tiles.map((t, i) => `<div style="border:1px solid var(--line2);border-radius:12px;padding:16px 20px;text-align:center"><div style="font-family:var(--display);font-weight:600;font-size:38px;color:var(--${t.c || hue(i)})">${t.v}</div><div style="font-family:var(--mono);font-size:11px;color:var(--faint);text-transform:uppercase;letter-spacing:.1em">${t.l}</div></div>`).join('')}</div>`;

export const statBig = (v, label, o = {}) => `<div style="text-align:center"><div style="font-family:var(--display);font-weight:700;font-size:120px;line-height:1;color:var(--${o.c || 'brand2'})">${v}</div><div style="font-family:var(--mono);font-size:20px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-top:8px">${label}</div></div>`;

export const chat = (msgs, _o = {}) => `<div style="display:flex;flex-direction:column;gap:12px;min-width:340px">${msgs.map(m => `<div style="align-self:${m.u ? 'flex-end' : 'flex-start'};max-width:80%;font-size:20px;padding:14px 18px;border-radius:16px;background:${m.u ? 'rgba(61,90,254,.14)' : m.bad ? 'rgba(255,107,107,.06)' : m.good ? 'rgba(94,224,140,.06)' : 'var(--s2)'};border:1px solid ${m.bad ? 'rgba(255,107,107,.4)' : m.good ? 'rgba(94,224,140,.4)' : 'var(--line2)'}">${m.t}</div>`).join('')}</div>`;

export const table = (head, rows, _o = {}) => `<table style="border-collapse:collapse;font-family:var(--mono);font-size:15px"><tr>${head.map(h => `<td style="padding:8px 16px;color:var(--faint);border-bottom:1px solid var(--line2)">${h}</td>`).join('')}</tr>${rows.map(r => `<tr>${r.map((c, i) => `<td style="padding:8px 16px;border-bottom:1px solid var(--line);color:${c === '✓' ? 'var(--ok)' : c === '✗' ? 'var(--failure)' : i === 0 ? 'var(--muted)' : 'var(--ink)'}">${c}</td>`).join('')}</tr>`).join('')}</table>`;

export const steps = (items, _o = {}) => `<div style="display:flex;flex-direction:column;gap:16px">${items.map((s, i) => `<div style="display:flex;align-items:center;gap:16px"><span style="width:36px;height:36px;border-radius:50%;border:2px solid var(--${s.c || hue(i)});color:var(--${s.c || hue(i)});display:grid;place-items:center;font-family:var(--mono);font-size:16px">${i + 1}</span><span style="font-family:var(--display);font-size:26px">${s.l}</span></div>`).join('')}</div>`;

export const chips = (items, _o = {}) => `<div style="display:flex;flex-wrap:wrap;gap:10px;max-width:420px;justify-content:center">${items.map((t, i) => `<span style="font-family:var(--mono);font-size:15px;padding:8px 14px;border-radius:9px;border:1px solid var(--${hue(i)});color:var(--${hue(i)})">${t}</span>`).join('')}</div>`;

export const callout = (label, note, _o = {}) => svg(240, 150, `<rect x="20" y="40" width="130" height="66" rx="10" fill="var(--s2)" stroke="var(--line2)"/><text x="36" y="78" font-size="14" fill="var(--ink)" font-family="var(--mono)">${label}</text><path d="M150,58 L205,32" stroke="var(--warn)" stroke-width="2"/><circle cx="205" cy="32" r="5" fill="var(--warn)"/><text x="176" y="22" font-size="11" fill="var(--warn)" font-family="var(--mono)">${note}</text>`);

export const iconTile = (name, label, o = {}) => `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;color:var(--${o.c || 'brand2'})"><span style="display:flex">${icon(name, o.size || 56)}</span>${label ? `<span style="font-family:var(--mono);font-size:13px;color:var(--muted)">${label}</span>` : ''}</div>`;

export { icon, ICON_NAMES };
