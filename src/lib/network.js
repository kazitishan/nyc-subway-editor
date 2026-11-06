import { COLOR_ORDER, LINE_COLORS, ROUTES } from "@/data/routes";

const BOROUGHS = {
  M: "Manhattan",
  Bk: "Brooklyn",
  Q: "Queens",
  Bx: "The Bronx",
  SI: "Staten Island",
};

// Turns raw stops.json rows plus route paths into what the map draws:
// stations, track segments (with the line colors running on each), and
// transfer connectors between stations in the same complex.
export function buildNetwork(rawStops) {
  const stations = rawStops.map((s) => ({
    id: s.gtfs_stop_id,
    name: s.stop_name,
    lat: Number(s.gtfs_latitude),
    lng: Number(s.gtfs_longitude),
    routes: s.daytime_routes.split(" ").filter(Boolean),
    borough: BOROUGHS[s.borough] ?? s.borough,
    complexId: s.complex_id,
    ada: s.ada === "1",
  }));
  const byId = new Map(stations.map((s) => [s.id, s]));
  addStationTransfers(stations);

  // One segment per pair of adjacent stations. Its direction is fixed by the
  // first path that uses it, so side-by-side colors stay on consistent sides.
  const segments = new Map();
  for (const route of ROUTES) {
    for (const path of route.paths) {
      for (let i = 1; i < path.length; i++) {
        const from = path[i - 1];
        const to = path[i];
        if (!byId.has(from) || !byId.has(to)) continue;
        const key = from < to ? `${from}|${to}` : `${to}|${from}`;
        if (!segments.has(key)) segments.set(key, { from, to, colors: new Set() });
        segments.get(key).colors.add(route.color);
      }
    }
  }

  const segmentList = [...segments.values()].map(({ from, to, colors }) => ({
    from,
    to,
    colors: [...colors]
      .sort((a, b) => COLOR_ORDER.indexOf(a) - COLOR_ORDER.indexOf(b))
      .map((c) => LINE_COLORS[c]),
  }));

  return { stations, segments: segmentList, transfers: buildTransfers(stations) };
}

// Stations sharing a complex_id are connected in-system. Give each station the
// routes it can transfer to, grouped by the platform's name (e.g. at Times Sq
// 1/2/3: N Q R W 7 S at "Times Sq-42 St", A C E at "42 St-Port Authority").
function addStationTransfers(stations) {
  const complexes = groupByComplex(stations);
  for (const s of stations) {
    const seen = new Set(s.routes);
    const byName = new Map();
    for (const other of complexes.get(s.complexId)) {
      if (other === s) continue;
      const routes = other.routes.filter((r) => !seen.has(r));
      routes.forEach((r) => seen.add(r));
      if (!routes.length) continue;
      if (!byName.has(other.name)) byName.set(other.name, []);
      byName.get(other.name).push(...routes);
    }
    s.transfers = [...byName].map(([name, routes]) => ({ name, routes }));
  }
}

function groupByComplex(stations) {
  const complexes = new Map();
  for (const s of stations) {
    if (!complexes.has(s.complexId)) complexes.set(s.complexId, []);
    complexes.get(s.complexId).push(s);
  }
  return complexes;
}

// Connect stations in the same complex with a minimum spanning tree so
// multi-station complexes draw as a tidy chain rather than a star.
function buildTransfers(stations) {
  const links = [];
  for (const members of groupByComplex(stations).values()) {
    if (members.length < 2) continue;
    const inTree = [members[0]];
    const rest = members.slice(1);
    while (rest.length) {
      let best = null;
      for (const a of inTree) {
        for (let j = 0; j < rest.length; j++) {
          const d = (a.lat - rest[j].lat) ** 2 + (a.lng - rest[j].lng) ** 2;
          if (!best || d < best.d) best = { a, j, d };
        }
      }
      const [b] = rest.splice(best.j, 1);
      // Skip zero-length links (stations sharing exact coordinates).
      if (best.d > 0) links.push([best.a.id, b.id]);
      inTree.push(b);
    }
  }
  return links;
}
