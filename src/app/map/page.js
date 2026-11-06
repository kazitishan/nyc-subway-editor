import Image from "next/image";
import Link from "next/link";
import SubwayMap from "@/components/SubwayMap";
import boroughs from "@/data/boroughs.json";
import subwayMap from "@/data/map.json";
import { bulletSrc } from "@/lib/bullets";
import { buildNetwork } from "@/lib/network";

export const metadata = {
  title: "Current Subway Map · NYC Subway Editor",
};

// Route bullets grouped by line color, in the map's color order. The three
// shuttles share the S bullet, so bullets are de-duplicated.
const legendGroups = subwayMap.colors
  .map((color) => ({
    color: color.hex,
    bullets: [
      ...new Set(subwayMap.routes.filter((r) => r.color === color.id).map((r) => r.bullet)),
    ],
  }))
  .filter((g) => g.bullets.length);

export default function MapPage() {
  const { stops, segments, transfers } = buildNetwork(subwayMap);

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
            {subwayMap.stations.length} stations
          </span>
        </div>
      </header>

      <details
        open
        className="group absolute bottom-6 left-4 z-[1000] max-w-[calc(100vw-2rem)] rounded-xl border border-black/10 bg-white/95 text-neutral-900 shadow-sm backdrop-blur"
      >
        <summary className="cursor-pointer select-none list-none px-4 py-2.5 text-sm font-semibold">
          Lines <span className="ml-1 text-neutral-400 group-open:hidden">+</span>
        </summary>
        <ul className="space-y-1.5 px-4 pb-3">
          {legendGroups.map((g) => (
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
