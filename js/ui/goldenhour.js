// goldenhour.js - [Slowreel redesign PREVIEW] GOLDEN HOUR: The Listening Room, Played In.
// A presentation layer over the living app: builds the Room (the opening view) and wires
// every control in it to the app's REAL controls and hooks (transport buttons, the
// key-on/key-off bus, window.__studio river/worlds). No engine or state changes.
// Under automated test drivers the Room starts dismissed so the engine suite can
// click through the studio unobstructed; it is one tap away on the return handle.
import { S, emit, on, track } from './state.js?v=11';
import { scaleRun, noteName } from './theory.js?v=11';

const $ = id => document.getElementById(id);
const AUTOMATED = (() => { try { return navigator.webdriver === true; } catch { return false; } })();

const TAB_SUBS = { notes: 'piano roll', sound: 'what it is made of', fx: 'the chain', mix: 'levels & space', keys: 'play it', beats: 'steps & grooves' };

let room, windowSlot, windowHome = null, parked = null, dismissed = false, riverTouched = false, pollTimer = null;
// The app drives two deck visuals: the desktop deck window, and the pocket deck under
// its 760px breakpoint (its idle draw routes there). The Room hosts whichever is live.
const phoneMQ = window.matchMedia('(max-width: 760px)');
function pickDeck() { return phoneMQ.matches ? document.querySelector('.module.ph-window') : document.querySelector('.module.window'); }
function parkDeck() {
  const d = pickDeck(); if (!d) return;
  if (parked && parked !== d) unparkDeck();
  if (!windowHome || windowHome.el !== d) windowHome = { el: d, parent: d.parentNode, next: d.nextSibling };
  parked = d; windowSlot.append(d);
}
function unparkDeck() {
  if (!parked || !windowHome) return;
  if (windowHome.next && windowHome.next.parentNode === windowHome.parent) windowHome.parent.insertBefore(parked, windowHome.next);
  else windowHome.parent.append(parked);
  parked = null;
}

function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ------------------------------------------------------------------ the Room
function buildRoom() {
  room = el('div'); room.id = 'gh-room';
  room.innerHTML = `
    <div class="gh-top">
      <div class="gh-wordmark"><svg aria-hidden="true"><use href="#i-fox"/></svg>Slowreel</div>
      <div class="gh-tapebox">
        <div class="gh-tapename" id="gh-tapename">Morning Tape</div>
        <div class="gh-saved" id="gh-saved"><i></i>Saved</div>
      </div>
    </div>
    <div class="gh-deck">
      <div class="gh-window" id="gh-window-slot"></div>
      <div class="gh-inscription"><span class="gh-world" id="gh-world-line">Your tape, where you left it.</span><span class="gh-mono" id="gh-facts"></span></div>
    </div>
    <div class="gh-transport">
      <button class="gh-tbtn" id="gh-return" aria-label="Return to start">↩</button>
      <button class="gh-tbtn" id="gh-play" aria-label="Play or pause">▶</button>
      <button class="gh-tbtn" id="gh-loop" aria-label="Loop" aria-pressed="false">⟳</button>
    </div>
    <p class="gh-invite" id="gh-invite">Let the River play, or sit down and play yourself.</p>
    <div class="gh-nowline" id="gh-nowline"></div>
    <div class="gh-keys-wrap">
      <div class="gh-voice" id="gh-voice">— touch a key</div>
      <div class="gh-keys" id="gh-keys"></div>
      <div class="gh-actions">
        <button class="gh-pill primary" id="gh-letitplay">▶ Let it play — the Endless River</button>
        <button class="gh-pill" id="gh-capture" hidden>Capture this</button>
        <button class="gh-pill" id="gh-fullkeys">Full keys ⌄</button>
      </div>
    </div>
    <nav class="gh-doors" aria-label="Doorways">
      <button class="gh-door" data-door="worlds">Worlds<span>change the light</span></button>
      <button class="gh-door" data-door="tapes">Your tapes<span>projects &amp; beginnings</span></button>
      <button class="gh-door" data-door="songs">Your songs<span>nico's tapes &amp; clouds</span></button>
      <button class="gh-door" data-door="workbench">The workbench<span>arrange &amp; shape</span></button>
      <button class="gh-door" data-door="finish">Finish<span>tape · stems · film</span></button>
      <button class="gh-door" data-door="index">Where things live<span>every feature, one list</span></button>
    </nav>
    <div class="gh-firstlight">
      <div class="gh-fl-name">First Light</div>
      <p>A neoclassical room, being prepared — a felt piano, strings breathing under it, and a room that listens back. The seventh light arrives when its instruments are ready; Warm Dust with the felt piano forward is the bridge until then.</p>
    </div>`;
  document.body.append(room);
  windowSlot = $('gh-window-slot');

  // park the REAL deck visual inside the Room's deck
  parkDeck();

  $('gh-play').onclick = () => $('t-play')?.click();
  $('gh-return').onclick = () => $('t-return')?.click();
  $('gh-loop').onclick = () => $('t-loop')?.click();
  $('gh-letitplay').onclick = toggleRiver;
  $('gh-capture').onclick = () => { try { window.__studio?.river.capture(); } catch { } setTimeout(refresh, 350); };
  $('gh-fullkeys').onclick = () => { dismissRoom(); window.__studio?.gotoTab?.('keys'); };
  room.querySelectorAll('.gh-door').forEach(b => b.onclick = () => door(b.dataset.door));
  buildKeys();
}

