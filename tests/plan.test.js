import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildItinerary, totals, toggle, staysFrom, cardValue, KENNEL_RATE, DOGS } from '../js/plan.js';

const data = JSON.parse(readFileSync(new URL('../data/options.json', import.meta.url)));
const places = JSON.parse(readFileSync(new URL('../data/places.json', import.meta.url)));
const st = sel => ({ sel, opt: {}, stayOff: {} });
const DEF = data.defaultSelection;

test('default plan: self-drive, Wanderer, rail home is 12 nights', () => {
  const it = buildItinerary(DEF);
  assert.equal(it.nights, 12);
  assert.equal(it.days, 13);
});

test('nights match card night badges', () => {
  // card n values plus one extra night when self-drive and rail home are combined
  const sum = data.cards.filter(c => DEF[c.id] && c.n).reduce((a, c) => a + c.n, 0);
  assert.equal(buildItinerary(DEF).nights, sum + 1);
});

test('every night is a stay, the Auckland card night, or aboard', () => {
  for (const sel of [DEF, { akl: 1, ne: 1, isl: 1, cp: 1, jet: 1, xfer: 1, rnw: 1, fly: 1 }, { ne: 1, isl: 1, cp: 1, drive: 1, he6: 1, railh: 1 }]) {
    const it = buildItinerary(sel);
    const counted = it.steps.reduce((a, s) => a + (s.night ? s.n : 0), 0);
    assert.equal(counted, it.nights);
  }
});

test('stays exist for each place with a price', () => {
  const stays = staysFrom(buildItinerary(DEF), places);
  assert.ok(stays.length > 0);
  stays.forEach(s => assert.equal(s.rates.length, 3, s.place));
  assert.deepEqual(stays.map(s => s.place), ['wlg', 'chc', 'tek', 'tea', 'wan', 'tek', 'chc', 'wlg', 'akl']);
  assert.equal(new Set(stays.map(s => s.id)).size, stays.length, 'stay ids unique');
});

test('kennel cost scales with trip days', () => {
  const k = data.cards.find(c => c.id === 'kennel');
  assert.equal(cardValue(k, st(DEF), 12), KENNEL_RATE * DOGS * 13);
});

test('self-drive with rail home uses the drive-back price', () => {
  const r = data.cards.find(c => c.id === 'railh');
  assert.equal(cardValue(r, st(DEF), 12), 2650);
  assert.equal(cardValue(r, st({ railh: 1, jet: 1 }), 10), r.v);
});

test('choosing a cruise replaces the previous one', () => {
  const s2 = toggle(data, st(DEF), 'he4', true);
  assert.ok(s2.sel.he4);
  assert.ok(!s2.sel.rnw);
});

test('jet and self-drive are mutually exclusive', () => {
  const s2 = toggle(data, st(DEF), 'jet', true);
  assert.ok(s2.sel.jet && !s2.sel.self);
});

test('unticking a stay lowers the total but not the nights', () => {
  const s = st(DEF);
  const a = totals(data, s, places);
  const off = { ...s, stayOff: { [a.stays[0].id]: 1 } };
  const b = totals(data, off, places);
  assert.equal(a.itin.nights, b.itin.nights);
  assert.equal(a.total - b.total, a.stays[0].rates[0]);
});

test('every route waypoint exists in places', () => {
  for (const sel of [DEF, { akl: 1, ne: 1, isl: 1, cp: 1, jet: 1, xfer: 1, fj1: 1, fly: 1 }, { ne: 1, cp: 1, drive: 1, he6: 1, railh: 1 }, { he4: 1, fly: 1, taxi: 1, ne: 1 }]) {
    buildItinerary(sel).segments.forEach(sg => sg.path.forEach(p => assert.ok(places[p], `missing place ${p}`)));
  }
});
