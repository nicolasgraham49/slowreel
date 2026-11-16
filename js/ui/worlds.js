// worlds.js - [Slowreel upgrade] Worlds: one-click COMPLETE sound worlds, and the data the Endless River composes from.
// A style starter (starters.js) sets a tape up empty and lets Nico play every note. A World goes further: it is a whole
// sound - instruments and presets chosen together, per-track effect chains, both buses voiced for the place, the mix
// already done (every track is mixManual, so Auto mix leaves a World's mix exactly as it was made), a held bed where a
// texture needs one, and a guide. Loading a World leaves Nico one click from making music: press play on the keys, or
// open the River and let it compose in the world with him.
//
//   WORLDS / worldById(id)             the six worlds
//   worldProject(world, base)          a ready-to-open project (base = { instruments, buses, colors, uid })
//   openWorlds({ onPick })             the chooser dialog; onPick(world)
//   worldGuideFor(project, scaleName)  a recipe-shaped guide for recipes-panel openTips
//   riverRoles(project)                [{trackId, role}] for the River, from the project's world
import { h, icon } from './controls.js?v=11';

const fx = (id, params) => ({ id, params, bypass: false });
const room = (type, o = {}) => ({ type, mix: 1, size: 1.4, tone: 0.45, preDelay: 0.03, shimmer: 0, ...o });
const echoBus = (o = {}) => ({ beats: 0.75, feedback: 0.6, tone: 0.4, wow: 0.4, drive: 0.2, spread: 0.7, mix: 1, ...o });

