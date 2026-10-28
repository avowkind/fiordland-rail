// Discovery cards and generated overnight-stay cards.
import { cardValue, cardNights, KENNEL_RATE, DOGS } from './plan.js';

export const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const nz = n => 'NZD ' + Math.round(n).toLocaleString('en-NZ');
const ROOM = ['Comfortable twin', 'Two rooms', 'Luxury lodge'];
const DIR = { out: '» Outward', ret: '« Return', mid: '◆ Fiordland', both: '» Outward and return «' };
const band = dir => dir ? `<div class="cband" aria-label="${DIR[dir].replace(/[»«◆]/g, '').trim()}">${DIR[dir]}</div>` : '';

function basis(c, state, nights) {
  if (c.dyn === 'kennel') return `$${KENNEL_RATE} per small dog per day (Brookby Lodge price list), × ${DOGS} dogs × ${nights + 1} days. The first day and an afternoon pick-up each count as a full day.`;
  return c.b;
}

// Room-type dropdown for places with a chosen hotel (e.g. The Hotel Britomart in Auckland).
function roomSelect(hotel, key, state) {
  const sel = state.opt[key] ?? 0;
  return `<label class="roomsel"><span>Room</span><select data-room="${esc(key)}" id="rs-${esc(key)}">${hotel.rooms.map((r, i) => `<option value="${i}" ${i === sel ? 'selected' : ''}>${esc(r.n)}</option>`).join('')}</select></label><p class="basis">${esc(hotel.rooms[sel].d)}</p>`;
}

// Price elements carry the 'price' class so the Show prices switch can hide them.
function costRow(value, nights, published) {
  return `<div class="cost"><b class="price">${nz(value)}</b><span class="chips">${nights ? `<span class="chip">${nights} night${nights > 1 ? 's' : ''}</span>` : ''}<span class="chip price ${published ? 'pub' : ''}">${published ? 'Published price' : 'Estimate'}</span></span></div>`;
}

export function renderDiscovery(root, data, state, result) {
  const nights = result.itin.nights;
  let h = '';
  data.groups.forEach(g => {
    h += `<div class="group-h"><h3>${esc(g.t)}</h3><span>${esc(g.n)}</span></div><div class="cards">`;
    data.cards.filter(c => c.g === g.id && !c.hidden).forEach(c => {
      const on = !!state.sel[c.id];
      const oi = state.opt[c.id] ?? c.def;
      h += `<article class="card${on ? ' on' : ''}" style="--c:var(--${c.c})" data-id="${c.id}">${band(c.dir)}
        <label class="chead" for="cb-${c.id}"><input type="checkbox" id="cb-${c.id}" ${on ? 'checked' : ''}><div><h4 class="ctitle">${esc(c.t)}</h4><p class="cop">${esc(c.op)}</p></div></label>
        <div class="cbody"><h4>What feels special</h4><ul class="special">${c.sp.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
        <h4>What could swing it</h4><ul class="swing">${c.sw.map(s => `<li class="${s[0]}${s[2] === 'price' ? ' price' : ''}">${esc(s[1])}</li>`).join('')}</ul></div>
        <div class="cfoot">${c.hotel ? roomSelect(data._places[c.hotel].hotel, c.id + '-room', state) : ''}${c.opts ? `<div class="opts" role="group" aria-label="${c.id === 'self' ? 'Stops' : c.hotel ? 'Rooms' : 'Class'}">${c.opts.map((o, i) => `<button type="button" data-opt="${i}" aria-pressed="${i === oi}">${esc(o.l)}</button>`).join('')}</div>` : ''}
        ${costRow(cardValue(c, state, nights), cardNights(c, result.itin), c.st === 'pub')}
        <p class="basis price">${esc(basis(c, state, nights))}</p>
        ${c.links ? `<ul class="clinks">${c.links.map(l => `<li><a href="${esc(l.u)}" target="_blank" rel="noopener noreferrer">${esc(l.l)} <span aria-hidden="true">↗</span><span class="sr"> (opens in a new window)</span></a></li>`).join('')}</ul>` : ''}</div></article>`;
    });
    h += '</div>';
  });

  const stays = result.stays;
  h += `<div class="group-h"><h3>Overnight stays</h3><span>Generated from the legs ticked above. One card per night, with a room choice. Untick any we won't need (staying with friends, say).</span></div><div class="cards">`;
  if (!stays.length) h += `<p class="basis">Tick some legs above and the overnight stays they need will appear here.</p>`;
  stays.forEach(st => {
    const on = !(state.stayOff || {})[st.id];
    const oi = state.opt[st.id] ?? st.def;
    const p = data._places[st.place];
    h += `<article class="card${on ? ' on' : ''}" style="--c:var(--muted)" data-id="${st.id}" data-stay="1">${band(st.dir)}
      <label class="chead" for="cb-${st.id}"><input type="checkbox" id="cb-${st.id}" ${on ? 'checked' : ''}><div><h4 class="ctitle">${esc(st.name)}${p.hotel ? ' · ' + esc(p.hotel.name) : ''}</h4><p class="cop">Night after: ${esc(st.why)}</p></div></label>
      <div class="cbody"><ul class="special"><li>${esc(p.staySpecial || '')}</li></ul></div>
      <div class="cfoot">${p.hotel ? roomSelect(p.hotel, st.id + '-room', state) : ''}<div class="opts" role="group" aria-label="Room">${(p.hotel ? p.hotel.counts : ROOM).map((l, i) => `<button type="button" data-opt="${i}" aria-pressed="${i === oi}">${esc(l)}</button>`).join('')}</div>
      ${p.hotel ? `<ul class="clinks"><li><a href="${esc(p.hotel.url)}" target="_blank" rel="noopener noreferrer">${esc(p.hotel.name)}: guest rooms <span aria-hidden="true">↗</span><span class="sr"> (opens in a new window)</span></a></li></ul>` : ''}
      ${costRow(st.rates[oi], 1, false)}</div></article>`;
  });
  h += '</div>';
  root.innerHTML = h;
}
