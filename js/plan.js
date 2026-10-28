// Pure itinerary and budget logic. No DOM access, so it can be unit-tested with node --test.
// Agreed 28 Oct 2026: no flying (helicopter only where a cruise has no other access);
// Christchurch to Fiordland and back is by road, either direct or broken at good places.

export const KENNEL_RATE = 37;   // NZD per small dog per day, Brookby Lodge price list (checked 27 Oct 2026)
export const DOGS = 2;

const CRUISES = {
  rnw: { name: 'RealNZ Wanderer, Doubtful Sound', nights: 2, kind: 'doubtful' },
  rnn: { name: 'RealNZ Navigator, Doubtful Sound', nights: 2, kind: 'doubtful' },
  fj1: { name: 'Fiordland Jewel, Milford Sound', nights: 1, kind: 'milford' },
  he4: { name: 'Heritage Explorer, Dusky and Doubtful', nights: 4, kind: 'heli-dusky' },
  he6: { name: 'Heritage Explorer, Southern Fiords', nights: 6, kind: 'heli-pres' }
};

const P = {
  carFerry: ['kpt', 'hmb'],
  toKennels: ['hmb', 'bro', 'akl'],
  homeFromAkl: ['akl', 'bro', 'hmb'],
  neSouth: ['akl', 'pap', 'ham', 'oto', 'tmn', 'rau', 'npk', 'ohk', 'tai', 'mtn', 'pmr', 'ppm', 'wlg'],
  strait: ['wlg', 'cks', 'tor', 'qcs', 'pic'],
  cpSouth: ['pic', 'blm', 'sed', 'kai', 'chv', 'wpa', 'chc'],
  chcTek: ['chc', 'ash', 'ger', 'fai', 'tek'],
  tekTea: ['tek', 'twz', 'oma', 'lin', 'tar', 'cro', 'arj', 'zqn', 'kin', 'mos', 'tea'],
  tekWan: ['tek', 'twz', 'oma', 'lin', 'tar', 'lug', 'wan'],
  wanTea: ['wan', 'car', 'crn', 'arj', 'zqn', 'kin', 'mos', 'tea'],
  teaMan: ['tea', 'man'],
  lake: ['man', 'lm1', 'wam'],
  wilmot: ['wam', 'wil', 'dco'],
  doubtful: ['dco', 'ds1', 'ds2', 'dsm', 'ds2', 'ds1', 'dco'],
  milfordRd: ['tea', 'tad', 'kfl', 'hom', 'mil'],
  milfordSd: ['mil', 'mmo', 'mil'],
  duskyCruise: ['dus', 'brk', 'ds2', 'ds1', 'dco'],
  presCruise: ['pre', 'dus', 'brk', 'ds2', 'ds1', 'dco']
};
const rev = a => [...a].reverse();
const join = (...parts) => parts.reduce((acc, p) => acc.length && acc[acc.length - 1] === p[0] ? acc.concat(p.slice(1)) : acc.concat(p), []);

export const SOUTH_STOPS = ['Direct', 'Break at Tekapo', 'Tekapo and Wanaka'];
export const BACK_STOPS = ['Direct', 'Break at Wanaka', 'Wanaka and Tekapo'];

export function cruiseOf(sel) {
  return Object.keys(CRUISES).find(k => sel[k]) || null;
}
const driveCard = sel => sel.self ? 'self' : null;
const southStops = (sel, opt) => { const k = driveCard(sel); return k ? (opt[k] ?? 1) : null; };
const backStops = opt => opt.back ?? 2;