function buildKeys() {
  const wrap = $('gh-keys'); if (!wrap || !S.project) return;
  wrap.textContent = '';
  const notes = scaleRun(S.project.key, S.project.scale, 4, 8);
  const t = track();
  const voice = $('gh-voice');
  if (voice) voice.innerHTML = t ? `<b>${esc(t.name)}</b> — touch a key` : 'Pick an instrument track in the workbench — touch a key';
  notes.forEach((m, i) => {
    const b = el('button', 'gh-key' + (i === 0 ? ' root' : ''), esc(noteName(m)));
    b.setAttribute('aria-label', `Play ${noteName(m)}`);
    const down = e => {
      e.preventDefault();
      try { if (S.ctx?.state !== 'running') S.ctx.resume(); } catch { }
      b.classList.add('down');
      emit('key-on', m);
      if (!riverTouched) { riverTouched = true; startRiverQuiet(); }
      b.setPointerCapture?.(e.pointerId);
    };
    const up = () => { b.classList.remove('down'); emit('key-off', m); };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('lostpointercapture', up);
    wrap.append(b);
  });
}

async function startRiverQuiet() {
  try {
    const info = window.__studio?.river.info();
    if (info && !info.running) await window.__studio.river.start(S.project?.world || 'ocean', 'dreamy');
  } catch { }
  setTimeout(refresh, 400);
}

async function toggleRiver() {
  try {
    const info = window.__studio?.river.info();
    if (info?.running) window.__studio.river.stop();
    else await window.__studio.river.start(S.project?.world || 'ocean', 'dreamy');
  } catch { }
  setTimeout(refresh, 400);
}

// ------------------------------------------------------------------ doors
function dismissRoom() {
  if (dismissed) return; dismissed = true;
  room.classList.add('gh-off');
  unparkDeck();
  $('gh-return-handle').hidden = false;
  try { window.dispatchEvent(new Event('resize')); } catch { }
}
function showRoom() {
  if (!dismissed) return; dismissed = false;
  room.classList.remove('gh-off');
  parkDeck();
  $('gh-return-handle').hidden = true;
  try { window.dispatchEvent(new Event('resize')); } catch { }
  buildKeys();
}

function pulseTapes() {
  const t = document.querySelector('.module.tapes');
  if (!t) return;
  t.style.transition = 'box-shadow .3s'; t.style.boxShadow = '0 0 0 2px var(--gh-gold), 0 0 26px -2px rgba(232,163,76,.8)';
  setTimeout(() => { t.style.boxShadow = ''; }, 1400);
}

function door(name) {
  closeSheets();
  if (name === 'workbench') { dismissRoom(); return; }
  if (name === 'worlds') { dismissRoom(); $('b-worlds')?.click(); return; }
  if (name === 'tapes') { dismissRoom(); $('proj-btn')?.click(); return; }
  if (name === 'songs') { dismissRoom(); pulseTapes(); return; }
  if (name === 'finish') { openFinish(); return; }
  if (name === 'index') { openIndex(); return; }
}

