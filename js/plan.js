// Pure itinerary and budget logic. No DOM access, so it can be unit-tested with node --test.
// Agreed 28 Oct 2026: no flying (helicopter only where a cruise has no other access);
// Christchurch to Fiordland and back is by road, either direct or broken at good places.

export const KENNEL_RATE = 37;   // NZD per small dog per day, Brookby Lodge price list (checked 27 Oct 2026)
export const DOGS = 2;

const CRUISES = {
  rnw: { name: 'RealNZ Wanderer, Doubtful Sound', nights: 2, kind: 'doubtful' },
  rnn: { name: 'RealNZ Navigator, Doubtful Sound', nights: 2, kind: 'doubtful' },
  fj1: { name: 'Fiordland Jewel, Milford Sound', nights: 1, kind: 'milford' },
  he4: { name: 'Heritage Explorer: Fiordland Explored', nights: 4, kind: 'heli-dusky' },
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
  chcMtc: ['chc', 'ash', 'ger', 'fai', 'tek', 'pkj', 'gle', 'mtc'],
  mtcWan: ['mtc', 'gle', 'pkj', 'twz', 'oma', 'lin', 'tar', 'lug', 'wan'],
  mtcArr: ['mtc', 'gle', 'pkj', 'twz', 'oma', 'lin', 'tar', 'cro', 'arj', 'arr'],
  mtcHaw: ['mtc', 'gle', 'pkj', 'twz', 'oma', 'lin', 'tar', 'lug', 'haw'],
  hawWan: ['haw', 'wan'],
  hawTek: ['haw', 'lug', 'tar', 'lin', 'oma', 'twz', 'tek'],
  arrTea: ['arr', 'arj', 'zqn', 'kin', 'mos', 'tea'],
  mtcTea: ['mtc', 'gle', 'pkj', 'twz', 'oma', 'lin', 'tar', 'cro', 'arj', 'zqn', 'kin', 'mos', 'tea'],
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

export const SECOND_NIGHT = [
  { place: 'mtc', l: 'Second night at The Hermitage', d: 'A full day at Aoraki/Mt Cook with no driving, then about 5 hours to Te Anau.' },
  { place: 'wan', l: 'Night in Wanaka', d: 'Morning at Mt Cook, about 2.5–3 hours to Wanaka, then about 3.5 hours to Te Anau. Splits the drive.' },
  { place: 'haw', l: 'Night at Lake Hawea', d: 'Morning at Mt Cook, about 2.5–3 hours to the Hawea Hotel above the lake, then about 3.5–4 hours via Wanaka and the Crown Range to Te Anau.' },
  { place: 'arr', l: 'Night in Arrowtown', d: 'Morning at Mt Cook, about 3.5 hours to Arrowtown, then about 2.5 hours to Te Anau. Gold-rush village near Queenstown.' }
];

export const RETURN_NIGHT = [
  { place: 'wan', l: 'Night in Wanaka', d: 'About 3.5 hours from Manapouri over the Crown Range; lakeside town with restaurants.' },
  { place: 'haw', l: 'Night at Lake Hawea', d: 'About 15 minutes beyond Wanaka: quieter, with the Hawea Hotel looking straight down the lake. About 5.5 hours to Christchurch next day.' }
];

export const ROAD_STOPS = ['Direct both ways', 'Hermitage down, Wanaka back', 'Two breaks each way'];

export function cruiseOf(sel) {
  return Object.keys(CRUISES).find(k => sel[k]) || null;
}
const stopsOf = opt => opt.self ?? 1;

// Build the day-by-day itinerary and the map route from the selection.
// Each card covers its leg in both directions; the way home mirrors the way down.
export function buildItinerary(sel, opt = {}) {
  const steps = [];
  const segments = [];
  const seg = (mode, path, label) => segments.push({ mode, path, label });
  const step = (owner, title, detail, modes, night, n = night ? 1 : 0) => steps.push({ owner, title, detail, modes, night, n });
  const tag = svc => { steps[steps.length - 1].svc = svc; };
  const k = stopsOf(opt);

  // Leaving home
  if (sel.akl) {
    seg('ferry', P.carFerry, 'Sealink car ferry');
    seg('drive', P.toKennels, 'Drive to Brookby, then the city');
    step('akl', 'Waiheke to Brookby, then Auckland',
      'Sealink car ferry to Half Moon Bay, drop Poppy and Rua at Brookby Lodge, evening in the city.',
      ['ferry', 'drive'], { place: 'akl', kind: 'card' });
  }

  // North Island south
  if (sel.ne) {
    if (!sel.akl) {
      seg('ferry', P.carFerry, 'Sealink car ferry');
      seg('drive', P.toKennels, 'Brookby, then the station');
    }
    seg('rail', P.neSouth, 'Northern Explorer');
    step('ne', 'Northern Explorer to Wellington',
      (sel.akl ? 'Walk to Strand station. ' : 'Early start from Waiheke and a dawn kennel drop-off. ') +
      'Departs 07:45 (Mon, Thu, Sat); volcanic plateau and the Raurimu Spiral; arrives Wellington about 18:25.',
      ['rail'], { place: 'wlg', kind: 'stay' });
    tag('neS');
  }

  // Cook Strait and Picton to Christchurch: Coastal Pacific, or drive from Picton
  if (sel.isl) seg('ferry', P.strait, 'Interislander');
  if (sel.cp) {
    seg('rail', P.cpSouth, 'Coastal Pacific');
    step('cp', sel.isl ? 'Interislander and Coastal Pacific to Christchurch' : 'Coastal Pacific to Christchurch',
      (sel.isl ? '08:45 sailing through Tory Channel; bags checked through. ' : '') + '13:40 train along the Kaikōura coast; arrives 19:30.',
      [sel.isl && 'ferry', 'rail'].filter(Boolean), { place: 'chc', kind: 'stay' });
    tag('cp');
    if (sel.isl) steps[steps.length - 1].also = ['isl'];
  } else if (sel.pdrive) {
    seg('drive', P.cpSouth, 'Drive Picton to Christchurch');
    step('pdrive', sel.isl ? 'Interislander, then drive Picton to Christchurch' : 'Drive Picton to Christchurch',
      (sel.isl ? '08:45 sailing, arriving Picton 12:15. ' : '') + 'Collect the rental at Picton and drive about 4.5–5 hours via Blenheim and the Kaikōura coast.',
      [sel.isl && 'ferry', 'drive'].filter(Boolean), { place: 'chc', kind: 'stay' });
  } else if (sel.isl) {
    step('isl', 'Interislander to Picton', '08:45 sailing through Tory Channel.', ['ferry'], null);
  }

  // Christchurch to Fiordland, by road
  if (sel.self) {
    if (k === 0) {
      seg('drive', join(P.chcTek, P.tekTea), 'Drive Christchurch to Fiordland');
      step('self', 'Drive: Christchurch to Te Anau direct', 'One long day, about 7–8 hours, via Tekapo, the Lindis Pass and Central Otago.', ['drive'], { place: 'tea', kind: 'stay' });
    } else if (k === 1) {
      seg('drive', P.chcMtc, 'Drive Christchurch to Fiordland');
      step('self', 'Drive to Aoraki/Mt Cook: The Hermitage', 'About 4.5 hours via Tekapo and up Lake Pukaki to Aoraki/Mt Cook Village.', ['drive'], { place: 'mtc', kind: 'stay' });
      const n2 = opt.n2 ?? 0;
      if (n2 === 1) {
        seg('drive', P.mtcWan, 'Drive Christchurch to Fiordland');
        step('self', 'Aoraki/Mt Cook to Wanaka', 'Morning at Aoraki/Mt Cook, then about 2.5–3 hours over the Lindis Pass to Lake Wanaka.', ['drive'], { place: 'wan', kind: 'stay' });
        seg('drive', P.wanTea, 'Drive Christchurch to Fiordland');
        step('self', 'Wanaka to Te Anau', 'About 3.5 hours over the Crown Range and along Lake Wakatipu.', ['drive'], { place: 'tea', kind: 'stay' });
      } else if (n2 === 2) {
        seg('drive', P.mtcHaw, 'Drive Christchurch to Fiordland');
        step('self', 'Aoraki/Mt Cook to Lake Hawea', 'Morning at Aoraki/Mt Cook, then about 2.5–3 hours over the Lindis Pass to Lake Hawea.', ['drive'], { place: 'haw', kind: 'stay' });
        seg('drive', join(P.hawWan, P.wanTea), 'Drive Christchurch to Fiordland');
        step('self', 'Lake Hawea to Te Anau', 'About 3.5–4 hours via Wanaka, the Crown Range and Lake Wakatipu.', ['drive'], { place: 'tea', kind: 'stay' });
      } else if (n2 === 3) {
        seg('drive', P.mtcArr, 'Drive Christchurch to Fiordland');
        step('self', 'Aoraki/Mt Cook to Arrowtown', 'Morning at Aoraki/Mt Cook, then about 3.5 hours over the Lindis Pass, through Cromwell and the Kawarau Gorge.', ['drive'], { place: 'arr', kind: 'stay' });
        seg('drive', P.arrTea, 'Drive Christchurch to Fiordland');
        step('self', 'Arrowtown to Te Anau', 'About 2.5 hours past Queenstown and along Lake Wakatipu.', ['drive'], { place: 'tea', kind: 'stay' });
      } else {
        step('self', 'A day at Aoraki/Mt Cook', 'No driving. Hooker Valley track, the Tasman Glacier lake, the Sir Edmund Hillary Alpine Centre.', [], { place: 'mtc', kind: 'stay' });
        seg('drive', P.mtcTea, 'Drive Christchurch to Fiordland');
        step('self', 'Aoraki/Mt Cook to Te Anau', 'About 5 hours: Lake Pukaki, the Lindis Pass, Central Otago, Lake Wakatipu.', ['drive'], { place: 'tea', kind: 'stay' });
      }
      // The second night on the way down is a choice: shown as alternative cards beside it.
      steps[steps.length - 2].choice = { key: 'n2', sel: n2, options: SECOND_NIGHT };
    } else {
      seg('drive', P.chcTek, 'Drive Christchurch to Fiordland');
      step('self', 'Drive to Lake Tekapo', 'About 3 hours across the Canterbury Plains; evening under the Dark Sky Reserve.', ['drive'], { place: 'tek', kind: 'stay' });
      {
        seg('drive', P.tekWan, 'Drive Christchurch to Fiordland');
        step('self', 'Lindis Pass to Wanaka', 'About 2.5 hours, with time at Lake Pukaki and Aoraki/Mt Cook views.', ['drive'], { place: 'wan', kind: 'stay' });
        seg('drive', P.wanTea, 'Drive Christchurch to Fiordland');
        step('self', 'Crown Range to Te Anau', 'About 3.5 hours over the Crown Range and along Lake Wakatipu.', ['drive'], { place: 'tea', kind: 'stay' });
      }
    }
  } else if (cruiseOf(sel)) {
    step(null, 'Road to Fiordland not chosen yet', 'Tick Drive Christchurch to Fiordland.', [], null);
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
      step(ck, c.name, 'Drive 30 min to Manapouri and park, cross the lake and Wilmot Pass to Deep Cove, then two nights aboard: kayaking, dolphins, fur seals and penguins if we are lucky. No aircraft.',
        ['drive', 'ferry', 'cruise'], { place: 'dco', kind: 'aboard' }, c.nights);
    } else if (c.kind === 'milford') {
      seg('drive', P.milfordRd, 'Milford Road');
      seg('cruise', P.milfordSd, c.name);
      endAt = 'mil';
      step(ck, c.name, 'Milford Road through the Homer Tunnel, board at 15:10; sunset and sunrise under Mitre Peak. No aircraft.',
        ['drive', 'cruise'], { place: 'mil', kind: 'aboard' }, c.nights);
    } else {
      const start = c.kind === 'heli-pres' ? 'pre' : 'dus';
      seg('heli', ['tea', start], 'Helicopter (only access)');
      seg('cruise', c.kind === 'heli-pres' ? P.presCruise : P.duskyCruise, c.name);
      seg('drive', rev(P.wilmot), 'Coach over Wilmot Pass');
      seg('ferry', rev(P.lake), 'Lake Manapouri');
      seg('drive', P.teaMan.slice().reverse(), 'Coach to Te Anau');
      endAt = 'tea';
      step(ck, c.name, `Park at Te Anau. Helicopter from Te Anau to ${c.kind === 'heli-pres' ? 'Preservation Inlet' : 'Dusky Sound'}: allowed only because there is no other way in. Then ${c.nights} nights aboard with naturalist guides, north through Breaksea Sound to Doubtful Sound, and the included coach back to Te Anau.`,
        ['heli', 'cruise'], { place: start, kind: 'aboard' }, c.nights);
    }
    tag('cruise:' + ck);
  }
  const backToTea = endAt === 'man' ? rev(P.teaMan) : endAt === 'mil' ? rev(P.milfordRd) : ['tea'];

  // Road back to Christchurch: mirrors the drive south
  if (sel.self && ck) {
    if (k === 0) {
      seg('drive', join(backToTea, rev(P.tekTea), rev(P.chcTek)), 'Drive back');
      step('self', 'Drive back to Christchurch direct', 'Disembark around midday and drive about 8 hours via the Lindis Pass and Tekapo.', ['drive'], { place: 'chc', kind: 'stay' });
    } else if (k === 1) {
      const r1 = opt.r1 ?? 0;
      if (r1 === 1) {
        seg('drive', join(backToTea, rev(P.wanTea), rev(P.hawWan)), 'Drive back');
        step('self', 'Drive to Lake Hawea', 'Disembark and head north over the Crown Range and past Wanaka, about 4 hours.', ['drive'], { place: 'haw', kind: 'stay' });
        seg('drive', join(P.hawTek, rev(P.chcTek)), 'Drive back');
        step('self', 'Lake Hawea to Christchurch', 'About 5.5 hours over the Lindis Pass and past Tekapo.', ['drive'], { place: 'chc', kind: 'stay' });
      } else {
        seg('drive', join(backToTea, rev(P.wanTea)), 'Drive back');
        step('self', 'Drive to Wanaka', 'Disembark and head north over the Crown Range, about 3.5 hours.', ['drive'], { place: 'wan', kind: 'stay' });
        seg('drive', join(rev(P.tekWan), rev(P.chcTek)), 'Drive back');
        step('self', 'Wanaka to Christchurch', 'About 5.5 hours over the Lindis Pass and past Tekapo.', ['drive'], { place: 'chc', kind: 'stay' });
      }
      steps[steps.length - 2].choice = { key: 'r1', sel: r1, options: RETURN_NIGHT };
    } else {
      seg('drive', join(backToTea, rev(P.wanTea)), 'Drive back');
      step('self', 'Drive to Wanaka', 'Disembark and head north over the Crown Range, about 3.5 hours.', ['drive'], { place: 'wan', kind: 'stay' });
      seg('drive', rev(P.tekWan), 'Drive back');
      step('self', 'Lindis Pass to Lake Tekapo', 'A gentle 2.5 hours back over the pass.', ['drive'], { place: 'tek', kind: 'stay' });
      seg('drive', rev(P.chcTek), 'Drive back');
      step('self', 'Tekapo to Christchurch', 'About 3 hours.', ['drive'], { place: 'chc', kind: 'stay' });
    }
  }

  // North again: Coastal Pacific or Picton drive, ferry, Northern Explorer
  if (sel.cp) {
    seg('rail', rev(P.cpSouth), 'Coastal Pacific north');
    if (sel.isl) seg('ferry', rev(P.strait), 'Interislander');
    step('cp', sel.isl ? 'Coastal Pacific and ferry to Wellington' : 'Coastal Pacific to Picton',
      'Coastal Pacific departs Christchurch 07:00, arrives Picton 12:40' + (sel.isl ? '; 14:15 Interislander arrives Wellington 17:45.' : '.'),
      ['rail', sel.isl && 'ferry'].filter(Boolean), sel.isl ? { place: 'wlg', kind: 'stay' } : null);
    tag('cp');
    if (sel.isl) steps[steps.length - 1].also = ['isl'];
  } else if (sel.pdrive) {
    seg('drive', rev(P.cpSouth), 'Drive Christchurch to Picton');
    step('pdrive', 'Drive Christchurch to Picton', 'About 4.5–5 hours via the Kaikōura coast. A night in Picton avoids a tight ferry connection.', ['drive'], { place: 'pic', kind: 'stay' });
    if (sel.isl) {
      seg('ferry', rev(P.strait), 'Interislander');
      step('isl', 'Return the car, Interislander to Wellington', 'Drop the rental at the Picton terminal; morning sailing, about 3.5 hours.', ['ferry'], { place: 'wlg', kind: 'stay' });
    }
  }
  const homeLeg = () => {
    seg('drive', P.homeFromAkl, 'Collect the dogs');
    seg('ferry', rev(P.carFerry), 'Sealink home');
  };
  if (sel.ne) {
    seg('rail', rev(P.neSouth), 'Northern Explorer north');
    step('ne', 'Northern Explorer to Auckland', 'Depart Wellington 07:55 (Wed, Fri, Sun), arrive Auckland Strand about 18:50–19:00. The North Island again in reverse.', ['rail'], { place: 'akl', kind: 'stay' });
    tag('neN');
    homeLeg();
    step(null, 'Collect the dogs and home', 'Brookby Lodge, then the Sealink back to Waiheke.', ['drive', 'ferry'], null);
  } else {
    step(null, 'Way home not complete', 'Tick the Northern Explorer for the trip back to Auckland.', [], null);
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

// Nights belonging to a card in the current itinerary, for its badge.
export function cardNights(card, itin) {
  return itin.steps.filter(s => s.owner === card.id).reduce((a, s) => a + s.n, 0);
}

// Hotel rate for a hotel-backed night: room type, rate plan and room count, by season month.
export function hotelRate(hotel, state, key) {
  const ri = state.opt[key + '-room'] ?? hotel.defRoom;
  const pi = state.opt[key + '-plan'] ?? hotel.defPlan;
  const count = (state.opt[key] ?? 0) + 1;
  const month = state.season === 'winter27' ? 'aug' : 'sep';
  const room = hotel.rooms[ri], plan = hotel.plans[pi];
  const each = room.rates[month][plan.k];
  return { value: each * count, each, count, room, plan, month };
}

export function cardValue(card, state, nights, places) {
  if (card.hotel && places) return hotelRate(places[card.hotel].hotel, state, card.id).value;
  if (card.dyn === 'kennel') return KENNEL_RATE * DOGS * (nights + 1);
  if (card.v !== undefined) return card.v;
  if (card.opts) return card.opts[state.opt[card.id] ?? card.def].v;
  return 0;
}

// Fixed sailing dates from the selected cards: a card's own date, or the date on its chosen option.
export function fixedDates(cards, state) {
  const out = {};
  cards.forEach(c => {
    if (!state.sel[c.id]) return;
    const o = c.opts && c.opts[state.opt[c.id] ?? c.def];
    const d = (o && o.date) || c.date;
    if (d) out[c.id] = d;
  });
  return out;
}

// Discovery order: the itinerary steps in sequence, each with the card that owns it (first time only)
// and the overnight stay it ends with. Selected cards that own no step (the kennels) join the first step.
export function sequence(itin, cards, state) {
  const shown = new Set();
  const visible = cards.filter(c => !c.hidden);
  const owners = new Set(itin.steps.flatMap(s => [s.owner, ...(s.also || [])]).filter(Boolean));
  const extra = visible.filter(c => state.sel[c.id] && !owners.has(c.id)).map(c => c.id);
  const groups = itin.steps.map((s, i) => {
    const ids = [];
    [...(s.also || []), s.owner].forEach(id => { if (id && !shown.has(id) && visible.some(c => c.id === id)) { ids.push(id); shown.add(id); } });
    if (i === 0) extra.forEach(id => { if (!shown.has(id)) { ids.push(id); shown.add(id); } });
    return { step: i, cards: ids, stay: s.night && s.night.kind === 'stay' ? s.night.id : null, choice: s.choice || null };
  });
  const unused = visible.filter(c => !shown.has(c.id)).map(c => c.id);
  return { groups, unused };
}

export function staysFrom(itin, places) {
  const ci = itin.steps.findIndex(s => s.svc && s.svc.startsWith('cruise:'));
  return itin.steps.filter(s => s.night && s.night.kind === 'stay').map(s => ({
    dir: ci < 0 || itin.steps.indexOf(s) < ci ? 'out' : 'ret',
    id: s.night.id, place: s.night.place, name: places[s.night.place].name,
    why: s.title, rates: places[s.night.place].stay, hotel: places[s.night.place].hotel || null,
    def: 0
  }));
}

export function totals(data, state, places) {
  const itin = buildItinerary(state.sel, state.opt);
  let total = 0, count = 0;
  data.cards.forEach(c => { if (state.sel[c.id] && !c.hidden) { total += cardValue(c, state, itin.nights, places); count++; } });
  const stays = staysFrom(itin, places);
  let stayCount = 0;
  stays.forEach(st => {
    if (!(state.stayOff || {})[st.id]) { total += st.hotel ? hotelRate(st.hotel, state, st.id).value : st.rates[state.opt[st.id] ?? st.def]; stayCount++; }
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
  if (!s.cp && !s.pdrive) w.push('Choose the Coastal Pacific or the Picton–Christchurch drive.');
  if (cruiseOf(s) && !s.self) w.push('Tick Drive Christchurch to Fiordland for the road there and back.');
  if (!cruiseOf(s)) w.push('No cruise chosen.');
  return w;
}

const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const DOW_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Check the itinerary against a season's service days. Tries every start weekday and picks
// the one that needs the fewest waiting days. Returns per-step comments and blockers.
export function alignSeason(itin, seasons, key, fixedDates = {}) {
  const S = seasons.seasons[key];
  if (!S) return null;
  const allowed = svc => {
    if (svc === 'neS') return seasons.neSouth;
    if (svc === 'neN') return seasons.neNorth;
    if (svc === 'cp') return S.cp;
    if (svc && svc.startsWith('cruise:') && fixedDates[svc.slice(7)]) {
      const [y, m, d] = fixedDates[svc.slice(7)].split('-').map(Number);
      return [DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]];
    }
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
      const what = st.svc === 'cp' ? 'the Coastal Pacific' : st.svc.startsWith('cruise:') ? 'the fixed sailing' : 'the Northern Explorer';
      notes[i].push({ level: 'add', text: `Add ${w} day${w > 1 ? 's' : ''}: ${what} does not run on the day before; wait${where ? ' an extra night where we stayed' : ''} until ${DOW_LABEL[best.per[i].dow]}.` , where });
    }
    if (st.svc === 'cp' && S.cp.length && S.cp.length < 7) notes[i].push({ level: 'check', text: S.cpNote });
    if (st.svc && st.svc.startsWith('cruise:')) {
      if (S.sandflies) {
        const lv = S.sandflies.level === 'peak' ? (S.sandflies.accepted ? 'check' : 'block') : S.sandflies.level === 'lowest' ? 'ok' : 'check';
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
  // With a fixed sailing date, work out real calendar dates for every step.
  let startDate = null;
  const ci = itin.steps.findIndex(st => st.svc && st.svc.startsWith('cruise:') && fixedDates[st.svc.slice(7)]);
  if (ci >= 0) {
    const [y, m, d] = fixedDates[itin.steps[ci].svc.slice(7)].split('-').map(Number);
    startDate = Date.UTC(y, m - 1, d) - (best.per[ci].day - 1) * 864e5;
  }
  return { startDate, key, label: S.label, window: S.window, general: S.general, sandflies: S.sandflies, start: best.start, startLabel: DOW_LABEL[best.start], added: best.added, per: best.per, notes, blockers: [...new Set(blockers)], days: best.days };
}
