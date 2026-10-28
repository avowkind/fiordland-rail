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
  assert.ok(!data.cards.some(c => ['jet', 'fly', 'xfer'].includes(c.id)));
  for (const opt of [{}, { self: 0, back: 0 }, { self: 2, back: 1 }]) {
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

test('default plan: Tekapo on the way down, Wanaka and Tekapo on the way back, 12 nights', () => {
  const it = buildItinerary(DEF);
  assert.equal(it.nights, 12);
  const stays = staysFrom(it, places).map(s => s.place);
  assert.deepEqual(stays, ['wlg', 'chc', 'tek', 'tea', 'wan', 'tek', 'chc', 'wlg', 'akl']);
});

test('drive options: direct, one break or two breaks change the nights', () => {
  const n = (self, back) => buildItinerary(DEF, { self, back }).nights;
  assert.equal(n(0, 0), 9);
  assert.equal(n(1, 1), 11);
  assert.equal(n(2, 2), 13);
});

test('card night badges add up to the itinerary nights', () => {
  for (const opt of [{}, { self: 0, back: 0 }, { self: 2, back: 1 }]) {
    const s = st(DEF, opt);
    const sum = data.cards.filter(c => DEF[c.id]).reduce((a, c) => a + cardNights(c, s), 0);
    assert.equal(buildItinerary(DEF, opt).nights, sum);
  }
});

test('every night is a stay, the Auckland card night, or aboard', () => {
  for (const sel of [DEF, { ...DEF, rnw: 0, he6: 1 }, { ne: 1, cp: 1, self: 1, fj1: 1, back: 1, railh: 1 }]) {
    const it = buildItinerary(sel, { self: 2, back: 0 });
    const counted = it.steps.reduce((a, s) => a + (s.night ? s.n : 0), 0);
    assert.equal(counted, it.nights);
  }
});

test('stays have prices and unique ids', () => {
  const stays = staysFrom(buildItinerary(DEF, { self: 2, back: 2 }), places);
  stays.forEach(s => assert.equal(s.rates.length, 3, s.place));
  assert.equal(new Set(stays.map(s => s.id)).size, stays.length);
});

test('kennel cost scales with trip days', () => {
  const k = data.cards.find(c => c.id === 'kennel');
  assert.equal(cardValue(k, st(DEF), 12), KENNEL_RATE * DOGS * 13);
});

test('road back is included in the rental; no chauffeured option', () => {
  assert.ok(!data.cards.some(c => c.id === 'drive'));
  assert.equal(cardValue(data.cards.find(c => c.id === 'back'), st(DEF), 12), 0);
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
  for (const opt of [{}, { self: 0, back: 0 }, { self: 2, back: 1 }])
    for (const sel of [DEF, { ...DEF, rnw: 0, fj1: 1 }, { ...DEF, rnw: 0, he4: 1 }, { ...DEF, rnw: 0, he6: 1 }])
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

test('spring rail days line up with a Wednesday start for the default plan', () => {
  const a = alignSeason(buildItinerary(DEF), seasons, 'spring27');
  assert.equal(a.added, 0);
  assert.equal(a.startLabel, 'Wed');
});

test('card links are https and every rail and cruise card has one', () => {
  ['ne', 'isl', 'cp', 'rnw', 'rnn', 'fj1', 'he4', 'he6', 'railh'].forEach(id => assert.ok(data.cards.find(x => x.id === id).links?.length, id));
  data.cards.flatMap(c => c.links || []).forEach(l => assert.match(l.u, /^https:\/\//));
});

test('every card has a direction', () => {
  data.cards.forEach(c => assert.ok(['out', 'ret', 'mid', 'both'].includes(c.dir), c.id));
});
