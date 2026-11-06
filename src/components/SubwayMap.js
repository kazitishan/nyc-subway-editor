"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { bulletSrc } from "@/data/routes";

// Track width in pixels for a zoom level; lanes sit side by side at this spacing.
const lineWeight = (zoom) => Math.min(7, Math.max(2, (zoom - 9) * 1.25));

// Tooltips are plain HTML strings, so bullets here are <img> tags rather than next/image.
const bulletHtml = (route) =>
  `<img class="route-bullet" src="${bulletSrc(route)}" alt="${route}" width="20" height="20" />`;

export default function SubwayMap({ stations, segments, transfers }) {
  const containerRef = useRef(null);

  useEffect(() => {
    let map;
    let cancelled = false;

    // Leaflet touches `window` on import, so load it only in the browser.
    import("leaflet").then(({ default: L }) => {
      if (cancelled || !containerRef.current) return;

      const byId = new Map(stations.map((s) => [s.id, s]));
      const latLngOf = (id) => {
        const s = byId.get(id);
        return L.latLng(s.lat, s.lng);
      };

      map = L.map(containerRef.current, {
        zoomControl: false,
        preferCanvas: true,
        minZoom: 10,
        maxZoom: 18,
      });
      L.control.zoom({ position: "bottomright" }).addTo(map);
      // The map needs a view before canvas layers can be added to it.
      map.fitBounds(
        L.latLngBounds(stations.map((s) => [s.lat, s.lng])),
        { padding: [24, 24] }
      );

      // Esri's muted light-gray basemap (no API key), with its label layer on top.
      const esri = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";
      L.tileLayer(`${esri}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`, {
        attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
        maxNativeZoom: 16,
      }).addTo(map);
      L.tileLayer(`${esri}/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, {
        maxNativeZoom: 16,
      }).addTo(map);

      const renderer = L.canvas({ padding: 0.5, tolerance: 6 });

      // Widest bundle of parallel lines touching each station, used to size its dot.
      const lanesAt = new Map();
      for (const seg of segments) {
        for (const id of [seg.from, seg.to]) {
          lanesAt.set(id, Math.max(lanesAt.get(id) ?? 1, seg.colors.length));
        }
      }

      // Track: one polyline per color per segment, offset perpendicular to the
      // segment so routes sharing track run side by side.
      const lanes = [];
      for (const seg of segments) {
        const a = latLngOf(seg.from);
        const b = latLngOf(seg.to);
        seg.colors.forEach((color, i) => {
          const line = L.polyline([a, b], {
            renderer,
            color,
            lineCap: "round",
            lineJoin: "round",
            interactive: false,
          }).addTo(map);
          lanes.push({ line, a, b, slot: i - (seg.colors.length - 1) / 2 });
        });
      }

      // Transfers between stations in the same complex: dark outline, white core.
      const transferLines = transfers.map(([from, to]) => {
        const pts = [latLngOf(from), latLngOf(to)];
        const outline = L.polyline(pts, { renderer, color: "#1a1a1a", interactive: false }).addTo(map);
        const core = L.polyline(pts, { renderer, color: "#ffffff", interactive: false }).addTo(map);
        return { outline, core };
      });

      const stationDots = stations.map((s) => {
        const dot = L.circleMarker([s.lat, s.lng], {
          renderer,
          color: "#1a1a1a",
          fillColor: "#ffffff",
          fillOpacity: 1,
        }).addTo(map);
        dot.bindTooltip(
          `<div class="station-tip-name">${s.name}</div><div class="station-tip-routes">${s.routes
            .map(bulletHtml)
            .join("")}</div>`,
          { direction: "top", className: "station-tip", opacity: 1 }
        );
        return { dot, lanes: lanesAt.get(s.id) ?? 1 };
      });

      const redraw = () => {
        const zoom = map.getZoom();
        const w = lineWeight(zoom);

        for (const { line, a, b, slot } of lanes) {
          if (slot === 0) {
            line.setLatLngs([a, b]);
          } else {
            const pa = map.project(a, zoom);
            const pb = map.project(b, zoom);
            const len = pa.distanceTo(pb) || 1;
            const nx = (-(pb.y - pa.y) / len) * slot * w;
            const ny = ((pb.x - pa.x) / len) * slot * w;
            line.setLatLngs([
              map.unproject([pa.x + nx, pa.y + ny], zoom),
              map.unproject([pb.x + nx, pb.y + ny], zoom),
            ]);
          }
          line.setStyle({ weight: w });
        }

        for (const { outline, core } of transferLines) {
          outline.setStyle({ weight: w * 1.4 });
          core.setStyle({ weight: Math.max(1, w * 1.4 - 3) });
        }

        for (const { dot, lanes: n } of stationDots) {
          const r = Math.max(w * 0.75, (n * w) / 2);
          dot.setRadius(r);
          dot.setStyle({ weight: zoom >= 12 ? 1.5 : 1 });
          const tip = dot.getTooltip();
          if (tip) tip.options.offset = [0, -r];
        }
      };

      map.on("zoomend", redraw);
      redraw();
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [stations, segments, transfers]);

  return <div ref={containerRef} className="h-full w-full" />;
}
