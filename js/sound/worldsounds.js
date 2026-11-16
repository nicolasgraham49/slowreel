// worldsounds.js - [Slowreel upgrade] the "Worlds" instrument pack: six synthesized instruments built for the new
// one-click Worlds (Deep Space, Bright Shimmer, Underwater, Warm Dust, Forest, Ocean) and the Endless River.
// Same definition format as instruments.js: {id, name, kind, maxVoices, params, macros, presets, voice(ctx, env, P, midi, vel, t)}.
// Everything is native Web Audio synthesis (no samples, no worklets), so it sounds the same live and in exports.
//   voiddrone  a sub drone from the dark: sine sub + detuned triangles under a low roof, brown-noise breath
//   glasskeys  glass bells: inharmonic sine partials with a long ring and an octave-up shimmer partial that blooms late
//   droplet    water drops: a sine whose pitch falls as it sounds, a resonant body, and a quieter ripple drop behind it
//   abysspad   a pad like a deep current: detuned saws through a lowpass that itself drifts like water moving
//   dustkeys   a worn electric piano: sine body + bark partial, tremolo, wow and vinyl crackle living inside the note
//   canopy     a forest texture (kind 'texture', sounds while held): leaf-wind noise + synthesized bird chirps (voice.tick)
// Integrator: instruments.js registers WORLD_SOUNDS with region 'Worlds'.
import { clamp, mtof, rng, noiseBuffer, disconnectAll, release as relParam } from './util.js?v=10b';

const P = (id, name, min, max, def, extra = {}) => ({ id, name, min, max, default: def, unit: '', ...extra });
const keyScale = (midi, per = 24) => Math.pow(2, (60 - midi) / per);
const R = rng(90210);   // deterministic "randomness" (same render every time)
const rand = (a = 0, b = 1) => a + (b - a) * R();
const vel2amp = v => Math.pow(clamp(v, 0, 1), 1.4);

// ---------------------------------------------------------------- voice plumbing (same contract as instruments.js)
class Voice {
  constructor(ctx, env, t) {
    this.ctx = ctx; this.env = env; this.t0 = t; this.out = ctx.createGain(); this.out.gain.value = 1;
    this.srcs = []; this.nodes = [this.out]; this.amps = []; this.rel = 0.5; this.endTime = Infinity; this.released = false;
  }
  node(n) { this.nodes.push(n); return n; }
  gain(v = 1) { const g = this.ctx.createGain(); g.gain.value = v; return this.node(g); }
  filter(type, f, q = 0.7) { const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = clamp(f, 10, 20000); b.Q.value = q; return this.node(b); }
  pan(v) { const p = this.ctx.createStereoPanner(); p.pan.value = clamp(v, -1, 1); return this.node(p); }
  osc(type, freq, t) {
    const o = this.ctx.createOscillator();
    if (typeof type === 'string') o.type = type; else o.setPeriodicWave(type);
    o.frequency.value = freq; o.start(t); this.srcs.push(o); return this.node(o);
  }
  noise(kind, t) {
    const s = this.ctx.createBufferSource(); s.buffer = noiseBuffer(this.ctx, kind); s.loop = true;
    s.start(t, rand(0, 5)); this.srcs.push(s); return this.node(s);
  }
  release(t, r = this.rel) {
    if (this.released) return; this.released = true;
    t = Math.max(t, this.ctx.currentTime);
    for (const a of this.amps) relParam(a, t, r);
    this.stop(t + r * 1.7 + 0.05);
  }
  stop(t) {
    t = Math.max(t, this.ctx.currentTime);
    if (t >= this.endTime) return;
    this.endTime = t;
    for (const s of this.srcs) { try { s.stop(t); } catch (e) { } }
    const first = this.srcs[0];
    if (first) first.onended = () => { if (this.dead) return; disconnectAll(...this.nodes); this.dead = true; this.env.voiceEnded?.(this); };
    else this.dead = true;
  }
  kill(t) { for (const a of this.amps) relParam(a, t, 0.04); this.released = true; this.stop(t + 0.08); }
}

