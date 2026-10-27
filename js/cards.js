// Discovery cards and generated overnight-stay cards.
import { cardValue, KENNEL_RATE, DOGS, SELF_RAIL_COST } from './plan.js';

export const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const nz = n => 'NZD ' + Math.round(n).toLocaleString('en-NZ');
const ROOM = ['Comfortable twin', 'Two rooms', 'Luxury lodge'];
const DIR = { out: '» Outward', ret: '« Return', mid: '◆ Fiordland', both: '» Outward and return «' };
const band = dir => dir ? `<div class="cband" aria-label="${DIR[dir].replace(/[»«◆]/g, '').trim()}">${DIR[dir]}</div>` : '';

function basis(c, state, nights) {
  if (c.dyn === 'kennel') return `$${KENNEL_RATE} per small dog per day (Brookby Lodge price list), × ${DOGS} dogs × ${nights + 1} days. The first day and an afternoon pick-up each count as a full day.`;
  if (c.id === 'railh' && state.sel.self && state.sel.railh) return `With Drive ourselves: drive the rental back to Christchurch instead of flying (no jet, about NZD 500 saved), with extra rental days and fuel (about NZD 350) and one more night on the road. Total about NZD ${SELF_RAIL_COST.toLocaleString('en-NZ')}.`;
  return c.b;
}

function costRow(value, nights, published) {
  return `<div class="cost"><b>${nz(value)}</b><span class="chips">${nights ? `<span class="chip">${nights} night${nights > 1 ? 's' : ''}</span>` : ''}<span class="chip ${published ? 'pub' : ''}">${published ? 'Published price' : 'Estimate'}</span></span></div>`;
}

export function renderDiscovery(root, data, state, result) {
  const nights = result.itin.nights;
  let h = '';
  data.groups.forEach(g => {
    h += `<div class="group-h"><h3>${esc(g.t)}</h3><span>${esc(g.n)}</span></div><div class="cards">`;
    data.cards.filter(c => c.g === g.id).forEach(c => {
      const on = !!state.sel[c.id];
      const oi = state.opt[c.id] ?? c.def;
      h += `<article class="card${on ? ' on' : ''}" style="--c:var(--${c.c})" data-id="${c.id}">${band(c.dir)}
        <label class="chead" for="cb-${c.id}"><input type="checkbox" id="cb-${c.id}" ${on ? 'checked' : ''}><div><h4 class="ctitle">${esc(c.t)}</h4><p class="cop">${esc(c.op)}</p></div></label>
        <div class="cbody"><h4>What feels special</h4><ul class="special">${c.sp.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
        <h4>What could swing it</h4><ul class="swing">${c.sw.map(s => `<li class="${s[0]}">${esc(s[1])}</li>`).join('')}</ul></div>
        <div class="cfoot">${c.opts ? `<div class="opts" role="group" aria-label="Class">${c.opts.map((o, i) => `<button type="button" data-opt="${i}" aria-pressed="${i === oi}">${esc(o.l)}</button>`).join('')}</div>` : ''}
        ${costRow(cardValue(c, state, nights), c.n, c.st === 'pub')}
        <p class="basis">${esc(basis(c, state, nights))}</p>
        ${c.links ? `<ul class="clinks">${c.links.map(l => `<li><a href="${esc(l.u)}" target="_blank" rel="noopener noreferrer">${esc(l.l)} <span aria-hidden="true">↗</span><span class="sr"> (opens in a new window)</span></a></li>`).join('')}</ul>` : ''}</div></article>`;
    });
    h += '</div>';
  });

  const stays = result.stays;
  h += `<div class="group-h"><h3>Overnight stays</h3><span>Generated from the legs ticked above. Placeholder prices per night for two. Untick any we won't pay for (staying with friends, say).</span></div><div class="cards">`;
  if (!stays.length) h += `<p class="basis">Tick some legs above and the overnight stays they need will appear here.</p>`;
  stays.forEach(st => {
    const on = !(state.stayOff || {})[st.id];
    const oi = state.opt[st.id] ?? 0;
    const p = data._places[st.place];
    h += `<article class="card${on ? ' on' : ''}" style="--c:var(--muted)" data-id="${st.id}" data-stay="1">${band(st.dir)}
      <label class="chead" for="cb-${st.id}"><input type="checkbox" id="cb-${st.id}" ${on ? 'checked' : ''}><div><h4 class="ctitle">${esc(st.name)}</h4><p class="cop">Night after: ${esc(st.why)}</p></div></label>
      <div class="cbody"><ul class="special"><li>${esc(p.staySpecial || '')}</li></ul></div>
      <div class="cfoot"><div class="opts" role="group" aria-label="Room">${ROOM.map((l, i) => `<button type="button" data-opt="${i}" aria-pressed="${i === oi}">${l}</button>`).join('')}</div>
      ${costRow(st.rates[oi], 1, false)}</div></article>`;
  });
  h += '</div>';
  root.innerHTML = h;
}
