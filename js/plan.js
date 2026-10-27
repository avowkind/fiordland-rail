// Pure itinerary and budget logic. No DOM access, so it can be unit-tested with node --test.

export const KENNEL_RATE = 37;   // NZD per small dog per day, Brookby Lodge price list (checked 27 Oct 2026)
export const DOGS = 2;
export const SELF_RAIL_COST = 2650; // rail home when the rental car is driven back to Christchurch

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
  zqnTea: ['zqn', 'kin', 'mos', 'tea'],
  teaMan: ['tea', 'man'],
  lake: ['man', 'lm1', 'wam'],
  wilmot: ['wam', 'wil', 'dco'],
  doubtful: ['dco', 'ds1', 'ds2', 'dsm', 'ds2', 'ds1', 'dco'],
  milfordRd: ['tea', 'tad', 'kfl', 'hom', 'mil'],
  milfordSd: ['mil', 'mmo', 'mil'],
  duskyCruise: ['dus', 'brk', 'ds2', 'ds1', 'dco'],
  presCruise: ['pre', 'dus', 'brk', 'ds2', 'ds1', 'dco'],
  teaWan: ['tea', 'mos', 'kin', 'zqn', 'arj', 'crn', 'car', 'wan'],
  wanTek: ['wan', 'lug', 'tar', 'lin', 'oma', 'twz', 'tek']
};
const rev = a => [...a].reverse();

export function cruiseOf(sel) {
  return Object.keys(CRUISES).find(k => sel[k]) || null;
}

// Build the day-by-day itinerary and the map route from the selection.
// Self-drive keeps the car to Manapouri unless 'Drop at Queenstown' is chosen; rail home always keeps it.
export function selfKeeps(sel, opt = {}) {
  return !!sel.self && (!!sel.railh || (opt.self ?? 1) === 1);
}

