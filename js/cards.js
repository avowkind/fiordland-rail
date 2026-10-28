// Discovery cards and generated overnight-stay cards.
import { cardValue, cardNights, hotelRate, sequence, KENNEL_RATE, DOGS } from './plan.js';

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
  const hr = hotelRate(hotel, state, key);
  const ri = hotel.rooms.indexOf(hr.room), pi = hotel.plans.indexOf(hr.plan);
  const monthLabel = hr.month === 'aug' ? '1 Aug 2027' : '1 Sep 2027';
  return `<label class="roomsel"><span>Room</span><select data-room="${esc(key)}-room" id="rs-${esc(key)}-room">${hotel.rooms.map((r, i) => `<option value="${i}" ${i === ri ? 'selected' : ''}>${esc(r.n)}</option>`).join('')}</select></label>
    <p class="basis">${esc(hr.room.bed)} bed${hr.room.bed === 'Twin' ? 's' : ''} · ${esc(hr.room.d)}${hr.room.bed !== 'Twin' ? ' · one shared bed: book two rooms' : ''}</p>
    <label class="roomsel price"><span>Rate</span><select data-room="${esc(key)}-plan" id="rs-${esc(key)}-plan">${hotel.plans.map((p, i) => `<option value="${i}" ${i === pi ? 'selected' : ''}>${esc(p.l)}</option>`).join('')}</select></label>
    <p class="basis price">${esc(monthLabel)} rate: NZD ${hr.each} per room per night, incl. taxes${hr.count > 1 ? `, × ${hr.count} rooms` : ''}.</p>`;
}