// ---------------------------------------------------------------- 1. Void Drone (Deep Space)
const voiddrone = {
  id: 'voiddrone', name: 'Void Drone', kind: 'synth', maxVoices: 4,
  params: [P('body', 'Body', 0, 1, 0.7), P('drift', 'Drift', 0, 1, 0.4), P('dark', 'Dark', 0, 1, 0.6), P('breath', 'Breath', 0, 1, 0.3),
    P('level', 'Level', 0, 1.5, 1)],
  macros: ['body', 'drift', 'dark', 'breath'],
  presets: [
    { id: 'event-horizon', name: 'Event Horizon', params: { body: 0.85, drift: 0.3, dark: 0.85, breath: 0.35 } },
    { id: 'cold-orbit', name: 'Cold Orbit', params: { body: 0.5, drift: 0.7, dark: 0.55, breath: 0.5 } },
    { id: 'deep-field', name: 'Deep Field', params: { body: 0.7, drift: 0.5, dark: 0.95, breath: 0.2, level: 1.1 } },
  ],
  voice(ctx, env, p, midi, vel, t) {
    const v = new Voice(ctx, env, t), f = mtof(midi), a = vel2amp(vel);
    const amp = v.gain(0); v.amps.push(amp.gain); amp.connect(v.out);
    const lp = v.filter('lowpass', 900 * Math.pow(0.22, p.dark), 0.6); lp.connect(amp);
    const sub = v.osc('sine', f * 0.5, t), sg = v.gain(p.body * 0.55); sub.connect(sg); sg.connect(lp);
    const core = v.osc('sine', f, t), cg = v.gain(0.5); core.connect(cg); cg.connect(lp);
    const det = 4 + p.drift * 12;
    const t1 = v.osc('triangle', f, t), t2 = v.osc('triangle', f, t);
    t1.detune.value = -det; t2.detune.value = det;
    const tg = v.gain(0.16 + p.body * 0.1); t1.connect(tg); t2.connect(tg); tg.connect(lp);
    // drift: the pair slowly beats against the core
    const dl = v.osc('sine', 0.05 + p.drift * 0.08, t), dg = v.gain(p.drift * 9);
    dl.connect(dg); dg.connect(t1.detune); dg.connect(t2.detune);
    if (p.breath > 0.01) {   // the ship / the wind outside: brown noise far below everything
      const n = v.noise('brown', t), nl = v.filter('lowpass', 260, 0.5), ng = v.gain(p.breath * 0.16);
      n.connect(nl); nl.connect(ng); ng.connect(amp);
      const bl = v.osc('sine', 0.07, t), bg = v.gain(p.breath * 0.07); bl.connect(bg); bg.connect(ng.gain);
    }
    amp.gain.setValueAtTime(0, t); amp.gain.setTargetAtTime(a * 0.24 * p.level, t, 1.1);
    v.rel = 3.2;
    return v;
  },
};

// ---------------------------------------------------------------- 2. Glass Keys (Bright Shimmer / Ocean)
const glasskeys = {
  id: 'glasskeys', name: 'Glass Keys', kind: 'synth', maxVoices: 12,
  params: [P('shine', 'Shine', 0, 1, 0.55), P('ring', 'Ring', 0, 1, 0.65), P('shimmer', 'Shimmer', 0, 1, 0.5), P('soft', 'Soft', 0, 1, 0.15),
    P('level', 'Level', 0, 1.5, 1)],
  macros: ['shine', 'ring', 'shimmer', 'soft'],
  presets: [
    { id: 'sun-bells', name: 'Sun Bells', params: { shine: 0.6, ring: 0.6, shimmer: 0.5, soft: 0.1 } },
    { id: 'far-signal', name: 'Far Signal', params: { shine: 0.35, ring: 0.9, shimmer: 0.3, soft: 0.5, level: 0.9 } },
    { id: 'tide-glass', name: 'Tide Glass', params: { shine: 0.5, ring: 0.75, shimmer: 0.65, soft: 0.25 } },
  ],
  voice(ctx, env, p, midi, vel, t) {
    const v = new Voice(ctx, env, t), f = mtof(midi), a = vel2amp(vel), ks = keyScale(midi, 18);
    const amp = v.gain(0); v.amps.push(amp.gain); amp.connect(v.out);
    const ring = (0.5 + p.ring * 3.2) * ks, atk = 0.003 + p.soft * 0.5;
    const parts = [[1, 1, 1], [2.005, 0.4 + p.shine * 0.2, 0.55], [2.76, 0.2 + p.shine * 0.3, 0.3], [5.4, p.shine * 0.22, 0.14], [8.9, p.shine * 0.1, 0.07]];
    for (const [r, lv, dk] of parts) {
      if (f * r > 16500 || lv < 0.005) continue;
      const o = v.osc('sine', f * r, t), g = v.gain(0); o.connect(g); g.connect(amp);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(lv, t + atk); g.gain.setTargetAtTime(0, t + atk, ring * dk / 2.6);
    }
    if (p.shimmer > 0.01) {   // the octave-up halo arrives late, like light catching glass
      const o = v.osc('sine', f * 2, t), g = v.gain(0); o.connect(g); g.connect(amp);
      g.gain.setValueAtTime(0, t); g.gain.setTargetAtTime(p.shimmer * 0.3, t + 0.35, 0.7);
      g.gain.setTargetAtTime(0, t + 1.1, ring * 0.4);
      v.amps.push(g.gain);
    }
    amp.gain.setValueAtTime(a * 0.27 * p.level, t);
    v.rel = 0.7 + p.ring * 1.8;
    v.stop(t + atk + ring * 2.8 + 0.2);
    return v;
  },
};

