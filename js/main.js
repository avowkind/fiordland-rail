// Entry point: loads data, holds selection state, wires the sections together.
import { initTimeline } from './timeline.js';
import { totals, toggle, warnings, alignSeason, fixedDates, DOW_LABEL } from './plan.js';
import { renderDiscovery, esc, nz } from './cards.js';
import { initMap, drawRoute, setView, legendHTML, invalidate } from './map.js';

const KEY = 'fiordland-rail-selection-v4';
const MODE_LABEL = { rail: 'Train', ferry: 'Ferry', drive: 'Road', flight: 'Flight', cruise: 'Cruise', heli: 'Helicopter' };

const [timeline, options, places, seasons] = await Promise.all(
  ['data/timeline.json', 'data/options.json', 'data/places.json', 'data/seasons.json'].map(u => fetch(u).then(r => r.json()))
);
options._places = places;

const fresh = () => ({ sel: { ...options.defaultSelection }, opt: {}, stayOff: {}, showPrices: false, season: options.defaultSeason || null });
let state = fresh();
try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.sel) state = { opt: {}, stayOff: {}, ...s }; } catch (e) { /* storage unavailable */ }
// Hidden cards can't stay selected from an older saved selection.
options.cards.filter(c => c.hidden).forEach(c => { if (state.sel[c.id]) { const sel = { ...state.sel }; delete sel[c.id]; state = { ...state, sel }; } });
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } };

initTimeline(timeline);

const disc = document.getElementById('discovery');
const planEl = document.getElementById('planlist');
const mapOk = initMap(document.getElementById('map'));

function renderPlan(itin, al) {
  const placeName = k => places[k] ? places[k].name : k;
  planEl.innerHTML = itin.steps.map((s, i) => {
    const d0 = al ? al.per[i].day : s.day;
    const fmtD = n => new Date(n).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
    const wd = al ? (al.startDate ? ` · ${fmtD(al.startDate + (d0 - 1) * 864e5)}` : ` · ${DOW_LABEL[al.per[i].dow]}`) : '';
    const days = s.n > 1 ? `Days ${d0}–${d0 + s.n - 1}${wd}` : `Day ${d0}${wd}`;
    const notes = al ? al.notes[i].map(n => `<p class="pnote ${n.level}">${esc(n.text)}</p>`).join('') : '';
    let night = '';
    if (s.night) {
      const where = placeName(s.night.place);
      night = s.night.kind === 'aboard' ? `${s.n} nights aboard` : `Night in ${where}`;
      if (s.night.kind === 'aboard' && s.n === 1) night = '1 night aboard';
      if (s.night.id && state.stayOff[s.night.id]) night += ' (not costed)';
    }
    return `<li class="pstep">
      <div class="pday">${days}</div>
      <div class="pbody"><h4>${esc(s.title)}</h4><p>${esc(s.detail)}</p>
      <div class="pmeta">${s.modes.map(m => `<span class="mchip m-${m}">${MODE_LABEL[m]}</span>`).join('')}${night ? `<span class="pnight">${esc(night)}</span>` : ''}</div>${notes}</div></li>`;
  }).join('') + `<li class="pstep pend"><div class="pday">Total</div><div class="pbody"><h4>${itin.days} days, ${itin.nights} nights door to door</h4>${al && al.added ? `<p class="pnote add">Lining up with ${esc(al.label)} timetables adds ${al.added} day${al.added > 1 ? 's' : ''}: ${al.days - 1} nights. The extra nights are not yet in the total or the kennel bill.</p>` : ''}</div></li>`;
}

function render(focusSel) {
  const r = totals(options, state, places);
  const al = state.season ? alignSeason(r.itin, seasons, state.season, fixedDates(options.cards, state)) : null;
  renderDiscovery(disc, options, state, r, al);
  renderPlan(r.itin, al);
  renderSeason(al);
  if (mapOk) {
    drawRoute(r.itin, places);
    document.getElementById('maplegend').innerHTML = legendHTML(r.itin);
  }
  document.body.classList.toggle('noprice', !state.showPrices);
  const pb = document.getElementById('pricesw'); pb.setAttribute('aria-checked', String(!!state.showPrices));
  document.getElementById('total').textContent = nz(r.total);
  document.getElementById('tdays').textContent = `${r.itin.days} days · ${r.itin.nights} nights`;
  const w = warnings(state, r.itin);
  document.getElementById('totalnote').textContent =
    `${r.count} options and ${r.stayCount} overnight stays.` + (w.length ? ' ' + w.join(' ') : '');
  if (focusSel) { const el = document.querySelector(focusSel); if (el) el.focus(); }
}