// Hotel ideas for a place: links only, nothing chosen.
const ext = (u, l) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(l)} <span aria-hidden="true">↗</span><span class="sr"> (opens in a new window)</span></a>`;
function ideasList(p) {
  return `<details class="ideas"><summary>Hotel ideas (${p.ideas.length})</summary>${p.transitNote ? `<p class="basis">${esc(p.transitNote)}</p>` : '<p class="basis">Car night: we have the rental car here.</p>'}<ul>${p.ideas.map(i => `<li>${ext(i.u, i.n)}<span>${esc(i.d)}</span>${i.walk ? `<span class="walk${/^Not walkable/.test(i.walk) ? ' far' : ''}">${esc(i.walk)}</span>` : ''}</li>`).join('')}</ul>
    <p class="basis">Ideas only, nothing chosen. Twin beds not confirmed for any of these: ask when enquiring.${p.ideasSrc ? ` More: ${ext(p.ideasSrc.u, p.ideasSrc.l)}` : ''}</p></details>`;
}

// Price elements carry the 'price' class so the Show prices switch can hide them.
function costRow(value, nights, published) {
  return `<div class="cost"><b class="price">${nz(value)}</b><span class="chips">${nights ? `<span class="chip">${nights} night${nights > 1 ? 's' : ''}</span>` : ''}<span class="chip price ${published ? 'pub' : ''}">${published ? 'Published price' : 'Estimate'}</span></span></div>`;
}

function optLabel(c) {
  if (c.id === 'self') return 'Stops';
  if (c.opts && c.opts[0].date) return 'Sailing date';
  return c.hotel ? 'Rooms' : 'Class';
}

function cardHTML(c, data, state, result) {
  const nights = result.itin.nights;
  const on = !!state.sel[c.id];
  const oi = state.opt[c.id] ?? c.def;
  return `<article class="card${on ? ' on' : ''}" style="--c:var(--${c.c})" data-id="${c.id}">${band(c.dir)}
    <label class="chead" for="cb-${c.id}"><input type="checkbox" id="cb-${c.id}" ${on ? 'checked' : ''}><div><h4 class="ctitle">${esc(c.t)}</h4><p class="cop">${esc(c.op)}</p></div></label>
    <div class="cbody"><h4>What feels special</h4><ul class="special">${c.sp.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
    <h4>What could swing it</h4><ul class="swing">${c.sw.map(s => `<li class="${s[0]}${s[2] === 'price' ? ' price' : ''}">${esc(s[1])}</li>`).join('')}</ul></div>
    <div class="cfoot">${c.hotel ? roomSelect(data._places[c.hotel].hotel, c.id, state) : ''}${c.opts ? `<div class="opts" role="group" aria-label="${optLabel(c)}">${c.opts.map((o, i) => `<button type="button" data-opt="${i}" aria-pressed="${i === oi}">${esc(o.l)}</button>`).join('')}</div>` : ''}
    ${costRow(cardValue(c, state, nights, data._places), cardNights(c, result.itin), c.st === 'pub')}
    ${c.hotel ? `<p class="basis price">${esc(data._places[c.hotel].hotel.ratesNote)}</p>` : `<p class="basis price">${esc(basis(c, state, nights))}</p>`}
    ${c.links ? `<ul class="clinks">${c.links.map(l => `<li>${ext(l.u, l.l)}</li>`).join('')}</ul>` : ''}</div></article>`;
}

function stayHTML(st, data, state) {
  const on = !(state.stayOff || {})[st.id];
  const oi = state.opt[st.id] ?? st.def;
  const p = data._places[st.place];
  return `<article class="card stay${on ? ' on' : ''}" style="--c:var(--muted)" data-id="${st.id}" data-stay="1">
    <label class="chead" for="cb-${st.id}"><input type="checkbox" id="cb-${st.id}" ${on ? 'checked' : ''}><div><h4 class="ctitle">Night in ${esc(st.name)}${p.hotel ? ' · ' + esc(p.hotel.name) : ''}</h4><p class="cop">Overnight stay</p></div></label>
    <div class="cbody"><ul class="special"><li>${esc(p.staySpecial || '')}</li></ul>${p.ideas ? ideasList(p) : ''}</div>
    <div class="cfoot">${p.hotel ? roomSelect(p.hotel, st.id, state) : ''}<div class="opts" role="group" aria-label="Room">${(p.hotel ? p.hotel.counts : ROOM).map((l, i) => `<button type="button" data-opt="${i}" aria-pressed="${i === oi}">${esc(l)}</button>`).join('')}</div>
    ${p.hotel ? `<ul class="clinks"><li>${ext(p.hotel.url, p.hotel.name + ': guest rooms')}</li></ul>` : ''}
    ${costRow(p.hotel ? hotelRate(p.hotel, state, st.id).value : st.rates[oi], 1, !!p.hotel)}</div></article>`;
}

// Alternative cards beside a night that is a choice (the second night on the way down).
function choiceHTML(ch, data) {
  const cur = ch.options[ch.sel];
  return ch.options.map((o, i) => i === ch.sel ? '' : `<article class="card alt" style="--c:var(--muted)">
    <div class="chead"><div><p class="cop">Instead of: ${esc(cur.l)}</p><h4 class="ctitle">${esc(o.l)}</h4></div></div>
    <div class="cbody"><ul class="special"><li>${esc(o.d)}</li>${data._places[o.place].staySpecial ? `<li>${esc(data._places[o.place].staySpecial)}</li>` : ''}</ul>${data._places[o.place].ideas ? ideasList(data._places[o.place]) : ''}</div>
    <div class="cfoot"><button type="button" class="choose" data-choice="${esc(ch.key)}" data-val="${i}">Choose this instead</button></div></article>`).join('');
}

// One sequence in trip order: each step's heading (day and date), the card for that leg the first
// time it appears, then the overnight stay. Later steps on the same card refer back to it.
export function renderDiscovery(root, data, state, result, al) {
  const { itin, stays } = result;
  const byId = Object.fromEntries(data.cards.map(c => [c.id, c]));
  const stayById = Object.fromEntries(stays.map(st => [st.id, st]));
  const { groups, unused } = sequence(itin, data.cards, state);
  const fmt = n => new Date(n).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const seen = new Set();
  let h = '';
  groups.forEach(g => {
    const s = itin.steps[g.step];
    const d0 = al ? al.per[g.step].day : s.day;
    const date = al && al.startDate ? ' · ' + fmt(al.startDate + (d0 - 1) * 864e5) : '';
    const days = s.n > 1 ? `Days ${d0}–${d0 + s.n - 1}` : `Day ${d0}`;
    const again = s.owner && seen.has(s.owner) && !g.cards.includes(s.owner) && byId[s.owner] ? `<span>${esc(byId[s.owner].t)}: see the card above.</span>` : '';
    if (s.owner) seen.add(s.owner);
    h += `<div class="seq-h"><div class="seq-day">${days}${date}</div><h3>${esc(s.title)}</h3>${again}</div>`;
    const inner = g.cards.map(id => cardHTML(byId[id], data, state, result)).join('') + (g.stay && stayById[g.stay] ? stayHTML(stayById[g.stay], data, state) : '') + (g.choice ? choiceHTML(g.choice, data) : '');
    if (inner) h += `<div class="cards">${inner}</div>`;
  });
  if (unused.length) {
    h += `<div class="group-h"><h3>Not in the plan</h3><span>Tick to add back.</span></div><div class="cards">${unused.map(id => cardHTML(byId[id], data, state, result)).join('')}</div>`;
  }
  root.innerHTML = h;
}
