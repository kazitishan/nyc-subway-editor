// Turns a map document (src/data/map.json) into what the map draws: stop dots,
// track segments (with the line colors running on each), and transfer
// connectors between stops in the same station.
//
// Map document shape:
//   colors:   [{ id, hex }]                        – order = left-to-right on shared track
//   routes:   [{ id, bullet, name?, color, paths }] – paths are ordered stop ids along the track
//   stations: [{ id, name, stops }]                 – stops connected in-system
//   stops:    [{ id, name, borough, lat, lng, routes, accessibility, accessibilityNote? }]
export function buildNetwork(map) {
  const colorHex = new Map(map.colors.map((c) => [c.id, c.hex]));
  const colorRank = new Map(map.colors.map((c, i) => [c.id, i]));
  const bulletOf = new Map(map.routes.map((r) => [r.id, r.bullet]));
  const stationOf = new Map(map.stations.flatMap((st) => st.stops.map((id) => [id, st])));

  const stops = map.stops.map((s) => ({
    id: s.id,
    name: s.name,
    borough: s.borough,
    lat: s.lat,
    lng: s.lng,
    // Display labels; the three shuttles (GS, FS, H) all show the S bullet.
    bullets: s.routes.map((r) => bulletOf.get(r) ?? r),
    accessibility: s.accessibility === "none" ? null : s.accessibility,
    accessibilityNote: s.accessibilityNote ?? null,
  }));
  const byId = new Map(stops.map((s) => [s.id, s]));
  addStopTransfers(stops, byId, map.stations, stationOf);

  // One segment per pair of adjacent stops. Its direction is fixed by the
  // first path that uses it, so side-by-side colors stay on consistent sides.
  const segments = new Map();
  for (const route of map.routes) {
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
      .sort((a, b) => colorRank.get(a) - colorRank.get(b))
      .map((c) => colorHex.get(c)),
  }));

  return {
    stops,
    segments: segmentList,
    transfers: buildTransferLinks(map.stations, byId),
  };
}

// Stops in the same station are connected in-system. Give each stop the
// bullets it can transfer to, grouped by the other platform's name (e.g. at
// Times Sq 1/2/3: N Q R W 7 S at "Times Sq-42 St", A C E at "42 St-Port Authority").
function addStopTransfers(stops, byId, stations, stationOf) {
  for (const s of stops) {
    const seen = new Set(s.bullets);
    const byName = new Map();
    for (const otherId of stationOf.get(s.id)?.stops ?? []) {
      const other = byId.get(otherId);
      if (!other || other === s) continue;
      const bullets = other.bullets.filter((b) => !seen.has(b));
      bullets.forEach((b) => seen.add(b));
      if (!bullets.length) continue;
      if (!byName.has(other.name)) byName.set(other.name, []);
      byName.get(other.name).push(...bullets);
    }
    s.transfers = [...byName].map(([name, bullets]) => ({ name, bullets }));
  }
}

// Connect the stops of each multi-stop station with a minimum spanning tree so
// they draw as a tidy chain rather than a star.
function buildTransferLinks(stations, byId) {
  const links = [];
  for (const station of stations) {
    const members = station.stops.map((id) => byId.get(id)).filter(Boolean);
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
      // Skip zero-length links (stops sharing exact coordinates).
      if (best.d > 0) links.push([best.a.id, b.id]);
      inTree.push(b);
    }
  }
  return links;
}
