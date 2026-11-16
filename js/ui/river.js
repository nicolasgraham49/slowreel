// river.js - [Slowreel upgrade] the Endless River: a generative mode that composes slow, evolving ambient inside a
// World, so Nico never has to start from a blank page. Pick a world and a mood; the River holds chords on the world's
// pad and bass tracks, walks a quiet melody on its melody track, and drops rare sparkles - all inside the tape's own
// key and scale, driven through engine.noteOn (the same door his keys use), so he can listen, play over it, and then
// Capture what it played onto the tape as ordinary clips he can edit, keep or delete.
//
// The composition never loops obviously: chords breathe for 6-18 beats (jittered), the progression rotates every four
// chords, the melody is a random walk (not a pattern), and an intensity tide (a slow sine + a random walk) keeps
// thinning and thickening the texture. Everything is scheduled from the river's own beat clock at the tape's BPM.
//
//   initRiver({ loadWorld, toast })   app.js wires the world loader and the toast in (no import cycle)
//   startRiver(worldId, moodId)       loads the world tape first if the current tape is not that world
//   stopRiver() / riverInfo()         state for the deck key and the tests
//   captureRiver()                    writes the captured notes to clips; returns how many notes were kept
//   openRiver()                       the River dialog
import { S, on, edit, uid, clamp } from './state.js?v=11';
import { h, icon } from './controls.js?v=11';
import { WORLDS, worldById, riverRoles, riverCfgFor } from './worlds.js?v=11';
import { scaleById, keyIndex } from './theory.js?v=11';

export const MOODS = [
  { id: 'calm', name: 'Calm', density: 0.55, chordMul: 1.3, vel: 0.72, regShift: 0, sparkle: 0.7, melLen: [2, 4.5] },
  { id: 'bright', name: 'Bright', density: 1.0, chordMul: 0.8, vel: 0.95, regShift: 12, sparkle: 1.9, melLen: [1, 3] },
  { id: 'dark', name: 'Dark', density: 0.62, chordMul: 1.3, vel: 0.8, regShift: -12, sparkle: 0.4, melLen: [2, 6] },
  { id: 'dreamy', name: 'Dreamy', density: 0.8, chordMul: 1.0, vel: 0.85, regShift: 0, sparkle: 1.2, melLen: [2, 5] },
];
export const moodById = id => MOODS.find(m => m.id === id) || MOODS[0];

// deterministic-per-session rng (mulberry32): a river is a performance, not a render, so each run differs
const rng32 = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

let loadWorldFn = null, toastFn = () => { };
export function initRiver({ loadWorld, toast }) { loadWorldFn = loadWorld; toastFn = toast || toastFn; }

const R = {
  on: false, worldId: null, mood: 'calm', switching: false,
  rng: rng32(1), t0: 0, nextBeat: 0, timer: null, timeouts: new Set(),
  chordIdx: 0, chordStart: 0, chordLen: 12, walk: 0, phase: 0, melDeg: 4, melFreeAt: 0,
  events: 0, captured: [], roles: [], cfg: null,
};
export const riverInfo = () => ({ running: R.on, world: R.worldId, mood: R.mood, events: R.events, captured: R.captured.length });

const spb = () => 60 / clamp(S.project?.bpm || 70, 20, 300);
const beatTime = b => R.t0 + b * spb();
function later(fn, atCtxTime) {
  const ms = Math.max(0, (atCtxTime - S.ctx.currentTime) * 1000);
  const id = setTimeout(() => { R.timeouts.delete(id); try { fn(); } catch (e) { console.warn('[river]', e); } }, ms);
  R.timeouts.add(id); return id;
}
function scaleDeg(deg, octave) {
  const steps = scaleById(S.project.scale).steps, len = steps.length, pc = keyIndex(S.project.key);
  const d = ((deg % len) + len) % len, oct = Math.floor(deg / len);
  return 12 * (octave + 1) + pc + 12 * oct + steps[d];
}
const intensityAt = b => clamp(0.52 + 0.3 * Math.sin(2 * Math.PI * b / 112 + R.phase) + R.walk, 0.12, 1);

