// Entry point: loads data, holds selection state, wires the sections together.
import { renderItinChart } from './itinchart.js';
import { totals, toggle, warnings, alignSeason, fixedDates, DOW_LABEL, sequence, stepBookings } from './plan.js';
import { renderDiscovery, esc, nz } from './cards.js';
import { initMap, drawRoute, setView, legendHTML, invalidate } from './map.js';

const KEY = 'fiordland-rail-selection-v7';
const SEASON = 'spring27'; // the trip is fixed: October 2027
const MODE_LABEL = { rail: 'Train', ferry: 'Ferry', drive: 'Road', flight: 'Flight', cruise: 'Cruise', heli: 'Helicopter' };

const [options, places, seasons, bookings] = await Promise.all(
  ['data/options.json', 'data/places.json', 'data/seasons.json', 'data/bookings.json'].map(u => fetch(u).then(r => r.json()))
);
options._places = places;

const fresh = () => ({ sel: { ...options.defaultSelection }, opt: {}, stayOff: {}, showPrices: false });
let state = fresh();
try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.sel) state = { opt: {}, stayOff: {}, ...s }; } catch (e) { /* storage unavailable */ }
// Hidden cards can't stay selected from an older saved selection.
options.cards.filter(c => c.hidden).forEach(c => { if (state.sel[c.id]) { const sel = { ...state.sel }; delete sel[c.id]; state = { ...state, sel }; } });
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } };


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

// Booked and confirmed counts across the ticked legs and the nights of the trip.
function bookedLine(r, al) {
  const legs = options.cards.filter(c => state.sel[c.id]).map(c => bookings.legs[c.id]);
  const nights = al && al.startDate ? Array.from({ length: al.days - 1 }, (_, i) => bookings.nights[new Date(al.startDate + i * 864e5).toISOString().slice(0, 10)]).filter(Boolean) : [];
  const all = [...legs, ...nights].filter(Boolean);
  const n = st => all.filter(b => b.status === st).length;
  return `Booked ${n('booked') + n('confirmed')} of ${all.length}, confirmed ${n('confirmed')}.`;
}

function render(focusSel) {
  const r = totals(options, state, places);
  const al = alignSeason(r.itin, seasons, SEASON, fixedDates(options.cards, state));
  const { groups } = sequence(r.itin, options.cards, state);
  renderItinChart(document.getElementById('itinchart'), r.itin, al, places, stepBookings(r.itin, al, groups, bookings, options.cards));
  renderDiscovery(disc, options, state, r, al, bookings);
  renderPlan(r.itin, al);
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
    `${r.count} options and ${r.stayCount} overnight stays. ${bookedLine(r, al)}` + (w.length ? ' ' + w.join(' ') : '');
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
document.getElementById('clearsel').addEventListener('click', () => { state = { ...state, sel: {}, opt: {}, stayOff: {} }; save(); render(); });
document.getElementById('pricesw').addEventListener('click', () => { state = { ...state, showPrices: !state.showPrices }; save(); render(); });
document.getElementById('resetsel').addEventListener('click', () => { state = { ...fresh(), showPrices: state.showPrices }; save(); render(); });
document.querySelectorAll('[data-mview]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-mview]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  setView(b.dataset.mview);
}));
window.addEventListener('resize', invalidate);

render();

// Before we go: dim dates that have passed and highlight the next one (local date).
(() => {
  const now = new Date(); const today = new Date(now.getTime() - now.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  let marked = false;
  document.querySelectorAll('.kd li[data-date]').forEach(li => {
    if (li.dataset.date < today) li.classList.add('past');
    else if (!marked) { li.classList.add('next'); marked = true; }
  });
})();