disc.addEventListener('change', e => {
  const rs = e.target.closest('select[data-room]');
  if (rs) {
    state = { ...state, opt: { ...state.opt, [rs.dataset.room]: Number(rs.value) } };
    save(); render('#rs-' + CSS.escape(rs.dataset.room)); return;
  }
  const cb = e.target.closest('input[type=checkbox]'); if (!cb) return;
  const card = cb.closest('.card'); const id = card.dataset.id;
  if (card.dataset.stay) {
    const off = { ...state.stayOff };
    if (cb.checked) delete off[id]; else off[id] = 1;
    state = { ...state, stayOff: off };
  } else {
    state = toggle(options, state, id, cb.checked);
  }
  save(); render('#cb-' + CSS.escape(id));
});
disc.addEventListener('click', e => {
  const ch = e.target.closest('[data-choice]');
  if (ch) {
    state = { ...state, opt: { ...state.opt, [ch.dataset.choice]: Number(ch.dataset.val) } };
    save(); render(`[data-choice="${CSS.escape(ch.dataset.choice)}"]`); return;
  }
  const b = e.target.closest('[data-opt]'); if (!b) return;
  const id = b.closest('.card').dataset.id;
  state = { ...state, opt: { ...state.opt, [id]: Number(b.dataset.opt) } };
  save(); render(`.card[data-id="${CSS.escape(id)}"] [data-opt="${b.dataset.opt}"]`);
});
function renderSeason(al) {
  document.querySelectorAll('[data-season]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.season || '') === (state.season || ''))));
  const box = document.getElementById('seasonbox');
  if (!al) { box.innerHTML = '<p class="basis">No season chosen. Pick one to check the days line up.</p>'; return; }
  const status = al.blockers.length ? `<span class="chip blk">Doesn't fit</span>` : al.added ? `<span class="chip addc">+${al.added} day${al.added > 1 ? 's' : ''}</span>` : `<span class="chip pub">Lines up</span>`;
  const sf = al.sandflies ? `<p class="sandfly sf-${al.sandflies.level}">${esc(al.sandflies.note)}</p>` : '';
  box.innerHTML = `<p><b>${esc(al.label)}</b> (${esc(al.window)}) ${status}</p>${sf}
    <p>${al.startDate ? `Leave Waiheke <b>${new Date(al.startDate).toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</b>, worked back from the fixed sailing.` : `Best day to leave Waiheke: <b>${al.startLabel}</b>.`} ${al.added ? `Even then, ${al.added} waiting day${al.added > 1 ? 's are' : ' is'} needed; see the amber notes below.` : 'Every train connects with no waiting days.'}</p>
    ${al.blockers.filter(b => !b.startsWith('Sandflies')).length ? `<ul class="blk-list">${al.blockers.filter(b => !b.startsWith('Sandflies')).map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
    <ul class="gen-list">${al.general.map(g => `<li>${esc(g)}</li>`).join('')}</ul>`;
}
document.querySelectorAll('[data-season]').forEach(b => b.addEventListener('click', () => {
  state = { ...state, season: b.dataset.season || null }; save(); render();
}));
document.addEventListener('season-pick', e => { state = { ...state, season: e.detail }; save(); render(); });
document.getElementById('clearsel').addEventListener('click', () => { state = { ...state, sel: {}, opt: {}, stayOff: {} }; save(); render(); });
document.getElementById('pricesw').addEventListener('click', () => { state = { ...state, showPrices: !state.showPrices }; save(); render(); });
document.getElementById('resetsel').addEventListener('click', () => { state = { ...fresh(), showPrices: state.showPrices }; save(); render(); });
document.querySelectorAll('[data-mview]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-mview]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  setView(b.dataset.mview);
}));
window.addEventListener('resize', invalidate);

render();