// Build the day-by-day itinerary and the map route from the selection.
export function buildItinerary(sel, opt = {}) {
  const steps = [];
  const segments = [];
  const seg = (mode, path, label) => segments.push({ mode, path, label });
  const step = (title, detail, modes, night, n = night ? 1 : 0) => steps.push({ title, detail, modes, night, n });
  const tag = svc => { steps[steps.length - 1].svc = svc; };
  const who = sel.self ? 'Drive ourselves' : 'By road';

  // Leaving home
  if (sel.akl) {
    seg('ferry', P.carFerry, 'Sealink car ferry');
    seg('drive', P.toKennels, 'Drive to Brookby, then the city');
    step('Waiheke to Brookby, then Auckland',
      'Sealink car ferry to Half Moon Bay, drop Poppy and Rua at Brookby Lodge, evening in the city.',
      ['ferry', 'drive'], { place: 'akl', kind: 'card' });
  }

  // Rail south
  if (sel.ne) {
    if (!sel.akl) {
      seg('ferry', P.carFerry, 'Sealink car ferry');
      seg('drive', P.toKennels, 'Brookby, then the station');
    }
    seg('rail', P.neSouth, 'Northern Explorer');
    step('Northern Explorer to Wellington',
      (sel.akl ? 'Walk to Strand station. ' : 'Early start from Waiheke and a dawn kennel drop-off. ') +
      'Departs 07:45 (Mon, Thu, Sat); volcanic plateau and the Raurimu Spiral; arrives Wellington about 18:25.',
      ['rail'], { place: 'wlg', kind: 'stay' });
    tag('neS');
  }
  if (sel.isl || sel.cp) {
    if (sel.isl) seg('ferry', P.strait, 'Interislander');
    if (sel.cp) seg('rail', P.cpSouth, 'Coastal Pacific');
    const t = sel.isl && sel.cp ? 'Interislander and Coastal Pacific to Christchurch'
            : sel.isl ? 'Interislander to Picton' : 'Coastal Pacific to Christchurch';
    step(t, (sel.isl ? '08:45 sailing through Tory Channel; bags checked through. ' : '') +
      (sel.cp ? '13:40 train along the Kaikōura coast; arrives 19:30.' : ''),
      [sel.isl && 'ferry', sel.cp && 'rail'].filter(Boolean),
      sel.cp ? { place: 'chc', kind: 'stay' } : null);
    if (sel.cp) tag('cp');
  }

  // Christchurch to Fiordland, by road
  const ss = southStops(sel, opt);
  if (ss === 0) {
    seg('drive', join(P.chcTek, P.tekTea), who);
    step(`${who}: Christchurch to Te Anau direct`, 'One long day, about 7–8 hours, via Tekapo, the Lindis Pass and Central Otago.', ['drive'], { place: 'tea', kind: 'stay' });
  } else if (ss === 1) {
    seg('drive', P.chcTek, who);
    step(`${who} to Lake Tekapo`, 'About 3 hours across the Canterbury Plains; evening under the Dark Sky Reserve.', ['drive'], { place: 'tek', kind: 'stay' });
    seg('drive', P.tekTea, who);
    step('Over the Lindis Pass to Te Anau', 'About 4.5 hours: Lake Pukaki, the Lindis Pass, Central Otago, Lake Wakatipu.', ['drive'], { place: 'tea', kind: 'stay' });
  } else if (ss === 2) {
    seg('drive', P.chcTek, who);
    step(`${who} to Lake Tekapo`, 'About 3 hours across the Canterbury Plains; evening under the Dark Sky Reserve.', ['drive'], { place: 'tek', kind: 'stay' });
    seg('drive', P.tekWan, who);
    step('Lindis Pass to Wanaka', 'About 2.5 hours, with time at Lake Pukaki and Aoraki/Mt Cook views.', ['drive'], { place: 'wan', kind: 'stay' });
    seg('drive', P.wanTea, who);
    step('Crown Range to Te Anau', 'About 3.5 hours over the Crown Range and along Lake Wakatipu.', ['drive'], { place: 'tea', kind: 'stay' });
  } else if (cruiseOf(sel)) {
    step('Christchurch to Fiordland not chosen yet', 'Tick Drive ourselves.', [], null);
  }

  // Cruise
  const ck = cruiseOf(sel);
  let endAt = 'tea';
  if (ck) {
    const c = CRUISES[ck];
    if (c.kind === 'doubtful') {
      seg('drive', P.teaMan, 'To Manapouri');
      seg('ferry', P.lake, 'Lake Manapouri');
      seg('drive', P.wilmot, 'Wilmot Pass');
      seg('cruise', P.doubtful, c.name);
      seg('drive', rev(P.wilmot), 'Wilmot Pass');
      seg('ferry', rev(P.lake), 'Lake Manapouri');
      endAt = 'man';
      step(c.name, (sel.self ? 'Drive 30 min to Manapouri and park' : 'To Manapouri') + ', cross the lake and Wilmot Pass to Deep Cove, then two nights aboard: kayaking, dolphins, fur seals and penguins if we are lucky. No aircraft.',
        ['drive', 'ferry', 'cruise'], { place: 'dco', kind: 'aboard' }, c.nights);
    } else if (c.kind === 'milford') {
      seg('drive', P.milfordRd, 'Milford Road');
      seg('cruise', P.milfordSd, c.name);
      endAt = 'mil';
      step(c.name, 'Milford Road through the Homer Tunnel, board at 15:10; sunset and sunrise under Mitre Peak. No aircraft.',
        ['drive', 'cruise'], { place: 'mil', kind: 'aboard' }, c.nights);
    } else {
      const start = c.kind === 'heli-pres' ? 'pre' : 'dus';
      seg('heli', ['tea', start], 'Helicopter (only access)');
      seg('cruise', c.kind === 'heli-pres' ? P.presCruise : P.duskyCruise, c.name);
      seg('drive', rev(P.wilmot), 'Wilmot Pass');
      seg('ferry', rev(P.lake), 'Lake Manapouri');
      endAt = 'man';
      step(c.name, `Helicopter from Te Anau to ${c.kind === 'heli-pres' ? 'Preservation Inlet' : 'Dusky Sound'}: allowed only because there is no other way in. Then ${c.nights} nights aboard with naturalist guides.`,
        ['heli', 'cruise'], { place: start, kind: 'aboard' }, c.nights);
    }
    tag('cruise:' + ck);
  }
  const backToTea = endAt === 'man' ? rev(P.teaMan) : endAt === 'mil' ? rev(P.milfordRd) : ['tea'];

  // Back to Christchurch by road
  if (sel.back) {
    const bs = backStops(opt);
    const by = sel.self ? 'Drive' : 'By road';
    if (bs === 0) {
      seg('drive', join(backToTea, rev(P.tekTea), rev(P.chcTek)), `${by} back`);
      step(`${by} back to Christchurch direct`, 'Disembark around midday and drive about 8 hours via the Lindis Pass and Tekapo.' + (sel.self ? ' Return the car.' : ''), ['drive'], { place: 'chc', kind: 'stay' });
    } else if (bs === 1) {
      seg('drive', join(backToTea, rev(P.wanTea)), `${by} back`);
      step(`${by} to Wanaka`, 'Disembark and head north over the Crown Range, about 3.5 hours.', ['drive'], { place: 'wan', kind: 'stay' });
      seg('drive', join(rev(P.tekWan), rev(P.chcTek)), `${by} back`);
      step('Wanaka to Christchurch', 'About 5.5 hours over the Lindis Pass and past Tekapo.' + (sel.self ? ' Return the car.' : ''), ['drive'], { place: 'chc', kind: 'stay' });
    } else {
      seg('drive', join(backToTea, rev(P.wanTea)), `${by} back`);
      step(`${by} to Wanaka`, 'Disembark and head north over the Crown Range, about 3.5 hours.', ['drive'], { place: 'wan', kind: 'stay' });
      seg('drive', rev(P.tekWan), `${by} back`);
      step('Lindis Pass to Lake Tekapo', 'A gentle 2.5 hours back over the pass.', ['drive'], { place: 'tek', kind: 'stay' });
      seg('drive', rev(P.chcTek), `${by} back`);
      step('Tekapo to Christchurch', 'About 3 hours.' + (sel.self ? ' Return the car.' : ''), ['drive'], { place: 'chc', kind: 'stay' });
    }
  } else if (ck) {
    step('Road back to Christchurch not chosen yet', 'Tick Road back to Christchurch.', [], null);
  }

  // Rail home
  const homeLeg = () => {
    seg('drive', P.homeFromAkl, 'Collect the dogs');
    seg('ferry', rev(P.carFerry), 'Sealink home');
  };
  if (sel.railh) {
    seg('rail', rev(P.cpSouth), 'Coastal Pacific north');
    seg('ferry', rev(P.strait), 'Interislander');
    step('Coastal Pacific and ferry to Wellington', 'Coastal Pacific departs Christchurch 07:00, arrives Picton 12:40; 14:15 Interislander arrives Wellington 17:45.', ['rail', 'ferry'], { place: 'wlg', kind: 'stay' });
    tag('cp');
    seg('rail', rev(P.neSouth), 'Northern Explorer north');
    step('Northern Explorer to Auckland', 'Depart Wellington 07:55 (Wed, Fri, Sun), arrive Auckland Strand about 18:50–19:00. The North Island again in reverse.', ['rail'], { place: 'akl', kind: 'stay' });
    tag('neN');
    homeLeg();
    step('Collect the dogs and home', 'Brookby Lodge, then the Sealink back to Waiheke.', ['drive', 'ferry'], null);
  } else {
    step('Rail home not chosen yet', 'Tick Rail home.', [], null);
  }

  // Day numbers and stay ids
  let day = 1;
  const seen = {};
  steps.forEach(s => {
    s.day = day;
    day += s.n;
    if (s.night && s.night.kind === 'stay') {
      seen[s.night.place] = (seen[s.night.place] || 0) + 1;
      s.night.id = `st-${s.night.place}-${seen[s.night.place]}`;
    }
  });
  const nights = steps.reduce((a, s) => a + s.n, 0);
  return { steps, segments, nights, days: nights + 1 };
}

