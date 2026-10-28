import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildItinerary, totals, toggle, staysFrom, cardValue, cardNights, alignSeason, KENNEL_RATE, DOGS } from '../js/plan.js';

const data = JSON.parse(readFileSync(new URL('../data/options.json', import.meta.url)));
const places = JSON.parse(readFileSync(new URL('../data/places.json', import.meta.url)));
const seasons = JSON.parse(readFileSync(new URL('../data/seasons.json', import.meta.url)));
const st = (sel, opt = {}) => ({ sel, opt, stayOff: {} });
const DEF = data.defaultSelection;

test('no flying: no flight cards and no flight segments in any plan', () => {
  assert.ok(!data.cards.some(c => ['jet', 'fly', 'xfer', 'drive'].includes(c.id)));
  for (const opt of [{}, { self: 0 }, { self: 2 }]) {
    for (const sel of [DEF, { ...DEF, rnw: 0, he6: 1 }]) {
      const it = buildItinerary(sel, opt);
      assert.ok(!it.segments.some(s => s.mode === 'flight'), 'flight segment found');
    }
  }
});

test('helicopter only appears with the Heritage cruises (no other access)', () => {
  assert.ok(!buildItinerary(DEF).segments.some(s => s.mode === 'heli'));
  assert.ok(buildItinerary({ ...DEF, rnw: 0, he6: 1 }).segments.some(s => s.mode === 'heli'));
});

test('default plan: one break each way, 11 nights', () => {
  const it = buildItinerary(DEF);
  assert.equal(it.nights, 11);
  assert.deepEqual(staysFrom(it, places).map(s => s.place), ['wlg', 'chc', 'tek', 'tea', 'wan', 'chc', 'wlg', 'akl']);
});

test('road stops apply both ways: direct, one break, two breaks', () => {
  const n = k => buildItinerary(DEF, { self: k }).nights;
  assert.equal(n(0), 9);
  assert.equal(n(1), 11);
  assert.equal(n(2), 13);
});

test('card night badges add up to the itinerary nights', () => {
  for (const sel of [DEF, { ...DEF, cp: 0, pdrive: 1 }, { ...DEF, rnw: 0, he6: 1 }]) for (const k of [0, 1, 2]) {
    const it = buildItinerary(sel, { self: k });
    const sum = data.cards.filter(c => sel[c.id]).reduce((a, c) => a + cardNights(c, it), 0);
    assert.equal(sum, it.nights);
  }
});

test('Picton drive replaces the Coastal Pacific both ways and is exclusive with it', () => {
  const s2 = toggle(data, st(DEF), 'pdrive', true);
  assert.ok(s2.sel.pdrive && !s2.sel.cp);
  const it = buildItinerary(s2.sel);
  assert.ok(!it.segments.some(x => x.label.startsWith('Coastal Pacific')));
  assert.equal(it.segments.filter(x => x.label.startsWith('Drive Picton') || x.label.startsWith('Drive Christchurch to Picton')).length, 2);
  assert.ok(staysFrom(it, places).some(x => x.place === 'pic'));
});

test('winter with the Picton drive: no Coastal Pacific blocker', () => {
  const a = alignSeason(buildItinerary({ ...DEF, cp: 0, pdrive: 1, rnw: 0, rnn: 1 }), seasons, 'winter27');
  assert.ok(!a.blockers.some(b => b.includes('Coastal Pacific')));
});

test('every night is a stay, the Auckland card night, or aboard', () => {
  for (const sel of [DEF, { ...DEF, rnw: 0, he6: 1 }, { ne: 1, cp: 1, self: 1, fj1: 1 }]) {
    const it = buildItinerary(sel, { self: 2 });
    const counted = it.steps.reduce((a, s) => a + (s.night ? s.n : 0), 0);
    assert.equal(counted, it.nights);
  }
});

test('stays have prices and unique ids', () => {
  const stays = staysFrom(buildItinerary(DEF, { self: 2 }), places);
  stays.forEach(s => assert.ok(s.hotel || s.rates.length >= 2, s.place));
  assert.equal(new Set(stays.map(s => s.id)).size, stays.length);
});

test('kennel cost scales with trip days', () => {
  const k = data.cards.find(c => c.id === 'kennel');
  assert.equal(cardValue(k, st(DEF), 12), KENNEL_RATE * DOGS * 13);
});

test('choosing a cruise replaces the previous one', () => {
  assert.ok(!toggle(data, st(DEF), 'he4', true).sel.rnw);
});

