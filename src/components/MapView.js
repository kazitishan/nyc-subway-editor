"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import SubwayMap from "@/components/SubwayMap";
import { bulletSrc } from "@/lib/bullets";
import { buildLegend, buildNetwork } from "@/lib/network";
import { applyProposals } from "@/lib/proposals";

// The /map screen: the map plus its overlays (header, proposed-lines panel,
// legend). Owns which proposed lines are switched on and rebuilds the network
// from the base map document + those proposals whenever that changes.
export default function MapView({ baseMap, proposals, boroughs }) {
  const [enabled, setEnabled] = useState(() => new Set());

  const map = useMemo(
    () =>
      applyProposals(
        baseMap,
        // Apply in file order so the result doesn't depend on click order.
        Object.keys(proposals)
          .filter((name) => enabled.has(name))
          .map((name) => proposals[name])
      ),
    [baseMap, proposals, enabled]
  );
  const { stops, segments, transfers } = useMemo(() => buildNetwork(map), [map]);
  const legend = useMemo(() => buildLegend(map), [map]);

  const toggle = (name) =>
    setEnabled((prev) => {
      const next = new Set(prev);
      if (!next.delete(name)) next.add(name);
      return next;
    });

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <SubwayMap
        stops={stops}
        segments={segments}
        transfers={transfers}
        boroughs={boroughs}
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex items-start p-4">
        <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-black/10 bg-white/95 px-4 py-2.5 text-neutral-900 shadow-sm backdrop-blur">
          <Link
            href="/"
            className="text-sm text-neutral-500 transition-colors hover:text-neutral-900"
          >
            ← Back
          </Link>
          <span className="h-4 w-px bg-neutral-200" />
          <h1 className="text-sm font-semibold">Current Subway Map</h1>
          <span className="hidden text-xs text-neutral-500 sm:inline">
            {map.stations.length} stations
          </span>
        </div>
      </header>

      {/* Proposed lines panel: each checked line is merged into the map. */}
      <details className="group absolute right-4 top-4 z-[1000] w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-black/10 bg-white/95 text-neutral-900 shadow-sm backdrop-blur">
        <summary className="flex cursor-pointer select-none list-none items-center justify-between px-4 py-2.5 text-sm font-semibold">
          Proposed Lines
          <span className="text-neutral-400 transition-transform group-open:rotate-45">+</span>
        </summary>
        <ul className="space-y-1 px-2 pb-2">
          {Object.keys(proposals).map((name) => (
            <li key={name}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-neutral-100">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-neutral-900"
                  checked={enabled.has(name)}
                  onChange={() => toggle(name)}
                />
                {name}
              </label>
            </li>
          ))}
        </ul>
      </details>

      <details
        open
        className="group absolute bottom-6 left-4 z-[1000] max-w-[calc(100vw-2rem)] rounded-xl border border-black/10 bg-white/95 text-neutral-900 shadow-sm backdrop-blur"
      >
        <summary className="cursor-pointer select-none list-none px-4 py-2.5 text-sm font-semibold">
          Lines <span className="ml-1 text-neutral-400 group-open:hidden">+</span>
        </summary>
        <ul className="space-y-1.5 px-4 pb-3">
          {legend.map((g) => (
            <li key={g.color} className="flex items-center gap-2">
              <span className="h-1 w-5 rounded-full" style={{ background: g.color }} />
              <span className="flex gap-1">
                {g.bullets.map((bullet) => (
                  <Image
                    key={bullet}
                    className="route-bullet"
                    src={bulletSrc(bullet)}
                    alt={`${bullet} train`}
                    width={20}
                    height={20}
                  />
                ))}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
