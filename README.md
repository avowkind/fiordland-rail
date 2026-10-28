# Waiheke to the Fiords

Planner for Andrew and Millie's Holiday 2027: rail through both islands of New Zealand, then a Fiordland cruise.

The site has four sections:

1. **Timeline**: when the Northern Explorer, Interislander, Coastal Pacific and the Fiordland cruises run, alongside school holidays, tourist peaks and sandfly season.
2. **Discovery**: an option card for each leg, saying what makes it special and what might swing the choice. Each card covers its leg in both directions, since the way home mirrors the way down. Ticking a card adds the overnight stays it needs to the plan. Prices are hidden unless the Show prices switch is turned on.
3. **Chosen plan**: a day-by-day itinerary built from the ticked cards, beside a route map (Leaflet with OpenStreetMap tiles).
4. **Things to think about**: loose ends that aren't costed yet.

## Layout

```
index.html          page structure
css/site.css        styles, light and dark themes
js/main.js          loads the data, holds the selection state, wires up the sections
js/plan.js          pure itinerary and budget logic (unit-tested)
js/timeline.js      zoomable SVG timeline
js/cards.js         option cards and generated stay cards
js/map.js           route map
data/options.json   option cards: costs, nights, notes, groups, default selection
data/timeline.json  availability rows and sources
data/places.json    coordinates, map waypoints and placeholder stay prices
tests/              node --test suite for js/plan.js
```

Most changes are data edits: a new price, a new departure date or a new place goes in `data/`. Itinerary rules, such as which legs need which overnight stays and how the kennel cost scales, live in `js/plan.js` and are covered by the tests.

## Run locally

There is no build step. ES modules need to be served over HTTP:

```
npm run serve      # python3 -m http.server 8000
open http://localhost:8000
npm test
```

## Deploy

On every push to `main`, the GitHub Actions workflow runs the tests and then deploys to GitHub Pages. In repo settings, Pages must have **Source: GitHub Actions**.

## Data caveats

Prices and dates were researched on 27 Oct 2026 from operator sites and secondary guides. Values marked "estimate" are placeholders. Confirm everything with the operators before booking. Each selection is saved in its own browser (localStorage), so the selection isn't shared between devices.