function note(role, deg, octave, atBeat, durBeats, vel) {
  const targets = R.roles.filter(r => r.role === role); if (!targets.length) return;
  const midi = clamp(scaleDeg(deg, octave) + (role === 'melody' || role === 'sparkle' ? moodById(R.mood).regShift : 0), 24, 108);
  for (const t of targets) {
    later(() => S.engine.noteOn(t.trackId, midi, vel), beatTime(atBeat));
    later(() => S.engine.noteOff(t.trackId, midi), beatTime(atBeat + durBeats));
    R.captured.push({ trackId: t.trackId, p: midi, beat: Math.round(atBeat * 100) / 100, d: Math.round(durBeats * 100) / 100, v: Math.round(vel * 100) / 100 });
    R.events++;
  }
}

function chordAt(b) {
  const cfg = R.cfg, mood = moodById(R.mood), rng = R.rng;
  const rot = Math.floor(R.chordIdx / cfg.chords.length) % cfg.chords.length;
  const root = cfg.chords[(R.chordIdx + rot) % cfg.chords.length];
  R.chordLen = Math.max(6, Math.round(cfg.chordBeats * mood.chordMul + (rng() * 4 - 2)));
  R.chordStart = b;
  R.walk = clamp(R.walk + (rng() - 0.5) * 0.14, -0.25, 0.3);
  const I = intensityAt(b), len = R.chordLen;
  if (!S.playing) note('bed', root, cfg.reg.bass, b, len - 0.3, 0.5 * mood.vel + 0.2);   // the tape's own bed clip sounds when the transport plays
  note('bass', root, cfg.reg.bass, b, len * 0.9, 0.62 * mood.vel);
  if (rng() < 0.4) note('bass', root, cfg.reg.bass, b + len / 2, len * 0.4, 0.4 * mood.vel);
  const tones = [root, root + 2, root + 4]; if (rng() < 0.55 + I * 0.3) tones.push(root + 6);
  for (const d of tones) note('pad', d, cfg.reg.pad, b + rng() * 0.4, len - 0.4, (0.4 + I * 0.25) * mood.vel);
  R.chordIdx++;
}

function melodyAt(b) {
  const cfg = R.cfg, mood = moodById(R.mood), rng = R.rng, I = intensityAt(b);
  const steps = scaleById(S.project.scale).steps, len = steps.length;
  if (b >= R.melFreeAt - 0.25 && rng() < cfg.density * mood.density * (0.5 + I * 0.75)) {
    const step = [-2, -1, -1, 0, 1, 1, 2][Math.floor(rng() * 7)];
    R.melDeg = clamp(R.melDeg + step, 0, 2 * len - 1);
    const dur = mood.melLen[0] + rng() * (mood.melLen[1] - mood.melLen[0]);
    note('melody', R.melDeg, cfg.reg.melody, b, dur, (0.5 + I * 0.35) * mood.vel);
    let free = b + dur * 0.6 + rng() * 1.5;
    // sometimes the line answers itself: a softer note a step or two away, while the first is still ringing
    if (rng() < 0.45) {
      const deg2 = clamp(R.melDeg + (rng() < 0.5 ? -1 : 1) * (1 + Math.floor(rng() * 2)), 0, 2 * len - 1);
      if (deg2 !== R.melDeg) {
        note('melody', deg2, cfg.reg.melody, b + dur * 0.55, dur * 0.6, (0.32 + I * 0.22) * mood.vel);
        free = Math.max(free, b + dur * 0.55 + dur * 0.4);
      }
    }
    R.melFreeAt = free;
  }
  if (rng() < 0.13 * mood.sparkle * (0.4 + I)) {
    const deg = len + Math.floor(rng() * len);
    note('sparkle', deg, cfg.reg.sparkle, b, 1 + rng() * 1.5, 0.5 * mood.vel);
  }
}

function tick() {
  if (!R.on) return;
  const horizon = S.ctx.currentTime + 0.45;
  let guard = 0;
  while (R.on && beatTime(R.nextBeat) < horizon && guard++ < 64) {
    const b = R.nextBeat;
    if (b >= R.chordStart + R.chordLen || (b === 0 && R.chordIdx === 0)) chordAt(b);
    melodyAt(b);
    R.nextBeat = b + 1;
  }
}