test('unticking a stay lowers the total but not the nights', () => {
  const s = st(DEF);
  const a = totals(data, s, places);
  const b = totals(data, { ...s, stayOff: { [a.stays[0].id]: 1 } }, places);
  assert.equal(a.itin.nights, b.itin.nights);
  assert.equal(a.total - b.total, a.stays[0].rates[0]);
});

test('every route waypoint exists in places', () => {
  for (const opt of [{}, { self: 0 }, { self: 2 }])
    for (const sel of [DEF, { ...DEF, rnw: 0, fj1: 1 }, { ...DEF, cp: 0, pdrive: 1 }, { ...DEF, rnw: 0, he4: 1 }, { ...DEF, rnw: 0, he6: 1 }])
      buildItinerary(sel, opt).segments.forEach(sg => sg.path.forEach(p => assert.ok(places[p], `missing place ${p}`)));
});

test('sandflies: spring and autumn fail, winter and September do not', () => {
  const it = buildItinerary(DEF);
  for (const k of ['spring27', 'autumn28']) assert.ok(alignSeason(it, seasons, k).blockers.some(b => b.startsWith('Sandflies')), k);
  for (const k of ['winter27', 'sept27']) assert.ok(!alignSeason(it, seasons, k).blockers.some(b => b.startsWith('Sandflies')), k);
});

test('winter: Coastal Pacific and Wanderer are blockers; Navigator is not', () => {
  const a = alignSeason(buildItinerary(DEF), seasons, 'winter27');
  assert.ok(a.blockers.some(b => b.includes('Coastal Pacific')));
  assert.ok(a.blockers.some(b => b.includes('Wanderer')));
  const n = alignSeason(buildItinerary({ ...DEF, rnw: 0, rnn: 1 }), seasons, 'winter27');
  assert.ok(!n.blockers.some(b => b.includes('Navigator')));
});

test('September with the Heritage 6-night: no sandfly blocker, Coastal Pacific flagged to confirm', () => {
  const a = alignSeason(buildItinerary({ ...DEF, rnw: 0, he6: 1 }), seasons, 'sept27');
  assert.equal(a.blockers.length, 0);
  assert.ok(a.notes.flat().some(n => n.text.includes('start date unconfirmed')));
});

test('card links are https and every rail and cruise card has one', () => {
  ['ne', 'isl', 'cp', 'rnw', 'rnn', 'fj1', 'he4', 'he6'].forEach(id => assert.ok(data.cards.find(x => x.id === id).links?.length, id));
  data.cards.flatMap(c => c.links || []).forEach(l => assert.match(l.u, /^https:\/\//));
});

test('every card has a direction', () => {
  data.cards.forEach(c => assert.ok(['out', 'ret', 'mid', 'both'].includes(c.dir), c.id));
});

test('season check: default plan in spring needs one waiting day', () => {
  const a = alignSeason(buildItinerary(DEF), seasons, 'spring27');
  assert.equal(a.added, 1);
  assert.ok(a.notes.flat().some(n => n.level === 'add'));
});

test('hidden cards: the 1-night Milford and 6-night Heritage cruises are hidden', () => {
  const hidden = data.cards.filter(c => c.hidden).map(c => c.id).sort();
  assert.deepEqual(hidden, ['fj1', 'he6']);
});

test('Auckland nights: The Hotel Britomart rates by room, plan, month and count', async () => {
  const { hotelRate } = await import('../js/plan.js');
  const h = places.akl.hotel;
  assert.equal(h.name, 'The Hotel Britomart');
  assert.equal(h.rooms[h.defRoom].n, 'City View Room Twin');
  const base = { sel: DEF, opt: {}, stayOff: {} };
  assert.equal(hotelRate(h, { ...base, season: 'sept27' }, 'akl').value, 439);
  assert.equal(hotelRate(h, { ...base, season: 'winter27' }, 'akl').value, 419);
  assert.equal(hotelRate(h, { ...base, season: 'sept27', opt: { 'akl-plan': 0, akl: 1 } }, 'akl').value, 790);
  assert.equal(data.cards.find(c => c.id === 'akl').hotel, 'akl');
});

test('every overnight place except Auckland has hotel ideas with https links', () => {
  for (const k of ['wlg', 'pic', 'chc', 'tek', 'wan', 'tea']) {
    assert.ok(places[k].ideas?.length >= 2, k);
    places[k].ideas.forEach(i => assert.match(i.u, /^https:\/\//));
  }
});

test('station and ferry nights list walking distance for every idea', () => {
  for (const k of ['wlg', 'pic', 'chc']) {
    assert.ok(places[k].transitNote, k);
    places[k].ideas.forEach(i => assert.ok(i.walk, `${k}: ${i.n}`));
  }
});
