// stem-export.js - one-click stems: render the project once per track (that track soloed) -> one 24-bit WAV
// per track, each named "<Project> - <Track>.wav", all packed into a single "<Project>-stems.zip".
// Built for sending stems to a collaborator without the solo / export / unzip / rename loop per track.
import { trimTail, encodeWav, makeZip, saveFile } from '../../lib/export.js?v=11';
// state.js?v=11: the same single instance app.js owns (see the note in exporter.js - a second instance
// would see S.project === null). exporter.js itself is NOT modified: renderStem mirrors its renderProject.
import { S, clone } from './state.js?v=11';
import { songSeconds, kb } from './exporter.js?v=11';

const safeName = s => (s || 'Slowreel').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'Slowreel';

// Mirrors exporter.renderProject (loop off, full reverb tail, tail trimmed to the song) with exactly one
// track audible: the engine's mixer rule is !mute && (!anySolo || solo), so soloing the target track in the
// CLONE silences every other track while the live project's own mute/solo state is never touched.
async function renderStem(trackId, onProgress) {
  const p = clone(S.project); p.loop = { ...(p.loop || {}), on: false };
  for (const t of p.tracks) { t.solo = t.id === trackId; if (t.id === trackId) t.mute = false; }
  const raw = await S.engine.render(p, { tailSeconds: 8, toBeat: p.lengthBars * (p.beatsPerBar || 4), onProgress });
  return trimTail(raw, { minSeconds: Math.min(raw.duration, songSeconds(p)) });
}

/** onTrack(i, count, trackName) fires before each render. Returns the saved file list. */
export async function exportStems({ onTrack = () => {} } = {}) {
  const projName = safeName(S.project.name);
  const tracks = S.project.tracks || [];
  if (!tracks.length) throw new Error('This project has no tracks yet.');
  const used = new Set(), files = [];
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    onTrack(i, tracks.length, t.name);
    const buf = await renderStem(t.id);
    const base = `${projName}-${safeName(t.name)}`;
    let name = `${base}.wav`, n = 2;
    while (used.has(name)) name = `${base}-${n++}.wav`;
    used.add(name);
    files.push({ name, data: encodeWav(buf, { bitDepth: 24 }) });
  }
  const zip = await makeZip(files);
  const r = await saveFile(`${projName}-stems.zip`, zip);
  return { files: files.map(f => ({ name: f.name, bytes: f.data.size })), zipBytes: zip.size, zipKb: kb(zip.size), saveStatus: r.status, saveCode: r.code };
}