// ---------------------------------------------------------------- 3. Water Drops (Underwater / Ocean)
const droplet = {
  id: 'droplet', name: 'Water Drops', kind: 'synth', maxVoices: 12,
  params: [P('drop', 'Drop', 0, 1, 0.6), P('size', 'Size', 0, 1, 0.45), P('ripple', 'Ripple', 0, 1, 0.5), P('wet', 'Wet', 0, 1, 0.45),
    P('level', 'Level', 0, 1.5, 1)],
  macros: ['drop', 'size', 'ripple', 'wet'],
  presets: [
    { id: 'rain-on-water', name: 'Rain on Water', params: { drop: 0.65, size: 0.4, ripple: 0.5, wet: 0.5 } },
    { id: 'tide-pools', name: 'Tide Pools', params: { drop: 0.4, size: 0.7, ripple: 0.8, wet: 0.35 } },
    { id: 'deep-drops', name: 'Deep Drops', params: { drop: 0.85, size: 0.55, ripple: 0.3, wet: 0.2, level: 1.1 } },
  ],
  voice(ctx, env, p, midi, vel, t) {
    const v = new Voice(ctx, env, t), f = mtof(midi), a = vel2amp(vel);
    const lp = v.filter('lowpass', 1100 + p.wet * 6500, 0.5);
    const amp = v.gain(0); v.amps.push(amp.gain); lp.connect(amp); amp.connect(v.out);
    const drop = (at, freq, lv, fall) => {
      const o = v.osc('sine', freq * (1 + p.drop * 1.6), at);
      o.frequency.setValueAtTime(freq * (1 + p.drop * 1.6), at);
      o.frequency.exponentialRampToValueAtTime(Math.max(30, freq), at + fall);
      const bp = v.filter('bandpass', clamp(freq * 2, 300, 6000), 3.5), bg = v.gain(p.size * 0.5);
      const g = v.gain(0); o.connect(g); o.connect(bp); bp.connect(bg); bg.connect(g); g.connect(lp);
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(lv, at + 0.004);
      g.gain.setTargetAtTime(0, at + 0.004, 0.16 + p.size * 0.4);
      v.amps.push(g.gain);
      return o;
    };
    drop(t, f, a * 0.34 * p.level, 0.05 + p.drop * 0.22);
    if (p.ripple > 0.01) drop(t + 0.17 + p.size * 0.16, f * 2, a * 0.34 * p.level * p.ripple * 0.55, 0.04 + p.drop * 0.15);
    amp.gain.setValueAtTime(1, t);
    v.rel = 0.3;
    v.stop(t + 1.8);
    return v;
  },
};

