import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildItinerary, totals, toggle, staysFrom, cardValue, cardNights, alignSeason, fixedDates, sequence, KENNEL_RATE, DOGS } from '../js/plan.js';

const data = JSON.parse(readFileSync(new URL('../data/options.json', import.meta.url)));
const places = JSON.parse(readFileSync(new URL('../data/places.json', import.meta.url)));
const seasons = JSON.parse(readFileSync(new URL('../data/seasons.json', import.meta.url)));
const bookings = JSON.parse(readFileSync(new URL('../data/bookings.json', import.meta.url)));
const st = (sel, opt = {}) => ({ sel, opt, stayOff: {} });
const DEF = { akl: 1, kennel: 1, ne: 1, isl: 1, cp: 1, self: 1, rnw: 1 }; // reference plan used by most tests
const PREF = data.defaultSelection;

test('no flying: no flight cards and no flight segments in any plan', () => {
  assert.ok(!data.cards.some(c => ['jet', 'fly', 'xfer', 'drive'].includes(c.id)));
  for (const opt of [{}, { self: 0 }, { self: 2 }]) {
    for (const sel of [DEF, PREF]) {
      const it = buildItinerary(sel, opt);
      assert.ok(!it.segments.some(s => s.mode === 'flight'), 'flight segment found');
    }
  }
});

test('default plan: two Hermitage nights down, Wanaka back, 12 nights', () => {
  const it = buildItinerary(DEF);
  assert.equal(it.nights, 12);
  const stays = staysFrom(it, places);
  assert.deepEqual(stays.map(s => s.place), ['wlg', 'chc', 'mtc', 'mtc', 'tea', 'wan', 'chc', 'wlg', 'akd']);
  assert.equal(new Set(stays.map(s => s.id)).size, stays.length);
});

test('road stops: direct, Hermitage down and Wanaka back, two breaks', () => {
  const n = k => buildItinerary(DEF, { self: k }).nights;
  assert.equal(n(0), 9);
  assert.equal(n(1), 12);
  assert.equal(n(2), 13);
});

