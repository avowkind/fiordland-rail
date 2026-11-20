// Itinerary chart: the fixed trip as a day-by-day grid. One column per day, a travel row and a night row.
import { esc } from './cards.js';

const MODE = { rail: 'Train', ferry: 'Ferry', drive: 'Road', cruise: 'Cruise', heli: 'Helicopter', flight: 'Flight' };
// The main mode colours the block: the cruise wins, then rail, then ferry, then road.
const main = modes => ['cruise', 'rail', 'ferry', 'drive'].find(m => modes.includes(m)) || 'rest';

const BK_WORD = { confirmed: 'confirmed', booked: 'booked, awaiting confirmation', none: 'not booked yet' };
const TICK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>';
// One marker per bookable item: a filled tick when confirmed, a ring otherwise.
const mark = (st, label) => `<i class="ic-bk ic-bk-${st}" role="img" aria-label="${esc(label)}: ${BK_WORD[st] || BK_WORD.none}" title="${esc(label)}: ${BK_WORD[st] || BK_WORD.none}">${st === 'confirmed' ? TICK : ''}</i>`;

export function renderItinChart(root, itin, al, places, status = []) {
  const days = al ? al.days : itin.days;
  const start = al && al.startDate;
  const date = d => start ? new Date(start + (d - 1) * 864e5) : null;
  const wd = d => date(d) ? date(d).toLocaleDateString('en-NZ', { weekday: 'short', timeZone: 'UTC' }) : '';
  const dm = d => date(d) ? date(d).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : `Day ${d}`;
  const name = k => (places[k] ? places[k].name : k);

  let head = '', travel = '', night = '';
  for (let d = 1; d <= days; d++) {
    head += `<div class="ic-day" style="grid-row:1;grid-column:${d + 1}"><span>${esc(wd(d))}</span><b>${esc(dm(d))}</b><small>Day ${d}</small></div>`;
  }
  const items = i => {
    const it = status[i] ? status[i].items : [];
    return it.length ? `<ul class="ic-items">${it.map(x => `<li>${mark(x.status, x.label)}${esc(x.short)}</li>`).join('')}</ul>` : '';
  };
  itin.steps.forEach((s, i) => {
    const d0 = al ? al.per[i].day : s.day;
    const span = Math.max(s.n, 1);
    const m = main(s.modes);
    travel += `<div class="ic-leg ic-${m}" style="grid-row:2;grid-column:${d0 + 1} / span ${span}" title="${esc(s.detail)}">
      <b>${esc(s.title)}</b><span>${s.modes.length ? s.modes.map(x => MODE[x]).join(' · ') : 'No travel'}</span>${items(i)}</div>`;
    if (s.night) {
      const p = places[s.night.place];
      const label = s.night.kind === 'aboard' ? `Aboard, ${s.n} nights` : name(s.night.place) + (p && (p.hotel || p.chosen) ? ` · ${p.hotel ? p.hotel.name : p.chosen}` : '');
      const nb = status[i] && status[i].night;
      night += `<div class="ic-night${s.night.kind === 'aboard' ? ' aboard' : ''}" style="grid-row:3;grid-column:${d0 + 1} / span ${span}">${nb ? mark(nb.status, label) : ''}<span>${esc(label)}</span></div>`;
    }
  });
  const last = itin.steps.length && !itin.steps[itin.steps.length - 1].night
    ? `<div class="ic-night home" style="grid-row:3;grid-column:${days + 1}">Home</div>` : '';

  root.innerHTML = `<div class="ic-grid" style="--days:${days}">
    <div class="ic-lab" style="grid-row:1"></div>${head}
    <div class="ic-lab" style="grid-row:2">Travel</div>${travel}
    <div class="ic-lab" style="grid-row:3">Night</div>${night}${last}
  </div>`;
}