// ---------------------------------------------------------------- 4. Abyss Pad (Underwater / Deep Space)
const abysspad = {
  id: 'abysspad', name: 'Abyss Pad', kind: 'synth', maxVoices: 8,
  params: [P('depth', 'Depth', 0, 1, 0.6), P('current', 'Current', 0, 1, 0.55), P('swell', 'Swell', 0, 1, 0.6), P('weight', 'Weight', 0, 1, 0.45),
    P('level', 'Level', 0, 1.5, 1)],
  macros: ['depth', 'current', 'swell', 'weight'],
  presets: [
    { id: 'dark-current', name: 'Dark Current', params: { depth: 0.8, current: 0.6, swell: 0.7, weight: 0.6 } },
    { id: 'kelp-drift', name: 'Kelp Drift', params: { depth: 0.55, current: 0.8, swell: 0.5, weight: 0.35 } },
    { id: 'blue-hour', name: 'Blue Hour', params: { depth: 0.35, current: 0.4, swell: 0.6, weight: 0.3, level: 1.05 } },
  ],
  voice(ctx, env, p, midi, vel, t) {
    const v = new Voice(ctx, env, t), f = mtof(midi), a = vel2amp(vel);
    const amp = v.gain(0); v.amps.push(amp.gain); amp.connect(v.out);
    const cut = 2600 * Math.pow(0.11, p.depth);
    const lp = v.filter('lowpass', cut, 0.8); lp.connect(amp);
    const s1 = v.osc('sawtooth', f, t), s2 = v.osc('sawtooth', f, t), tr = v.osc('triangle', f, t);
    s1.detune.value = -7; s2.detune.value = 7;
    const sg = v.gain(0.3); s1.connect(sg); s2.connect(sg); sg.connect(lp); tr.connect(lp);
    const sub = v.osc('sine', f * 0.5, t), ug = v.gain(p.weight * 0.45); sub.connect(ug); ug.connect(lp);
    // the current: the filter roof itself breathes, slowly and never the same way twice per note
    const cl = v.osc('sine', 0.05 + p.current * 0.13, t), cg = v.gain(p.current * 620);
    cl.connect(cg); cg.connect(lp.detune);
    const at = 0.35 + p.swell * 2.4;
    amp.gain.setValueAtTime(0, t); amp.gain.setTargetAtTime(a * 0.16 * p.level, t, at / 2.4);
    v.rel = 1.2 + p.swell * 2.4;
    return v;
  },
};

// ---------------------------------------------------------------- 5. Dusty Keys (Warm Dust lo-fi)
const dustkeys = {
  id: 'dustkeys', name: 'Dusty Keys', kind: 'synth', maxVoices: 10,
  params: [P('trem', 'Tremolo', 0, 1, 0.45), P('dust', 'Dust', 0, 1, 0.4), P('worn', 'Worn', 0, 1, 0.5), P('tone', 'Tone', 0, 1, 0.5),
    P('level', 'Level', 0, 1.5, 1)],
  macros: ['trem', 'dust', 'worn', 'tone'],
  presets: [
    { id: 'porch-rhodes', name: 'Porch Rhodes', params: { trem: 0.5, dust: 0.35, worn: 0.4, tone: 0.55 } },
    { id: 'summer-screen', name: 'Summer Screen', params: { trem: 0.35, dust: 0.55, worn: 0.7, tone: 0.4 } },
    { id: 'old-radio', name: 'Old Radio', params: { trem: 0.6, dust: 0.8, worn: 0.9, tone: 0.25, level: 1.1 } },
  ],
  voice(ctx, env, p, midi, vel, t) {
    const v = new Voice(ctx, env, t), f = mtof(midi), a = vel2amp(vel), ks = keyScale(midi, 20);
    const lp = v.filter('lowpass', 850 + p.tone * 3900, 0.6);
    const tremG = v.gain(1);
    const amp = v.gain(0); v.amps.push(amp.gain);
    lp.connect(tremG); tremG.connect(amp); amp.connect(v.out);
    const o1 = v.osc('sine', f, t), o2 = v.osc('sine', f * 2, t), o3 = v.osc('sine', f * 3.98, t);
    const g2 = v.gain(0.32), g3 = v.gain(0); o1.connect(lp); o2.connect(g2); g2.connect(lp); o3.connect(g3); g3.connect(lp);
    g3.gain.setValueAtTime(0.16 * (0.4 + vel), t); g3.gain.setTargetAtTime(0, t + 0.003, 0.07);   // the tine bark, gone in a blink
    if (p.trem > 0.01) { const l = v.osc('sine', 3.4 + p.worn * 2.2, t), lg = v.gain(p.trem * 0.32); l.connect(lg); lg.connect(tremG.gain); }
    if (p.dust > 0.01) {   // the record the keys were sampled from, still playing underneath
      const n = v.noise('crackle', t), hp = v.filter('highpass', 900, 0.6), ng = v.gain(p.dust * 0.05);
      n.connect(hp); hp.connect(ng); ng.connect(amp);
    }
    // worn tape pitch: a slow, shallow sag and recovery on every oscillator
    const wl = v.osc('sine', 0.4, t), wg = v.gain(p.worn * 13); wl.connect(wg);
    [o1, o2, o3].forEach(o => wg.connect(o.detune));
    const dec = (0.9 + ks * 0.9);
    amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(a * 0.3 * p.level, t + 0.005);
    amp.gain.setTargetAtTime(a * 0.3 * p.level * 0.5, t + 0.005, 0.3);
    amp.gain.setTargetAtTime(0, t + 0.45, dec / 2.2);
    v.rel = 0.5;
    v.stop(t + 0.45 + dec * 2.6 + 0.2);
    return v;
  },
};