// ------------------------------------------------------------------ sheets
let indexSheet, finishSheet;
function sheetBase(id, title, lede) {
  const s = el('div', 'gh-sheet'); s.id = id; s.hidden = true;
  s.innerHTML = `<div class="gh-card"><button class="gh-pill gh-close" data-close>Close</button><h2>${esc(title)}</h2><p class="gh-lede">${esc(lede)}</p><div class="gh-sheet-body"></div></div>`;
  s.querySelector('[data-close]').onclick = closeSheets;
  s.addEventListener('click', e => { if (e.target === s) closeSheets(); });
  document.body.append(s);
  return s;
}
function closeSheets() { if (indexSheet) indexSheet.hidden = true; if (finishSheet) finishSheet.hidden = true; }

const INDEX = [
  ['Worlds — the six lights', 'Room → Worlds · or the Worlds key in the mantel', () => door('worlds')],
  ['Endless River & Capture', 'Room → Let it play · Capture appears here while it flows', () => { closeSheets(); showRoom(); }],
  ['Play — keys, pads, chords', 'Room keys · full surface: Workbench → Keys', () => { dismissRoom(); window.__studio?.gotoTab?.('keys'); }],
  ['Notes — the piano roll', 'Workbench → Notes tab · or double-click any clip', () => { dismissRoom(); window.__studio?.gotoTab?.('notes'); }],
  ['Sound — instruments & cartridges', 'Workbench → Sound tab · tap a track to summon it', () => { dismissRoom(); window.__studio?.gotoTab?.('sound'); }],
  ['Song Cloud & Sampler', 'Workbench → Sound tab, on a cloud / sampler track', () => { dismissRoom(); window.__studio?.gotoTab?.('sound'); }],
  ['Effects — the chain', 'Workbench → Effects tab', () => { dismissRoom(); window.__studio?.gotoTab?.('fx'); }],
  ['Mixer — levels, space, echo', 'Workbench → Mixer tab', () => { dismissRoom(); window.__studio?.gotoTab?.('mix'); }],
  ['Beats, grooves & rhythm', 'Workbench → Beats tab · Rhythm key in the mantel', () => { dismissRoom(); window.__studio?.gotoTab?.('beats'); }],
  ['Automation', 'Workbench → a track’s automation lane, on the timeline', () => door('workbench')],
  ['Tempo, key & scale', 'The mantel LCD, top centre — always in reach', () => door('workbench')],
  ['Your songs — clips & clouds', 'Room → Your songs · the tapes rail in the Workbench', () => door('songs')],
  ['Recipes & the style guide', 'Your tapes → Recipes · Guide key in the mantel', () => { dismissRoom(); $('b-recipes')?.click(); }],
  ['Projects — open, new, rename', 'Room → Your tapes · the tape name in the mantel', () => door('tapes')],
  ['Undo / redo', 'The mantel, beside the tape name · Ctrl+Z', () => door('workbench')],
  ['Export — WAV & MP3', 'Finish → Tape', () => openFinish()],
  ['Stems — one zip per track', 'Finish → Stems (inside Export)', () => openFinish()],
  ['Music video — the fox heart', 'Finish → Film', () => openFinish()],
  ['Settings & Light mode', 'The gear key in the mantel, beside the tape name', () => { dismissRoom(); $('b-settings')?.click(); }],
];
function openIndex() {
  if (!indexSheet) {
    indexSheet = sheetBase('gh-index', 'Where things live', 'Every capability in Slowreel, and the one door that leads to it. Nothing is only in a menu; everything has an address.');
    const body = indexSheet.querySelector('.gh-sheet-body');
    INDEX.forEach(([name, addr, go]) => {
      const r = el('button', 'gh-index-row', `${esc(name)}<span>${esc(addr)}</span>`);
      r.onclick = () => { closeSheets(); go(); };
      body.append(r);
    });
  }
  if (finishSheet) finishSheet.hidden = true;
  indexSheet.hidden = false;
}
function openFinish() {
  if (!finishSheet) {
    finishSheet = sheetBase('gh-finish-sheet', 'Finish', 'The last room you walk into, on purpose. Three plates, one calm sheet.');
    const body = finishSheet.querySelector('.gh-sheet-body');
    const plates = el('div', 'gh-finish-plates');
    const mk = (name, desc, fn) => { const p = el('button', 'gh-plate', `<b>${esc(name)}</b><span>${esc(desc)}</span>`); p.onclick = fn; plates.append(p); };
    mk('Tape', 'Export the master — WAV + MP3, rendered and measured.', () => { closeSheets(); dismissRoom(); $('b-export')?.click(); });
    mk('Stems', 'One zip, every track its own WAV — for a collaborator. Lives inside Export.', () => {
      closeSheets(); dismissRoom(); $('b-export')?.click();
      setTimeout(() => $('exp-stems')?.click(), 600);
    });
    mk('Film', 'A music video with the fox heart, from this tape or a song.', () => { closeSheets(); dismissRoom(); $('b-visual')?.click(); });
    body.append(plates);
  }
  if (indexSheet) indexSheet.hidden = true;
  finishSheet.hidden = false;
}