// ---------------------------------------------------------------- the six worlds
// Track spec: { name, inst, preset, params?, vol, pan?, space, echo?, fx?, bed? (one held midi note), river? (role) }
// River roles: 'bed' | 'bass' | 'pad' | 'melody' | 'sparkle' (see river.js). riverCfg: chords = scale-degree roots,
// chordBeats = how long a chord breathes, reg = octave of each role's home note, density = how busy the melody is.
export const WORLDS = [
  {
    id: 'deep-space', title: 'Deep Space', sub: 'dark drone · the void', accent: '#6E6EE8',
    line: 'A sub drone from the dark, a pad like a slow current, and signals from very far away. Nothing hurries out here.',
    bpm: 48, key: 'C', scale: 'minor', scaleName: 'Minor', bars: 32, atmosphere: 0.62, spaceDb: 2,
    spaceFx: fx('reverb', room('infinite', { size: 2, tone: 0.3, preDelay: 0.06, shimmer: 0.12 })),
    echoFx: fx('echo', echoBus({ beats: 1.5, feedback: 0.72, tone: 0.3, wow: 0.5, drive: 0.2, spread: 0.8 })),
    tracks: [
      { name: 'Void', inst: 'voiddrone', preset: 'event-horizon', vol: -9, space: 0.3, echo: 0.1, bed: 36, river: 'bed' },
      { name: 'Dark current', inst: 'abysspad', preset: 'dark-current', vol: -10, pan: 0.1, space: 0.55, echo: 0.15, river: 'pad' },
      { name: 'Far signals', inst: 'musicbox', preset: 'celesta-dust', vol: -13, pan: -0.2, space: 0.7, echo: 0.35, river: 'melody' },
      { name: 'Ship tone', inst: 'texture', preset: 'room-tone', params: { tone: 0.25, motion: 0.2, density: 0.3 }, vol: -20, space: 0.1, bed: 60, river: 'bed' },
    ],
    riverCfg: { chords: [0, 5, 3, 4], chordBeats: 16, reg: { bass: 2, pad: 3, melody: 4, sparkle: 5 }, density: 0.45 },
    tips: [
      'Out here, one note is an event. Hold the Void (any low key) and just listen to the room for a whole minute before you add anything.',
      'Far signals is a music box heard across the dark: play two or three notes, then let the echo answer them. The gaps are the music.',
      'The Dark current pad moves on its own (the Current knob). Hold two keys a third apart and let it drift under you.',
      'C minor is all around the home keys: stay near C, D# and G (keys A, E and T on the bottom row) and it stays deep.',
      'River: press River on the deck, pick Deep Space and Dark, and it will hold this world open for you while you listen or play over it.',
    ],
  },
  {
    id: 'bright-shimmer', title: 'Bright Shimmer', sub: 'light on water', accent: '#E8B34B',
    line: 'Glass bells, an angel pad and a music box, all ringing into a room that shines back.',
    bpm: 72, key: 'D', scale: 'lydian', scaleName: 'Lydian', bars: 32, atmosphere: 0.5, spaceDb: 0,
    spaceFx: fx('shimmer', room('hall', { size: 1.6, tone: 0.62, shimmer: 0.65 })),
    echoFx: fx('echo', echoBus({ beats: 0.5, feedback: 0.5, tone: 0.55, wow: 0.25, drive: 0.15 })),
    tracks: [
      { name: 'Glass keys', inst: 'glasskeys', preset: 'sun-bells', vol: -8, pan: -0.12, space: 0.5, echo: 0.25, river: 'melody' },
      { name: 'Angel pad', inst: 'angelpad', preset: 'angel-ooh', vol: -10, pan: 0.08, space: 0.6, echo: 0.1, river: 'pad' },
      { name: 'Music box', inst: 'musicbox', preset: 'music-box', vol: -11, pan: 0.18, space: 0.55, echo: 0.3, river: 'sparkle' },
      { name: 'Warm pad', inst: 'tapepad', preset: 'warm-pad', vol: -12, pan: -0.05, space: 0.5, echo: 0.06, river: 'pad' },
    ],
    riverCfg: { chords: [0, 4, 5, 3], chordBeats: 8, reg: { bass: 2, pad: 3, melody: 4, sparkle: 5 }, density: 0.55 },
    tips: [
      'Lydian is major with the fourth note raised - it is the sound of light lifting. In D, the scale lock keeps you there; wander freely.',
      'Glass keys ring for a long time (the Ring knob). Play one note, wait for the shimmer to bloom above it, then play the next.',
      'The Angel pad swells slowly, so hold chords for two bars or more and let it arrive. Quick changes choke it.',
      'Music box is the sparkle on top: a few high notes per phrase is plenty. If everything rings at once, it turns to fog.',
      'River: Bright Shimmer + Bright is the happiest water in Slowreel. Capture what it plays and keep the phrases you love.',
    ],
  },
  {
    id: 'underwater', title: 'Underwater', sub: 'blue and slow', accent: '#2FA8A0',
    line: 'Drops on dark water, a pad like a current, the deep root below - and one of your own songs drifting underneath it all.',
    bpm: 54, key: 'F', scale: 'dorian', scaleName: 'Dorian', bars: 32, atmosphere: 0.58, spaceDb: 1,
    spaceFx: fx('reverb', room('hall', { size: 1.9, tone: 0.28, preDelay: 0.05, shimmer: 0.05 })),
    echoFx: fx('echo', echoBus({ beats: 0.75, feedback: 0.66, tone: 0.3, wow: 0.6, drive: 0.2, spread: 0.6 })),
    tracks: [
      { name: 'Kelp drift', inst: 'abysspad', preset: 'kelp-drift', vol: -10, space: 0.5, echo: 0.1, river: 'pad',
        fx: [fx('autofilter', { mode: 'lowpass', rate: '16', cutoff: 900, depth: 0.5, resonance: 1.2, shape: 'sine' })] },
      { name: 'Drops', inst: 'droplet', preset: 'rain-on-water', vol: -8, pan: 0.15, space: 0.45, echo: 0.3, river: 'melody',
        fx: [fx('chorus', { rate: 0.3, depth: 0.5, mix: 0.4 })] },
      { name: 'Deep root', inst: 'drone', preset: 'warm-sub', vol: -11, space: 0.2, river: 'bass' },
      { name: 'Sleepy Rain cloud', inst: 'cloud', preset: 'slow-bloom', vol: -13, space: 0.4, bed: 53,
        params: { song: 'sleepy-rain', position: 0.2, size: 0.7, density: 6, spray: 0.2, scan: 0.05, tone: 0.4, attack: 3.5 } },
    ],
    riverCfg: { chords: [0, 2, 5, 3], chordBeats: 12, reg: { bass: 2, pad: 3, melody: 4, sparkle: 5 }, density: 0.5 },
    tips: [
      'The Drops fall in pitch as they sound - that falling blip is the whole instrument. Short notes, lots of space between them.',
      'Under the Drops, your own "Sleepy Rain" is drifting as a cloud (the last track). It is already playing on the held note; press play and listen for yourself inside the water.',
      'Kelp drift has an Auto Filter breathing over 4 bars, so the pad opens and closes like light through water. Hold long chords and ride it.',
      'Dorian in F is minor with a lifted sixth - hopeful under the surface. F, G, A and C (keys F, G, H, K) are always safe.',
      'River: Underwater + Dreamy is the slowest river there is. Start it, close your eyes, play one drop at a time over it.',
    ],
  },
  {
    id: 'warm-dust', title: 'Warm Dust', sub: 'dusty lo-fi', accent: '#D08A4E',
    line: 'A porch Rhodes, a worn upright and vinyl crackle under everything. A little worn, all warm.',
    bpm: 66, key: 'A', scale: 'minor', scaleName: 'Minor', bars: 32, atmosphere: 0.66, spaceDb: -1,
    spaceFx: fx('reverb', room('room', { size: 0.9, tone: 0.42, preDelay: 0.015 })),
    echoFx: fx('echo', echoBus({ beats: 0.375, feedback: 0.4, tone: 0.35, wow: 0.55, drive: 0.35, spread: 0.4 })),
    tracks: [
      { name: 'Porch keys', inst: 'dustkeys', preset: 'porch-rhodes', vol: -7, space: 0.3, echo: 0.18, river: 'pad',
        fx: [fx('tape', { drive: 0.35, age: 0.5, wow: 0.4, flutter: 0.3, hiss: 0.12 })] },
      { name: 'Worn upright', inst: 'felt', preset: 'worn-upright', vol: -8, pan: 0.12, space: 0.35, echo: 0.2, river: 'melody' },
      { name: 'Harp', inst: 'pluck', preset: 'cassette-harp', vol: -11, pan: -0.18, space: 0.4, echo: 0.25, river: 'sparkle' },
      { name: 'Crackle', inst: 'texture', preset: 'vinyl-crackle', vol: -15, space: 0.05, bed: 60, river: 'bed' },
    ],
    riverCfg: { chords: [0, 3, 5, 4], chordBeats: 8, reg: { bass: 2, pad: 3, melody: 3, sparkle: 4 }, density: 0.6 },
    tips: [
      'This is your Øneheart / Antent warmth, worn in: the Porch keys already have cassette and tremolo on them. Play chords low and slow.',
      'The Worn upright is detuned on purpose (the Worn knob). If a note feels like it leans, that is the sound - lean with it.',
      'Chords first, melody second: hold a Porch keys chord for two bars, then answer it with two or three upright notes.',
      'A minor home notes: A, C and E (keys A, D and G). End phrases on A and it feels like sitting down on the porch.',
      'River: Warm Dust + Calm writes the kind of chords you can hum over. Capture a few bars and play the melody yourself.',
    ],
  },
  {
    id: 'forest', title: 'Forest', sub: 'green light', accent: '#79B264',
    line: 'Leaves overhead and birds somewhere inside them, a koto like light through branches, chimes when the wind moves.',
    bpm: 58, key: 'G', scale: 'major-penta', scaleName: 'Major pentatonic', bars: 32, atmosphere: 0.5, spaceDb: 0,
    spaceFx: fx('reverb', room('hall', { size: 1.45, tone: 0.5, preDelay: 0.03, shimmer: 0.06 })),
    tracks: [
      { name: 'Canopy', inst: 'canopy', preset: 'morning-leaves', vol: -11, space: 0.2, bed: 60, river: 'bed' },
      { name: 'Koto', inst: 'koto', preset: 'oshide-koto', vol: -7, pan: -0.12, space: 0.4, echo: 0.18, river: 'melody' },
      { name: 'Breath', inst: 'shakuhachi', preset: 'honkyoku', vol: -10, pan: 0.15, space: 0.5, echo: 0.08, river: 'pad' },
      { name: 'Chimes', inst: 'windchimes', preset: 'glass-furin', vol: -13, space: 0.55, echo: 0.1, river: 'sparkle' },
    ],
    riverCfg: { chords: [0, 3, 4, 1], chordBeats: 12, reg: { bass: 2, pad: 3, melody: 4, sparkle: 5 }, density: 0.5 },
    tips: [
      'The Canopy is already alive: leaves, wind, and birds that sing on their own while the note is held (Birds knob, Sound tab).',
      'Major pentatonic in G cannot clash - five notes, all friends. On the Koto, run a finger across them and hold the last one.',
      'The shakuhachi Breath is the slow voice: one long note, then silence while the forest answers. Ma - the silence is part of it.',
      'Tap the Chimes track and press a key now and then: a gust moves through, then it settles. Rare is right.',
      'River: Forest + Calm is a walk, not a song. Let it wander, and play the Koto when a clearing opens.',
    ],
  },
  {
    id: 'ocean', title: 'Ocean', sub: 'salt and light', accent: '#4E9BD8',
    line: 'Waves under everything, a choir like morning on the water, harp notes like spray.',
    bpm: 60, key: 'E', scale: 'major', scaleName: 'Major', bars: 32, atmosphere: 0.55, spaceDb: 1,
    spaceFx: fx('shimmer', room('hall', { size: 1.7, tone: 0.5, preDelay: 0.035, shimmer: 0.32 })),
    echoFx: fx('echo', echoBus({ beats: 0.75, feedback: 0.6, tone: 0.45, wow: 0.4, drive: 0.2, spread: 0.75 })),
    tracks: [
      { name: 'Waves', inst: 'texture', preset: 'ocean', params: { tone: 0.45, motion: 0.7, density: 0.55 }, vol: -12, space: 0.15, bed: 60, river: 'bed' },
      { name: 'Choir', inst: 'tapepad', preset: 'dusty-choir', vol: -10, space: 0.55, echo: 0.1, river: 'pad' },
      { name: 'Harp', inst: 'pluck', preset: 'cassette-harp', vol: -8, pan: -0.1, space: 0.45, echo: 0.22, river: 'melody' },
      { name: 'Pools', inst: 'droplet', preset: 'tide-pools', vol: -12, pan: 0.2, space: 0.5, echo: 0.3, river: 'sparkle' },
    ],
    riverCfg: { chords: [0, 5, 3, 4], chordBeats: 12, reg: { bass: 2, pad: 3, melody: 4, sparkle: 5 }, density: 0.55 },
    tips: [
      'The Waves never stop (Motion knob = how big the swell is). Everything you play floats on them, so play less than you think.',
      'The Choir wants long holds: two or three keys together for a whole swell, then move one finger. That is the tide turning.',
      'Harp notes are spray: short, bright, gone. One per wave is enough.',
      'E major home notes: E, G# and B (keys D, T and J). Come back to E when a phrase should rest.',
      'River: Ocean + Dreamy at dusk is the whole reason the River exists. Start it and just be on the shore a while.',
    ],
  },
];
export const worldById = id => WORLDS.find(w => w.id === id) || null;