export async function startRiver(worldId, moodId = 'calm') {
  if (!S.engine || !S.ctx) return false;
  stopRiver();
  const w = worldById(worldId); if (!w) return false;
  R.mood = moodById(moodId).id;
  if (S.project?.world !== worldId) {
    if (!loadWorldFn) return false;
    R.switching = true;
    try { await loadWorldFn(worldId); } finally { R.switching = false; }
    if (S.project?.world !== worldId) return false;
  }
  R.roles = riverRoles(S.project); R.cfg = riverCfgFor(S.project);
  if (!R.cfg || !R.roles.some(r => r.role === 'pad')) { toastFn('That world has no pad for the River to hold.'); return false; }
  R.rng = rng32((Date.now() % 2147483646) + 7);
  R.phase = R.rng() * Math.PI * 2; R.walk = 0; R.chordIdx = 0; R.chordStart = 0; R.chordLen = 8;
  R.melDeg = Math.floor(scaleById(S.project.scale).steps.length / 2); R.melFreeAt = 0.5;   // the melody finds its voice within the first two beats
  R.events = 0; R.captured = [];
  R.worldId = worldId; R.t0 = S.ctx.currentTime + 0.15; R.nextBeat = 0; R.on = true;
  if (S.ctx.state !== 'running') S.ctx.resume();
  R.timer = setInterval(tick, 110); tick();
  syncDeckKey();
  toastFn(`The River is flowing in ${w.title} (${moodById(R.mood).name}). Play over it, or just listen.`);
  return true;
}

export function stopRiver() {
  if (R.timer) { clearInterval(R.timer); R.timer = null; }
  for (const id of R.timeouts) clearTimeout(id); R.timeouts.clear();
  const was = R.on; R.on = false;
  if (was) { try { S.engine?.allNotesOff(); } catch (e) { } }
  syncDeckKey();
  return was;
}

function syncDeckKey() {
  const b = document.getElementById('b-river'); if (!b) return;
  b.setAttribute('aria-pressed', String(R.on)); b.classList.toggle('lit-on', R.on);
}

// The tape changed under the River (another project opened): stop, unless we are the ones loading the world.
on('project', () => { if (R.on && !R.switching) stopRiver(); });

/** Write everything the River played since the last capture onto the tape, as clips named "River · <track>". */
export function captureRiver() {
  if (!R.captured.length || !S.project) return 0;
  const byTrack = new Map();
  for (const n of R.captured) { if (!byTrack.has(n.trackId)) byTrack.set(n.trackId, []); byTrack.get(n.trackId).push(n); }
  const B = S.project.beatsPerBar || 4;
  const batchStart = Math.min(...R.captured.map(n => n.beat));   // each capture is its own clip: beats are relative to it
  let kept = 0, maxEnd = 0;
  const plan = [];
  for (const [trackId, notes] of byTrack) {
    const t = S.project.tracks.find(x => x.id === trackId); if (!t) continue;
    const startAt = Math.max(0, ...t.clips.filter(c => /^River/.test(c.name || '')).map(c => c.startBeat + c.lengthBeats));
    const end = Math.max(...notes.map(n => n.beat + n.d)) - batchStart;
    const clip = { id: uid('c'), name: `River · ${t.name}`, startBeat: startAt, lengthBeats: Math.max(B, Math.ceil((end + 0.05) / B) * B),
      notes: notes.map(n => ({ p: n.p, s: Math.round((n.beat - batchStart) * 100) / 100, d: n.d, v: n.v })) };
    plan.push({ trackId, clip }); kept += notes.length; maxEnd = Math.max(maxEnd, startAt + clip.lengthBeats);
  }
  if (!plan.length) { R.captured = []; return 0; }
  edit(p => {
    for (const { trackId, clip } of plan) p.tracks.find(x => x.id === trackId)?.clips.push(clip);
    const need = Math.ceil(maxEnd / B); if (need > p.lengthBars) p.lengthBars = need;
  }, { type: 'all' });
  R.captured = [];
  toastFn(`Captured ${kept} notes from the River onto the tape. They are yours now - edit or delete them like any clip.`);
  return kept;
}

// ---------------------------------------------------------------- the dialog
let open = null, uiTimer = null;
export const isRiverOpen = () => !!open;
export function closeRiver() { open?.close(); }