// Nights a card adds, for its badge.
export function cardNights(card, state) {
  if (card.id === 'self') return 1 + (state.opt[card.id] ?? card.def);
  if (card.id === 'back') return 1 + (state.opt.back ?? card.def);
  return card.n || 0;
}

export function cardValue(card, state, nights) {
  if (card.dyn === 'kennel') return KENNEL_RATE * DOGS * (nights + 1);
  if (card.id === 'back') return 0; // included in the rental
  if (card.v !== undefined) return card.v;
  if (card.opts) return card.opts[state.opt[card.id] ?? card.def].v;
  return 0;
}

export function staysFrom(itin, places) {
  const ci = itin.steps.findIndex(s => s.svc && s.svc.startsWith('cruise:'));
  return itin.steps.filter(s => s.night && s.night.kind === 'stay').map(s => ({
    dir: ci < 0 || itin.steps.indexOf(s) < ci ? 'out' : 'ret',
    id: s.night.id, place: s.night.place, name: places[s.night.place].name,
    why: s.title, rates: places[s.night.place].stay
  }));
}

export function totals(data, state, places) {
  const itin = buildItinerary(state.sel, state.opt);
  let total = 0, count = 0;
  data.cards.forEach(c => { if (state.sel[c.id]) { total += cardValue(c, state, itin.nights); count++; } });
  const stays = staysFrom(itin, places);
  let stayCount = 0;
  stays.forEach(st => {
    if (!(state.stayOff || {})[st.id]) { total += st.rates[state.opt[st.id] ?? 0]; stayCount++; }
  });
  return { total, count, stays, stayCount, itin };
}