// ---------------------------------------------------------------- project
const base0 = () => ({ schema: 'nfx-studio/1', beatsPerBar: 4, createdAt: Date.now(), updatedAt: Date.now() });
const newId = () => 'p-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const ALL_MANUAL = () => ({ volumeDb: true, pan: true, space: true, echo: true, lowcut: true, room: true });

export function worldProject(w, { instruments, buses, colors, uid }) {
  const B = 4, len = w.bars * B;
  const tracks = w.tracks.map((o, i) => {
    const def = instruments.find(d => d.id === o.inst) || instruments[0];
    const preset = def.presets.some(p => p.id === o.preset) ? o.preset : def.presets[0]?.id || '';
    const t = { id: uid('t'), name: o.name, color: colors[i % colors.length], kind: 'instrument', instrument: { id: def.id, preset, params: { ...(o.params || {}) } },
      volumeDb: o.vol ?? -8, pan: o.pan ?? 0, mute: false, solo: false, sends: { space: o.space ?? 0.4, echo: o.echo ?? 0 }, fx: JSON.parse(JSON.stringify(o.fx || [])),
      mixManual: ALL_MANUAL(), clips: [] };
    if (o.river) t.river = o.river;   // the Endless River's role for this track (view/composition data, ignored by the engine)
    // a texture / cloud only sounds while a note is held: one long held note under the whole tape (a bed, not music)
    if (o.bed) t.clips.push({ id: uid('c'), name: o.name, startBeat: 0, lengthBeats: len, notes: [{ p: o.bed, s: 0, d: len - 0.5, v: 0.5 }] });
    return t;
  });
  const b = JSON.parse(JSON.stringify(buses));
  b.space = { ...(b.space || {}), returnDb: w.spaceDb ?? 0, manual: true, fx: [JSON.parse(JSON.stringify(w.spaceFx))] };
  if (w.echoFx) b.echo = { ...(b.echo || {}), returnDb: w.echoDb ?? 0, fx: [JSON.parse(JSON.stringify(w.echoFx))] };
  return { ...base0(), id: newId(), name: `${w.title} tape`, world: w.id, autoMix: { on: false }, bpm: w.bpm, key: w.key, scale: w.scale, lengthBars: w.bars,
    loop: { on: false, startBeat: 0, endBeat: 4 * B }, tracks, buses: b, master: { volumeDb: -2, atmosphere: w.atmosphere ?? 0.5, fx: [] } };
}

