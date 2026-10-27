// Route map with Leaflet and OpenStreetMap tiles.
/* global L */
const VIEWS = {
  nz: [[-46.4, 166.3], [-36.4, 176.2]],
  si: [[-46.3, 166.3], [-41.0, 174.6]],
  fl: [[-46.15, 166.4], [-44.55, 168.9]]
};
const MODES = {
  rail: 'Train', ferry: 'Ferry or boat crossing', drive: 'Road', flight: 'Flight',
  cruise: 'Cruise', heli: 'Helicopter'
};

let map, layer, current = 'nz';

export function initMap(el) {
  if (typeof L === 'undefined') {
    el.innerHTML = '<p class="basis" style="padding:16px">The map library could not load. Check your connection and reload.</p>';
    return false;
  }
  map = L.map(el, { scrollWheelZoom: false, zoomSnap: 0.25 });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  layer = L.layerGroup().addTo(map);
  map.fitBounds(VIEWS.nz);
  map.on('click', () => map.scrollWheelZoom.enable());
  return true;
}

export function setView(name) {
  if (!map) return;
  current = name;
  map.fitBounds(VIEWS[name]);
}

// A gentle arc for flights and helicopter hops, so they read differently from roads.
function arc(a, b) {
  const pts = [];
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const dx = b[1] - a[1], dy = b[0] - a[0];
  const k = 0.18;
  const cx = mx + dx * k, cy = my - dy * k;
  for (let t = 0; t <= 1.0001; t += 0.05) {
    pts.push([(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * cx + t * t * b[0],
              (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * cy + t * t * b[1]]);
  }
  return pts;
}

export function drawRoute(itin, places) {
  if (!map) return;
  layer.clearLayers();
  const used = new Set();
  itin.segments.forEach(sg => {
    const ll = sg.path.map(k => [places[k].lat, places[k].lon]);
    sg.path.forEach(k => used.add(k));
    const pts = (sg.mode === 'flight' || sg.mode === 'heli') ? arc(ll[0], ll[ll.length - 1]) : ll;
    L.polyline(pts, { className: `rt rt-${sg.mode}`, weight: sg.mode === 'rail' ? 4 : 3, interactive: true })
      .bindTooltip(`${MODES[sg.mode]}: ${sg.label}`, { sticky: true })
      .addTo(layer);
  });

  // Day numbers for each overnight place
  const nightsAt = {};
  itin.steps.forEach(s => {
    if (!s.night) return;
    const days = s.n > 1 ? `${s.day}–${s.day + s.n - 1}` : `${s.day}`;
    (nightsAt[s.night.place] = nightsAt[s.night.place] || []).push({ days, kind: s.night.kind });
  });

  Object.keys(places).forEach(k => {
    const p = places[k];
    if (k.startsWith('_') || !used.has(k)) return;
    if (nightsAt[k]) {
      const label = nightsAt[k].map(n => n.days).join(', ');
      const aboard = nightsAt[k].every(n => n.kind === 'aboard');
      L.marker([p.lat, p.lon], {
        icon: L.divIcon({ className: 'nightpin' + (aboard ? ' aboard' : ''), html: `<span>${label}</span>`, iconSize: null })
      }).bindTooltip(`<b>${p.name}</b><br>${aboard ? 'Aboard' : 'Night'} ${nightsAt[k].length > 1 ? 's ' : ''}${label}${p.blurb ? '<br>' + p.blurb : ''}`, { direction: 'top', offset: [0, -10] })
        .addTo(layer);
    } else if (p.stop || p.label) {
      L.circleMarker([p.lat, p.lon], { radius: p.stop ? 5 : 3, className: 'stoppin' })
        .bindTooltip(`<b>${p.name}</b>${p.blurb ? '<br>' + p.blurb : ''}`, { direction: 'top' })
        .addTo(layer);
    }
  });
}

export function legendHTML(itin) {
  const modes = [...new Set(itin.segments.map(s => s.mode))];
  return modes.map(m => `<span><i class="lg lg-${m}"></i>${MODES[m]}</span>`).join('') +
    '<span><i class="lg-pin">3</i>Overnight (day number)</span><span><i class="lg-pin aboard">5</i>Nights aboard</span>';
}

export function invalidate() { if (map) map.invalidateSize(); }
export const currentView = () => current;