// ---------------------------------------------------------------- 6. Canopy (Forest texture)
const canopy = {
  id: 'canopy', name: 'Canopy', kind: 'texture', maxVoices: 3,
  params: [P('leaves', 'Leaves', 0, 1, 0.55), P('birds', 'Birds', 0, 1, 0.4), P('tone', 'Tone', 0, 1, 0.5),
    P('level', 'Level', 0, 1.5, 1)],
  macros: ['leaves', 'birds', 'tone'],
  presets: [
    { id: 'morning-leaves', name: 'Morning Leaves', params: { leaves: 0.55, birds: 0.55, tone: 0.55 } },
    { id: 'deep-woods', name: 'Deep Woods', params: { leaves: 0.4, birds: 0.25, tone: 0.3 } },
    { id: 'rain-coming', name: 'Rain Coming', params: { leaves: 0.8, birds: 0.1, tone: 0.4, level: 1.1 } },
  ],
  voice(ctx, env, p, midi, vel, t) {
    const v = new Voice(ctx, env, t), a = vel2amp(vel);
    const amp = v.gain(0); v.amps.push(amp.gain); amp.connect(v.out);
    // leaves: pink noise through a wandering band, swelling like wind moving through branches
    const n = v.noise('pink', t), bp = v.filter('bandpass', 650 + p.tone * 1700, 0.75), lg = v.gain(p.leaves * 0.16);
    n.connect(bp); bp.connect(lg); lg.connect(amp);
    const gust = v.osc('sine', 0.06, t), gg = v.gain(p.leaves * 0.09); gust.connect(gg); gg.connect(lg.gain);
    const wander = v.osc('sine', 0.045, t), wg = v.gain(500 * p.tone); wander.connect(wg); wg.connect(bp.detune);
    const shimmerN = v.noise('white', t), hp = v.filter('highpass', 4200, 0.6), hg = v.gain(p.leaves * 0.02);
    shimmerN.connect(hp); hp.connect(hg); hg.connect(amp);
    amp.gain.setValueAtTime(0, t); amp.gain.setTargetAtTime(a * 0.6 * p.level, t, 0.9);
    v.rel = 4;
    // birds: short synthesized chirps (a falling-rising sine syllable or two), appearing while the note is held.
    // Spawned from tick() so live and offline renders chirp the same way; each chirp cleans up after itself.
    if (p.birds > 0.02) {
      let next = t + 0.8 + R() * 2;
      v.tick = (until) => {
        if (v.released || v.dead) return;
        const end = Math.min(until, v.endTime - 0.05);
        while (next < end) {
          const at = next, base = 2100 + R() * 1500, syl = 2 + Math.floor(R() * 3);
          const o = ctx.createOscillator(); o.type = 'sine';
          const g = ctx.createGain(), pn = ctx.createStereoPanner(); pn.pan.value = rand(-0.6, 0.6);
          o.connect(g); g.connect(pn); pn.connect(amp); v.nodes.push(o, g, pn);
          let tt = at;
          o.frequency.setValueAtTime(base * 1.25, tt);
          for (let s = 0; s < syl; s++) {
            o.frequency.exponentialRampToValueAtTime(base * (0.82 + R() * 0.2), tt + 0.055);
            o.frequency.exponentialRampToValueAtTime(base * (1.15 + R() * 0.25), tt + 0.11);
            tt += 0.13;
          }
          const peak = p.birds * 0.055 * (0.6 + R() * 0.6);
          g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(peak, at + 0.03);
          g.gain.setValueAtTime(peak, Math.max(at + 0.03, tt - 0.05)); g.gain.linearRampToValueAtTime(0, tt + 0.04);
          o.start(at); o.stop(tt + 0.06);
          o.onended = () => disconnectAll(o, g, pn);
          next = at + 0.5 + R() * Math.max(0.8, 6.5 - p.birds * 5.5);
        }
      };
    }
    return v;
  },
};

export const WORLD_SOUNDS = [voiddrone, glasskeys, droplet, abysspad, dustkeys, canopy];
