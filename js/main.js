// Entry point: loads data, holds selection state, wires the sections together.
import { initTimeline } from './timeline.js';
import { totals, toggle, warnings } from './plan.js';
import { renderDiscovery, esc, nz } from './cards.js';
import { initMap, drawRoute, setView, legendHTML, invalidate } from './map.js';

const KEY = 'fiordland-rail-selection-v1';
const MODE_LABEL = { rail: 'Train', ferry: 'Ferry', drive: 'Road', flight: 'Flight', cruise: 'Cruise', heli: 'Helicopter' };

const [timeline, options, places] = await Promise.all(
  ['data/timeline.json', 'data/options.json', 'data/places.json'].map(u => fetch(u).then(r => r.json()))
);
options._places = places;

const fresh = () => ({ sel: { ...options.defaultSelection }, opt: {}, stayOff: {} });
let state = fresh();
try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.sel) state = { opt: {}, stayOff: {}, ...s }; } catch (e) { /* storage unavailable */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } };

initTimeline(timeline);

const disc = document.getElementById('discovery');
const planEl = document.getElementById('planlist');
const mapOk = initMap(document.getElementById('map'));

function renderPlan(itin) {
  const placeName = k => places[k] ? places[k].name : k;
  planEl.innerHTML = itin.steps.map(s => {
    const days = s.n > 1 ? `Days ${s.day}–${s.day + s.n - 1}` : `Day ${s.day}`;
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
      <div class="pmeta">${s.modes.map(m => `<span class="mchip m-${m}">${MODE_LABEL[m]}</span>`).join('')}${night ? `<span class="pnight">${esc(night)}</span>` : ''}</div></div></li>`;
  }).join('') + `<li class="pstep pend"><div class="pday">Total</div><div class="pbody"><h4>${itin.days} days, ${itin.nights} nights door to door</h4></div></li>`;
}

function render(focusSel) {
  const r = totals(options, state, places);
  renderDiscovery(disc, options, state, r);
  renderPlan(r.itin);
  if (mapOk) {
    drawRoute(r.itin, places);
    document.getElementById('maplegend').innerHTML = legendHTML(r.itin);
  }
  document.getElementById('total').textContent = nz(r.total);
  document.getElementById('tdays').textContent = `${r.itin.days} days · ${r.itin.nights} nights`;
  const w = warnings(state, r.itin);
  document.getElementById('totalnote').textContent =
    `${r.count} options and ${r.stayCount} overnight stays. Meals extra.` + (w.length ? ' ' + w.join(' ') : '');
  if (focusSel) { const el = document.querySelector(focusSel); if (el) el.focus(); }
}

disc.addEventListener('change', e => {
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
  const b = e.target.closest('[data-opt]'); if (!b) return;
  const id = b.closest('.card').dataset.id;
  state = { ...state, opt: { ...state.opt, [id]: Number(b.dataset.opt) } };
  save(); render(`.card[data-id="${CSS.escape(id)}"] [data-opt="${b.dataset.opt}"]`);
});
document.getElementById('clearsel').addEventListener('click', () => { state = { sel: {}, opt: {}, stayOff: {} }; save(); render(); });
document.getElementById('resetsel').addEventListener('click', () => { state = fresh(); save(); render(); });
document.querySelectorAll('[data-mview]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-mview]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  setView(b.dataset.mview);
}));
window.addEventListener('resize', invalidate);

render();