// Ticking a card may untick others in the same exclusive group or exclusive set.
export function toggle(data, state, id, on) {
  const sel = { ...state.sel };
  const c = data.cards.find(x => x.id === id);
  if (!c) return state;
  if (on) {
    const g = data.groups.find(x => x.id === c.g);
    if (g && g.excl) data.cards.filter(x => x.g === c.g && x.id !== id).forEach(x => delete sel[x.id]);
    if (c.excl) data.cards.filter(x => x.excl === c.excl && x.id !== id).forEach(x => delete sel[x.id]);
    sel[id] = 1;
  } else delete sel[id];
  return { ...state, sel };
}

export function warnings(state, itin) {
  const s = state.sel, w = [];
  if (itin.days > 15) w.push('Longer than the agreed two weeks.');
  if (!s.akl && s.ne) w.push('Without the Auckland night, the 07:45 train means a very early kennel drop-off.');
  if (s.back && !s.self) w.push('Tick Drive ourselves for the road legs.');
  if (!cruiseOf(s)) w.push('No cruise chosen.');
  return w;
}

const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const DOW_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Check the itinerary against a season's service days. Tries every start weekday and picks
// the one that needs the fewest waiting days. Returns per-step comments and blockers.
export function alignSeason(itin, seasons, key) {
  const S = seasons.seasons[key];
  if (!S) return null;
  const allowed = svc => {
    if (svc === 'neS') return seasons.neSouth;
    if (svc === 'neN') return seasons.neNorth;
    if (svc === 'cp') return S.cp;
    return null;
  };
  const simulate = start => {
    let day = 1, added = 0;
    const per = itin.steps.map(st => {
      const a = st.svc ? allowed(st.svc) : null;
      let wait = 0;
      if (a && a.length) {
        while (!a.includes(DOW[(start + day - 1 + wait) % 7]) && wait < 7) wait++;
      }
      added += wait;
      day += wait;
      const r = { day, dow: (start + day - 1) % 7, wait };
      day += st.n;
      return r;
    });
    return { start, added, per, days: day };
  };
  let best = null;
  for (let s = 0; s < 7; s++) {
    const r = simulate(s);
    if (!best || r.added < best.added) best = r;
  }
  const notes = itin.steps.map(() => []);
  const blockers = [];
  itin.steps.forEach((st, i) => {
    const w = best.per[i].wait;
    const prev = i > 0 ? itin.steps[i - 1] : null;
    const where = prev && prev.night ? prev.night.place : null;
    if (st.svc === 'cp' && !S.cp.length) {
      notes[i].push({ level: 'block', text: S.cpNote });
      blockers.push(S.cpNote);
    } else if (w > 0) {
      const what = st.svc === 'cp' ? 'the Coastal Pacific' : 'the Northern Explorer';
      notes[i].push({ level: 'add', text: `Add ${w} day${w > 1 ? 's' : ''}: ${what} does not run on the day before; wait${where ? ' an extra night where we stayed' : ''} until ${DOW_LABEL[best.per[i].dow]}.` , where });
    }
    if (st.svc === 'cp' && S.cp.length && S.cp.length < 7) notes[i].push({ level: 'check', text: S.cpNote });
    if (st.svc && st.svc.startsWith('cruise:')) {
      if (S.sandflies) {
        const lv = S.sandflies.level === 'peak' ? 'block' : S.sandflies.level === 'lowest' ? 'ok' : 'check';
        notes[i].push({ level: lv, text: S.sandflies.note });
        if (lv === 'block') blockers.push(S.sandflies.note);
      }
      const c = S.cruises[st.svc.slice(7)];
      if (c) {
        notes[i].push({ level: c.ok ? 'check' : 'block', text: c.note });
        if (!c.ok) blockers.push(c.note);
      }
    }
  });
  return { key, label: S.label, window: S.window, general: S.general, sandflies: S.sandflies, start: best.start, startLabel: DOW_LABEL[best.start], added: best.added, per: best.per, notes, blockers: [...new Set(blockers)], days: best.days };
}