// ------------------------------------------------------------------ live line
function refresh() {
  try {
    const st = window.__studio?.status?.(); if (!st) return;
    const nameEl = $('gh-tapename'); if (nameEl && st.project) nameEl.textContent = st.project;
    const ps = $('proj-state'); const sv = $('gh-saved');
    if (sv && ps) sv.innerHTML = `<i></i>${esc(ps.textContent.trim() || 'Saved')}`;
    const play = $('gh-play'); if (play) play.textContent = st.playing ? '❚❚' : '▶';
    const loop = $('gh-loop'); const tl = $('t-loop');
    if (loop && tl) loop.setAttribute('aria-pressed', tl.getAttribute('aria-pressed') || 'false');
    const facts = $('gh-facts');
    if (facts && S.project) facts.textContent = `${S.project.bpm} BPM · ${S.project.key} ${S.project.scale}`;
    const wl = $('gh-world-line');
    if (wl && S.project) {
      const w = (window.__studio?.worlds.list() || []).find(x => x.id === S.project.world);
      wl.textContent = w ? `${w.title} — the light in the room.` : 'Your tape, where you left it.';
    }
    const info = window.__studio?.river.info();
    const line = $('gh-nowline'); const cap = $('gh-capture'); const letBtn = $('gh-letitplay');
    if (info && line) {
      if (info.running) {
        const w = (window.__studio?.worlds.list() || []).find(x => x.id === info.world);
        line.textContent = `The River · ${w ? w.title : info.world} · ${info.mood} — ${info.events} notes played, ${info.captured} waiting to capture. Playing over it is welcome.`;
        if (letBtn) letBtn.textContent = 'Stop the River';
      } else {
        line.textContent = st.playing ? 'Your tape is playing.' : '';
        if (letBtn) letBtn.textContent = '▶ Let it play — the Endless River';
      }
      if (cap) cap.hidden = !(info.running && info.captured > 0);
    }
  } catch { }
}

// ------------------------------------------------------------------ boot
function init() {
  // dual naming on the dock tabs
  document.querySelectorAll('.key.tab').forEach(t => {
    const key = t.id.replace('tab-', '');
    if (TAB_SUBS[key] && !t.querySelector('.gh-sub')) t.append(el('span', 'gh-sub', TAB_SUBS[key]));
  });
  // Finish pill on the workbench bar (the mantel's working edge — the header module is full)
  const dockBar = document.querySelector('.dock .tbar');
  if (dockBar && !$('gh-finish')) {
    const f = el('button', 'key sm', 'Finish — tape · stems · film'); f.id = 'gh-finish'; f.title = 'Finish: tape, stems, film — one calm sheet';
    f.onclick = openFinish; dockBar.append(f);
  }
  // return handle
  const hnd = el('button', '', '← The Room'); hnd.id = 'gh-return-handle'; hnd.hidden = true;
  hnd.onclick = showRoom; document.body.append(hnd);

  buildRoom();
  buildSheetsLazy();
  if (AUTOMATED) dismissRoom();
  on('project', () => { buildKeys(); refresh(); });
  pollTimer = setInterval(refresh, 1000);
  refresh();
}
function buildSheetsLazy() { /* sheets build on first open */ }

(function wait() {
  if (window.__studio && S.project) { try { init(); } catch (e) { console.warn('[goldenhour]', e); } }
  else setTimeout(wait, 250);
})();
