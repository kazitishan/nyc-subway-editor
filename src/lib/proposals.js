// Proposed lines (src/data/proposed.json) are keyed by line name. Each one is a
// fragment of a map document that applyProposals() layers on top of the base
// map, returning a new document of the same shape for buildNetwork(). The base
// document is never mutated.
//
// Proposal shape (every field optional, so an empty {} is a no-op):
//   colors:   [{ id, hex }]       – appended after the base colors (so lanes/legend sort after them)
//   routes:   [{ id, bullet?, name?, color?, paths }]
//               new id      → a new route
//               existing id → its paths are added to that route (e.g. extending the Q)
//   stops:    [{ id, name, borough, lat, lng, accessibility, accessibilityNote? }]
//               new stops; no `routes` needed (see below)
//   stations: [{ id, name?, stops }]
//               existing id → the stops join that station (in-system transfers)
//               new id      → a new station
//               listing a stop that's already in another station merges
//               that station in (e.g. joining Livonia Av and Junius St)
//             Station stop ids may point at another proposal's stops: they're
//             dropped while that proposal is off (so cross-proposal transfers
//             only appear when both lines are on).
//             New stops left out of every station get a station of their own.
//
// A proposal route serves every stop on its paths, so stops pick up the route's
// bullet automatically, including existing stops (e.g. 96 St gains the T).
export function applyProposals(base, proposals) {
  if (!proposals.length) return base;

  const colors = [...base.colors];
  const routes = base.routes.map((r) => ({ ...r, paths: [...r.paths] }));
  const stations = base.stations.map((s) => ({ ...s, stops: [...s.stops] }));
  const stops = base.stops.map((s) => ({ ...s, routes: [...s.routes] }));

  const colorIds = new Set(colors.map((c) => c.id));
  const routeById = new Map(routes.map((r) => [r.id, r]));
  const stationById = new Map(stations.map((s) => [s.id, s]));
  const stopById = new Map(stops.map((s) => [s.id, s]));

  for (const p of proposals) {
    for (const c of p.colors ?? []) {
      if (colorIds.has(c.id)) continue;
      colors.push(c);
      colorIds.add(c.id);
    }

    for (const s of p.stops ?? []) {
      if (stopById.has(s.id)) continue;
      const stop = { accessibility: "none", ...s, routes: [] };
      stops.push(stop);
      stopById.set(stop.id, stop);
    }

    for (const st of p.stations ?? []) {
      let station = stationById.get(st.id);
      if (!station) {
        station = { ...st, stops: [] };
        stations.push(station);
        stationById.set(station.id, station);
      }
      for (const id of st.stops) {
        if (station.stops.includes(id)) continue;
        // A stop that already belongs to another station brings that whole
        // station with it, so two existing stations can be joined into one.
        const other = stations.find((s) => s !== station && s.stops.includes(id));
        if (other) {
          station.stops.push(...other.stops);
          stations.splice(stations.indexOf(other), 1);
          stationById.delete(other.id);
        } else {
          station.stops.push(id);
        }
      }
    }

    for (const r of p.routes ?? []) {
      const existing = routeById.get(r.id);
      if (existing) {
        existing.paths.push(...r.paths);
      } else {
        const route = { ...r, paths: [...r.paths] };
        routes.push(route);
        routeById.set(route.id, route);
      }
      for (const id of r.paths.flat()) {
        const stop = stopById.get(id);
        if (stop && !stop.routes.includes(r.id)) stop.routes.push(r.id);
      }
    }
  }

  // Drop stop ids that don't exist, e.g. a transfer to another proposal's stop
  // while that proposal is switched off, and any station left with no stops.
  const merged = [];
  for (const st of stations) {
    st.stops = st.stops.filter((id) => stopById.has(id));
    if (st.stops.length) merged.push(st);
  }

  const placed = new Set(merged.flatMap((s) => s.stops));
  for (const s of stops) {
    if (!placed.has(s.id)) merged.push({ id: s.id, name: s.name, stops: [s.id] });
  }

  return { ...base, colors, routes, stations: merged, stops };
}