export function openRiver() {
  closeRiver();
  const last = document.activeElement;
  let worldSel = S.project?.world && worldById(S.project.world) ? S.project.world : (R.worldId || 'ocean');
  let moodSel = R.mood || 'calm';
  const status = h('p', { class: 'rv-status', id: 'rv-status', role: 'status' });
  const capBtn = h('button', { class: 'key', id: 'rv-capture', onclick: () => { captureRiver(); refresh(); } }, 'Capture to tape');
  const toggleBtn = h('button', { class: 'key signal', id: 'rv-toggle' });
  const worldChips = h('div', { class: 'rv-chips', role: 'group', 'aria-label': 'World' },
    ...WORLDS.map(w => h('button', { class: 'key sm rv-chip', id: `rv-w-${w.id}`, style: { '--rc': w.accent }, 'aria-pressed': String(w.id === worldSel),
      onclick: () => { worldSel = w.id; refresh(); } }, w.title)));
  const moodChips = h('div', { class: 'rv-chips', role: 'group', 'aria-label': 'Mood' },
    ...MOODS.map(m => h('button', { class: 'key sm rv-chip', id: `rv-m-${m.id}`, 'aria-pressed': String(m.id === moodSel),
      onclick: () => { moodSel = m.id; refresh(); } }, m.name)));
  toggleBtn.onclick = async () => {
    toggleBtn.disabled = true;
    try { if (R.on) { stopRiver(); toastFn('The River rests. Capture keeps what it played.'); } else await startRiver(worldSel, moodSel); }
    finally { toggleBtn.disabled = false; refresh(); }
  };
  function refresh() {
    worldChips.querySelectorAll('.rv-chip').forEach(c => c.setAttribute('aria-pressed', String(c.id === `rv-w-${worldSel}`)));
    moodChips.querySelectorAll('.rv-chip').forEach(c => c.setAttribute('aria-pressed', String(c.id === `rv-m-${moodSel}`)));
    const w = worldById(R.on ? R.worldId : worldSel);
    toggleBtn.textContent = R.on ? 'Stop the River' : 'Start the River';
    capBtn.disabled = !R.captured.length;
    capBtn.textContent = R.captured.length ? `Capture to tape (${R.captured.length} notes)` : 'Capture to tape';
    status.textContent = R.on
      ? `Flowing in ${w.title}, ${moodById(R.mood).name.toLowerCase()} - ${R.events} notes played so far, ${R.captured.length} waiting to capture.`
      : `The River will open the ${w.title} world and compose inside it. Your current tape is saved first.`;
  }
  const closeBtn = h('button', { class: 'key sm sq', id: 'rv-close', 'aria-label': 'Close' }, icon('close'));
  const dialog = h('div', { class: 'dialog st-dialog rv-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'rv-title' },
    h('header', {}, h('h2', { id: 'rv-title', text: 'Endless River' }), closeBtn),
    h('div', { class: 'dbody' },
      h('p', { text: 'Pick a world and a mood. The River composes slowly inside it - chords that breathe, a melody that wanders, sparkles now and then - and it never repeats the same way twice. Play over it on your keys whenever you like.' }),
      h('div', { class: 'st-head' }, h('span', { class: 'label', text: 'World' }), worldChips),
      h('div', { class: 'st-head' }, h('span', { class: 'label', text: 'Mood' }), moodChips),
      status),
    h('footer', {}, capBtn, h('span', { class: 'grow' }),
      h('button', { class: 'key', id: 'rv-done', text: 'Close', onclick: () => close() }), toggleBtn));
  const scrim = h('div', { class: 'scrim rv-scrim' }, dialog);
  closeBtn.onclick = () => close();
  scrim.addEventListener('pointerdown', e => { if (e.target === scrim) close(); });
  scrim.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
  scrim.addEventListener('keyup', e => e.stopPropagation());
  function close(restore = true) {
    if (!scrim.isConnected) return; scrim.remove(); open = null;
    if (uiTimer) { clearInterval(uiTimer); uiTimer = null; }
    if (restore) last?.focus?.();
  }
  document.body.append(scrim);
  open = { close };
  refresh();
  uiTimer = setInterval(() => { if (open) refresh(); }, 600);
  toggleBtn.focus();
  return { close, element: scrim };
}