export function buildItinerary(sel, opt = {}) {
  const keep = selfKeeps(sel, opt);
  const steps = [];
  const segments = [];
  const seg = (mode, path, label) => segments.push({ mode, path, label });
  const step = (title, detail, modes, night, n = night ? 1 : 0) => steps.push({ title, detail, modes, night, n });

  // Leaving home
  if (sel.akl) {
    seg('ferry', P.carFerry, 'Sealink car ferry');
    seg('drive', P.toKennels, 'Drive to Brookby, then the city');
    step('Waiheke to Brookby, then Auckland',
      sel.taxi ? 'Dog taxi collects Poppy and Rua; we take the ferry into the city for an evening in Auckland.'
               : 'Sealink car ferry to Half Moon Bay, drop Poppy and Rua at Brookby Lodge, evening in the city.',
      ['ferry', 'drive'], { place: 'akl', kind: 'card' });
  }

  // Rail south
  if (sel.ne) {
    if (!sel.akl) {
      if (sel.taxi) seg('ferry', ['mat', 'akl'], '06:00 passenger ferry');
      else { seg('ferry', P.carFerry, 'Sealink car ferry'); seg('drive', P.toKennels, 'Brookby, then the station'); }
    }
    seg('rail', P.neSouth, 'Northern Explorer');
    step('Northern Explorer to Wellington',
      (sel.akl ? 'Walk to Strand station for the 07:45 departure. ' : 'Pre-dawn start from Waiheke to make the 07:45 departure. ') +
      'Volcanic plateau and the Raurimu Spiral; arrive about 18:25.',
      ['rail'], { place: 'wlg', kind: 'stay' });
  }
  if (sel.isl || sel.cp) {
    if (sel.isl) seg('ferry', P.strait, 'Interislander');
    if (sel.cp) seg('rail', P.cpSouth, 'Coastal Pacific');
    const t = sel.isl && sel.cp ? 'Interislander and Coastal Pacific to Christchurch'
            : sel.isl ? 'Interislander to Picton' : 'Coastal Pacific to Christchurch';
    step(t, (sel.isl ? '08:45 sailing through Tory Channel; bags checked through. ' : '') +
      (sel.cp ? '13:40 train along the Kaikōura coast; arrive 19:30.' : ''),
      [sel.isl && 'ferry', sel.cp && 'rail'].filter(Boolean),
      sel.cp ? { place: 'chc', kind: 'stay' } : null);
  }

  // Christchurch to Fiordland
  if (sel.jet) {
    seg('flight', ['chc', 'zqn'], 'Jet to Queenstown');
    seg('drive', P.zqnTea, sel.self ? 'Drive' : 'Transfer to Te Anau');
    step('Fly to Queenstown, on to Te Anau', 'About an hour in the air, then 2 h by road to Te Anau.',
      ['flight', 'drive'], { place: 'tea', kind: 'stay' });
  } else if (sel.drive || sel.self) {
    const who = sel.self ? 'Drive ourselves' : 'Chauffeured drive';
    seg('drive', P.chcTek, who);
    step(`${who} to Lake Tekapo`, 'Canterbury Plains and Fairlie; evening under the Dark Sky Reserve.',
      ['drive'], { place: 'tek', kind: 'stay' });
    if (sel.self && !keep) {
      seg('drive', P.tekTea.slice(0, P.tekTea.indexOf('zqn') + 1), who);
      seg('drive', P.zqnTea, 'Transfer to Te Anau');
      step('Over the Lindis Pass to Queenstown, then Te Anau', 'Lake Pukaki, Lindis Pass and Central Otago; drop the rental in Queenstown and transfer to Te Anau.',
        ['drive'], { place: 'tea', kind: 'stay' });
    } else {
      seg('drive', P.tekTea, who);
      step('Over the Lindis Pass to Te Anau', 'Lake Pukaki, Lindis Pass, Central Otago, Lake Wakatipu.' + (keep ? ' We keep the car for the drive to Manapouri.' : ''),
        ['drive'], { place: 'tea', kind: 'stay' });
    }
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
      step(c.name, (keep ? 'Drive 30 min to Manapouri and park' : 'Transfer to Manapouri') + ', cross the lake and Wilmot Pass to Deep Cove, then two nights aboard: kayaking, dolphins, fur seals and penguins if we are lucky.',
        ['drive', 'ferry', 'cruise'], { place: 'dco', kind: 'aboard' }, c.nights);
    } else if (c.kind === 'milford') {
      seg('drive', P.milfordRd, 'Milford Road');
      seg('cruise', P.milfordSd, c.name);
      endAt = 'mil';
      step(c.name, 'Milford Road through the Homer Tunnel, board at 15:10; sunset and sunrise under Mitre Peak.',
        ['drive', 'cruise'], { place: 'mil', kind: 'aboard' }, c.nights);
    } else {
      const start = c.kind === 'heli-pres' ? 'pre' : 'dus';
      seg('heli', ['tea', start], 'Helicopter');
      seg('cruise', c.kind === 'heli-pres' ? P.presCruise : P.duskyCruise, c.name);
      seg('drive', rev(P.wilmot), 'Wilmot Pass');
      seg('ferry', rev(P.lake), 'Lake Manapouri');
      endAt = 'man';
      step(c.name, `Helicopter from Te Anau to ${c.kind === 'heli-pres' ? 'Preservation Inlet' : 'Dusky Sound'}, then ${c.nights} nights aboard with naturalist guides.`,
        ['heli', 'cruise'], { place: start, kind: 'aboard' }, c.nights);
    }
  }
  const backToTea = endAt === 'man' ? rev(P.teaMan) : endAt === 'mil' ? rev(P.milfordRd) : ['tea'];

  // Getting home
  const homeLeg = () => {
    seg('drive', P.homeFromAkl, 'Collect the dogs');
    seg('ferry', rev(P.carFerry), 'Sealink home');
  };
  if (sel.fly) {
    seg('drive', [...backToTea, ...rev(P.zqnTea).slice(1)], keep ? 'Drive to Queenstown' : 'To Queenstown');
    step('Back to Queenstown', keep ? 'Collect the car at Manapouri and drive to Queenstown; drop the rental at the airport in the morning.' : 'Disembark, then transfer to Queenstown for the night.',
      ['drive'], { place: 'zqn', kind: 'stay' });
    seg('flight', ['zqn', 'akl'], 'Jet home');
    homeLeg();
    step('Fly home and collect the dogs', 'Morning flight to Auckland, Brookby by afternoon, ferry home.', ['flight', 'drive', 'ferry'], null);
  } else if (sel.railh) {
    if (sel.self) {
      seg('drive', [...backToTea, ...P.teaWan.slice(1)], 'Drive north');
      step('Drive to Wanaka', 'Disembark and head north via Queenstown and the Crown Range.', ['drive'], { place: 'wan', kind: 'stay' });
      seg('drive', P.wanTek, 'Drive north');
      step('Lindis Pass to Lake Tekapo', 'A gentle day back over the pass.', ['drive'], { place: 'tek', kind: 'stay' });
      seg('drive', rev(P.chcTek), 'Return the car');
      step('Return the car in Christchurch', 'Drop the rental and rest before the early train.', ['drive'], { place: 'chc', kind: 'stay' });
    } else {
      seg('drive', [...backToTea, ...rev(P.zqnTea).slice(1)], 'To Queenstown');
      step('Back to Queenstown', 'Disembark and transfer to Queenstown.', ['drive'], { place: 'zqn', kind: 'stay' });
      seg('flight', ['zqn', 'chc'], 'Jet to Christchurch');
      step('Fly to Christchurch', 'Short flight; an evening in the city before the early train.', ['flight'], { place: 'chc', kind: 'stay' });
    }
    seg('rail', rev(P.cpSouth), 'Coastal Pacific north');
    seg('ferry', rev(P.strait), 'Interislander');
    step('Coastal Pacific and ferry to Wellington', '07:00 train north to Picton, 14:15 sailing, Wellington by 17:45.', ['rail', 'ferry'], { place: 'wlg', kind: 'stay' });
    seg('rail', rev(P.neSouth), 'Northern Explorer north');
    step('Northern Explorer to Auckland', 'The North Island again in reverse.', ['rail'], { place: 'akl', kind: 'stay' });
    homeLeg();
    step('Collect the dogs and home', 'Brookby Lodge, then the Sealink back to Waiheke.', ['drive', 'ferry'], null);
  } else {
    step('Way home not chosen yet', 'Tick Fly home or Rail home.', [], null);
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

export function cardValue(card, state, nights) {
  if (card.dyn === 'kennel') return KENNEL_RATE * DOGS * (nights + 1);
  if (card.id === 'railh' && state.sel.self && state.sel.railh) return SELF_RAIL_COST;
  if (card.id === 'self' && state.sel.railh) return card.opts[1].v; // rail home keeps the car
  if (card.opts) return card.opts[state.opt[card.id] ?? card.def].v;
  return card.v;
}

export function staysFrom(itin, places) {
  return itin.steps.filter(s => s.night && s.night.kind === 'stay').map(s => ({
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
  if (itin.days > 21) w.push('Over the 3-week ceiling for the dogs.');
  if (s.taxi && s.akl) w.push('With a dog taxi you may not need the Auckland night.');
  if (!s.akl && !s.taxi && s.ne) w.push('Without the Auckland night or a dog taxi, the 07:45 train needs a pre-dawn start from Waiheke.');
  if (s.self && s.railh) w.push('Rail home with self-drive: the car goes back to Christchurch via Wanaka and Tekapo.');
  const keep = selfKeeps(s, state.opt);
  if (keep && s.xfer) w.push('We keep the car to Manapouri, so the private transfer is unnecessary.');
  if (s.self && s.railh && (state.opt.self ?? 1) === 0) w.push('Rail home keeps the car (it goes back to Christchurch), so Drop at Queenstown does not apply.');
  const needX = ['rnw', 'rnn', 'he4', 'he6'].some(k => s[k]);
  if (needX && !s.xfer && (s.jet || (s.self && !keep))) w.push('Add the Queenstown transfer to reach the cruise.');
  if (s.fj1 && s.xfer) w.push('The Jewel sells its own van; the private transfer may be unnecessary.');
  if (!cruiseOf(s)) w.push('No cruise chosen.');
  return w;
}
