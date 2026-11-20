// Itinerary chart: the fixed trip as a day-by-day grid. One column per day, a travel row and a night row.
import { esc } from './cards.js';

const MODE = { rail: 'Train', ferry: 'Ferry', drive: 'Road', cruise: 'Cruise', heli: 'Helicopter', flight: 'Flight' };
// The main mode colours the block: the cruise wins, then rail, then ferry, then road.
const main = modes => ['cruise', 'rail', 'ferry', 'drive'].find(m => modes.includes(m)) || 'rest';

export function renderItinChart(root, itin, al, places, status = []) {
  const days = al ? al.days : itin.days;
  const start = al && al.startDate;
  const date = d => start ? new Date(start + (d - 1) * 864e5) : null;
  const wd = d => date(d) ? date(d).toLocaleDateString('en-NZ', { weekday: 'short', timeZone: 'UTC' }) : '';
  const dm = d => date(d) ? date(d).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : `Day ${d}`;
  const name = k => (places[k] ? places[k].name : k);

  let head = '', travel = '', night = '';
  for (let d = 1; d <= days; d++) {
    const st = status[d - 1];
    const todo = st ? st.need.filter(x => x.status !== 'confirmed').map(x => x.label) : [];
    const tip = st && st.need.length ? (st.done ? 'All bookings for this day confirmed' : 'Still to confirm: ' + todo.join(', ')) : '';
    const tick = st && st.done ? `<i class="ic-ok" role="img" aria-label="All bookings confirmed"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg></i>` : '';
    head += `<div class="ic-day${st && st.done ? ' done' : ''}" style="grid-row:1;grid-column:${d + 1}"${tip ? ` title="${esc(tip)}"` : ''}><span>${esc(wd(d))}${tick}</span><b>${esc(dm(d))}</b><small>Day ${d}</small></div>`;
  }
  itin.steps.forEach((s, i) => {
    const d0 = al ? al.per[i].day : s.day;
    const span = Math.max(s.n, 1);
    const m = main(s.modes);
    travel += `<div class="ic-leg ic-${m}" style="grid-row:2;grid-column:${d0 + 1} / span ${span}" title="${esc(s.detail)}">
      <b>${esc(s.title)}</b><span>${s.modes.length ? s.modes.map(x => MODE[x]).join(' · ') : 'No travel'}</span></div>`;
    if (s.night) {
      const p = places[s.night.place];
      const label = s.night.kind === 'aboard' ? `Aboard, ${s.n} nights` : name(s.night.place) + (p && (p.hotel || p.chosen) ? ` · ${p.hotel ? p.hotel.name : p.chosen}` : '');
      night += `<div class="ic-night${s.night.kind === 'aboard' ? ' aboard' : ''}" style="grid-row:3;grid-column:${d0 + 1} / span ${span}">${esc(label)}</div>`;
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