/** The guide for a world tape, shaped like a recipe for recipes-panel openTips. */
export function worldGuideFor(p, scaleName = s => s) {
  const w = worldById(p?.world); if (!w) return null;
  return { id: 'guide-world-' + w.id, title: `${w.title} · world guide`, region: 'worlds', bpm: p.bpm, key: p.key, scale: p.scale,
    scaleName: p.key === w.key && p.scale === w.scale ? w.scaleName : scaleName(p.scale),
    project: { lengthBars: p.lengthBars, beatsPerBar: p.beatsPerBar || 4 },
    steps: [...w.tips, 'Every track in a world is mixed by hand and marked manual, so Auto mix leaves it alone. Turn any knob and it stays yours.'] };
}

/** [{trackId, role}] the River can compose on, from a world project's tracks. */
export function riverRoles(p) {
  const w = worldById(p?.world); if (!w) return [];
  return (p.tracks || []).filter(t => t.river && t.kind === 'instrument').map(t => ({ trackId: t.id, role: t.river, name: t.name }));
}
export const riverCfgFor = p => worldById(p?.world)?.riverCfg || null;

// ---------------------------------------------------------------- the chooser
let open = null;
export const isWorldsOpen = () => !!open;
export function closeWorlds() { open?.close(); }

export function openWorlds({ onPick }) {
  closeWorlds();
  const last = document.activeElement;
  let busy = false;
  const pick = async (w, btn) => {
    if (busy) return; busy = true; btn.setAttribute('aria-busy', 'true');
    try { await onPick(w); close(false); } catch (e) { console.warn('[slowreel] world', e); busy = false; btn.removeAttribute('aria-busy'); }
  };
  const cards = WORLDS.map(w => h('button', { class: 'key st-card wd-card', id: `wd-${w.id}`, style: { '--rc': w.accent }, onclick: e => pick(w, e.currentTarget) },
    h('span', { class: 'st-strip' }),
    h('span', { class: 'st-name' }, h('strong', { text: w.title }), h('span', { class: 'st-sub', text: w.sub })),
    h('span', { class: 'st-line', text: w.line }),
    h('span', { class: 'glass st-meta mono', text: `${w.bpm} BPM · ${w.key} ${w.scaleName}` }),
    h('span', { class: 'st-tracks', text: w.tracks.map(t => t.name).join(' · ') })));
  const closeBtn = h('button', { class: 'key sm sq', id: 'wd-close', 'aria-label': 'Close' }, icon('close'));
  const dialog = h('div', { class: 'dialog st-dialog wd-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'wd-title' },
    h('header', {}, h('h2', { id: 'wd-title', text: 'Worlds' }), closeBtn),
    h('div', { class: 'dbody' },
      h('div', { class: 'st-head' }, h('span', { class: 'label', text: 'A whole sound, one click' }),
        h('p', { text: 'Each world is set up and mixed for you: instruments, effects, the room, the key. It opens as a new tape (the one you are on is saved first). Play it on your keys - or open the River and let it compose in the world with you.' })),
      h('div', { class: 'st-grid' }, cards)),
    h('footer', {}, h('button', { class: 'key', id: 'wd-cancel', text: 'Cancel', onclick: () => close() })));
  const scrim = h('div', { class: 'scrim wd-scrim' }, dialog);
  closeBtn.onclick = () => close();
  scrim.addEventListener('pointerdown', e => { if (e.target === scrim && !busy) close(); });
  scrim.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Escape' && !busy) { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') {
      const f = [...dialog.querySelectorAll('button:not([disabled])')]; const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });
  scrim.addEventListener('keyup', e => e.stopPropagation());
  function close(restore = true) { if (!scrim.isConnected) return; scrim.remove(); open = null; if (restore) last?.focus?.(); }
  document.body.append(scrim);
  open = { close };
  cards[0]?.focus();
  return { close, element: scrim };
}