test('card night badges add up to the itinerary nights', () => {
  for (const sel of [DEF, PREF]) for (const k of [0, 1, 2]) {
    const it = buildItinerary(sel, { self: k });
    const sum = data.cards.filter(c => sel[c.id]).reduce((a, c) => a + cardNights(c, it), 0);
    assert.equal(sum, it.nights);
  }
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

test('card links are https and every rail and cruise card has one', () => {
  ['ne', 'isl', 'cp', 'rnw', 'wfer'].forEach(id => assert.ok(data.cards.find(x => x.id === id).links?.length, id));
  data.cards.flatMap(c => c.links || []).forEach(l => assert.match(l.u, /^https:\/\//));
});

test('every card has a direction', () => {
  data.cards.forEach(c => assert.ok(['out', 'ret', 'mid', 'both'].includes(c.dir), c.id));
});

test('season check: with a daily Coastal Pacific, spring needs no waiting day for either stops option', () => {
  assert.equal(alignSeason(buildItinerary(DEF), seasons, 'spring27').added, 0);
  assert.equal(alignSeason(buildItinerary({ ...DEF, self: 1 }, { self: 2 }), seasons, 'spring27').added, 0);
  assert.ok(seasons.seasons.spring27.cp.length === 7);
});

test('deselected alternatives are gone: every card is in the chosen plan', () => {
  assert.deepEqual(data.cards.map(c => c.id).sort(), Object.keys(PREF).sort());
  assert.deepEqual(Object.keys(seasons.seasons), ['spring27']);
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
  for (const k of ['wlg', 'pic', 'chc', 'tek', 'mtc', 'wan', 'tea']) {
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

test('locked-in plan: RealNZ Wanderer Tue 5 Oct 2027, Coastal Pacific, leave Wed 29 Sep', () => {
  assert.deepEqual(Object.keys(PREF).sort(), ['akl', 'cp', 'handover', 'isl', 'kennel', 'ne', 'rnw', 'self', 'wfer'].sort());
  assert.equal(data.defaultSeason, 'spring27');
  const state = { sel: PREF, opt: {}, stayOff: {} };
  assert.deepEqual(fixedDates(data.cards, state), { rnw: '2027-10-05' });
  const it = buildItinerary(PREF);
  const a = alignSeason(it, seasons, 'spring27', fixedDates(data.cards, state));
  assert.equal(a.blockers.length, 0);
  const day = i => new Date(a.startDate + (a.per[i].day - 1) * 864e5).toISOString().slice(0, 10);
  assert.equal(day(it.steps.findIndex(s => s.svc === 'cruise:rnw')), '2027-10-05');
  assert.equal(new Date(a.startDate).toISOString().slice(0, 10), '2027-09-29');
  assert.equal(a.days - 1, 12);
  assert.equal(a.added, 0);
  assert.equal(day(it.steps.findIndex(s => /The Hermitage/.test(s.title))), '2027-10-02');
  assert.equal(day(it.steps.findIndex(s => /to Te Anau/.test(s.title))), '2027-10-04');
  assert.ok(!it.segments.some(s => s.mode === 'heli' || s.mode === 'flight'));
});

test('discovery sequence: legs and stays in trip order, each card once', () => {
  const it = buildItinerary(PREF);
  const { groups, unused } = sequence(it, data.cards, { sel: PREF });
  assert.equal(groups.length, it.steps.length);
  assert.deepEqual(groups.flatMap(g => g.cards), ['handover', 'akl', 'kennel', 'wfer', 'ne', 'isl', 'cp', 'self', 'rnw']);
  assert.deepEqual(unused, []);
  const stays = staysFrom(it, places).map(s => s.id);
  assert.deepEqual(groups.map(g => g.stay).filter(Boolean), stays);
});

test('second night on the way down: Hermitage, Wanaka, Hawea or Arrowtown, same dates either way', () => {
  const places2 = o => staysFrom(buildItinerary(PREF, { n2: o }), places).map(s => s.place).slice(0, 5);
  assert.deepEqual(places2(0), ['wlg', 'chc', 'mtc', 'mtc', 'tea']);
  assert.deepEqual(places2(1), ['wlg', 'chc', 'mtc', 'wan', 'tea']);
  assert.deepEqual(places2(2), ['wlg', 'chc', 'mtc', 'haw', 'tea']);
  assert.deepEqual(places2(3), ['wlg', 'chc', 'mtc', 'arr', 'tea']);
  for (const o of [0, 1, 2, 3]) {
    const it = buildItinerary(PREF, { n2: o });
    assert.equal(it.nights, 12);
    const g = sequence(it, data.cards, { sel: PREF }).groups.find(x => x.choice);
    assert.equal(g.choice.sel, o);
    assert.equal(it.steps[g.step].night.place, ['mtc', 'wan', 'haw', 'arr'][o]);
    assert.ok(places.arr && places[g.choice.options[o].place]);
  }
});

test('night on the way back: Wanaka or Lake Hawea', () => {
  for (const [o, pl] of [[0, 'wan'], [1, 'haw']]) {
    const it = buildItinerary(PREF, { r1: o });
    assert.equal(it.nights, 12);
    const g = sequence(it, data.cards, { sel: PREF }).groups.find(x => x.choice && x.choice.key === 'r1');
    assert.equal(it.steps[g.step].night.place, pl);
  }
});


test('off Waiheke without our car: Finn or one-day rentals, foot ferry both ways, no SeaLink', () => {
  for (const w of [0, 1]) {
    const it = buildItinerary(PREF, { wfer: w });
    assert.ok(it.segments.some(s => s.label.startsWith('Fullers')));
    assert.ok(!it.segments.some(s => s.label.startsWith('SeaLink')));
    assert.equal(it.nights, 12);
  }
  assert.match(buildItinerary(PREF, { wfer: 0 }).steps[0].detail, /Finn/);
  assert.ok(buildItinerary(PREF, { wfer: 1 }).segments.some(s => s.label.startsWith('Rental car')));
});

test('the cruise is booked: Wanderer twin-share Room 11 on Tue 5 Oct', () => {
  const rnw = data.cards.find(c => c.id === 'rnw');
  assert.equal(rnw.date, '2027-10-05');
  assert.ok(!rnw.opts);
  assert.match(rnw.op, /Room 11/);
  assert.equal(rnw.v, 2278);
  assert.equal(bookings.legs.rnw.status, 'confirmed');
});

test('bookings file: a status for every leg card and every night of the trip', () => {
  const OK = ['none', 'booked', 'confirmed'];
  assert.deepEqual(Object.keys(bookings.legs).sort(), data.cards.map(c => c.id).sort());
  Object.values(bookings.legs).forEach(b => assert.ok(OK.includes(b.status)));
  const it = buildItinerary(PREF);
  const a = alignSeason(it, seasons, 'spring27', fixedDates(data.cards, { sel: PREF, opt: {} }));
  const nights = [];
  it.steps.forEach((s, i) => {
    if (s.night && s.night.kind === 'stay') nights.push(new Date(a.startDate + (a.per[i].day - 1) * 864e5).toISOString().slice(0, 10));
  });
  assert.deepEqual(Object.keys(bookings.nights).sort(), nights.sort());
  Object.values(bookings.nights).forEach(b => assert.ok(OK.includes(b.status)));
});
