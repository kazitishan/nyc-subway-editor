"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { bulletSrc } from "@/data/routes";

// Track width in pixels for a zoom level; lanes sit side by side at this spacing.
const lineWeight = (zoom) => Math.min(7, Math.max(2, (zoom - 9) * 1.25));

// Tooltips are plain HTML strings, so bullets here are <img> tags rather than next/image.
const bulletHtml = (route) =>
  `<img class="route-bullet" src="${bulletSrc(route)}" alt="${route}" width="20" height="20" />`;

const bulletsHtml = (routes) =>
  `<div class="station-tip-routes">${routes.map(bulletHtml).join("")}</div>`;

const accessibilityLabel = (s) =>
  s.accessibility === "full"
    ? "Accessible"
    : s.accessibility === "partial"
      ? `Accessible: ${s.accessibilityNote ?? "partial"}`
      : null;

// Station name, followed by the accessibility icon when the station has one.
const nameHtml = (s) => {
  const label = accessibilityLabel(s);
  const icon = label
    ? `<img class="ada-icon" src="/ada.svg" alt="${label}" title="${label}" width="16" height="16" />`
    : "";
  return `<div class="station-tip-name">${s.name}${icon}</div>`;
};

// Click popup: name, borough, trains stopping here, and in-station transfers.
// Transfer platforms with a different name (e.g. 42 St-Port Authority at
// Times Sq) are labelled; same-named ones just list their trains.
function stationPopupHtml(s) {
  const transfers = s.transfers.length
    ? `<div class="station-popup-section">
        <div class="station-popup-label">Transfers</div>
        ${s.transfers
          .map(
            (t) => `<div class="station-popup-transfer">
              ${bulletsHtml(t.routes)}
              ${t.name !== s.name ? `<span class="station-popup-via">${t.name}</span>` : ""}
            </div>`
          )
          .join("")}
      </div>`
    : "";

  const label = accessibilityLabel(s);
  return `${nameHtml(s)}
    <div class="station-popup-borough">${s.borough}${label ? ` · ${label}` : ""}</div>
    <div class="station-popup-section">
      <div class="station-popup-label">Trains</div>
      ${bulletsHtml(s.routes)}
    </div>
    ${transfers}`;
}

export default function SubwayMap({ stations, segments, transfers, boroughs }) {
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

      // Keep the view around NYC: the five boroughs plus a margin of 15% on each side.
      const panBounds = L.geoJSON(boroughs).getBounds().pad(0.15);

      map = L.map(containerRef.current, {
        zoomControl: false,
        preferCanvas: true,
        maxZoom: 18,
        maxBounds: panBounds,
        maxBoundsViscosity: 1, // hard stop at the edge rather than rubber-banding
        // Quarter-step zoom levels let the zoom-out limit fit NYC closely
        // instead of jumping to the next whole level, which shows far more area.
        zoomSnap: 0.25,
      });
      L.control.zoom({ position: "bottomright" }).addTo(map);
      // The map needs a view before canvas layers can be added to it.
      map.fitBounds(
        L.latLngBounds(stations.map((s) => [s.lat, s.lng])),
        { padding: [24, 24] }
      );

      // Don't allow zooming out past the point where the whole allowed area fits
      // on screen; recompute when the window size changes.
      const limitZoomOut = () => map.setMinZoom(map.getBoundsZoom(panBounds));
      limitZoomOut();
      map.on("resize", limitZoomOut);

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

      // Borough outlines (NYC Open Data, simplified), drawn first so they sit under the lines.
      L.geoJSON(boroughs, {
        renderer,
        interactive: false,
        style: { color: "#525252", weight: 1.5, opacity: 0.7, fill: false },
      }).addTo(map);

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
          `${nameHtml(s)}${bulletsHtml(s.routes)}`,
          { direction: "top", className: "station-tip", opacity: 1 }
        );
        dot.bindPopup(stationPopupHtml(s), {
          className: "station-popup",
          closeButton: false,
          autoPanPadding: [24, 24],
        });
        // The popup repeats the tooltip's content, so don't show both at once.
        dot.on("popupopen", () => dot.closeTooltip());
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
          dot.getTooltip().options.offset = [0, -r];
          // Leaflet's default popup offset is [0, 7]; lift it to the dot's top edge.
          dot.getPopup().options.offset = [0, 7 - r];
          if (dot.isPopupOpen()) dot.getPopup().update();
        }
      };

      map.on("zoomend", redraw);
      redraw();
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [stations, segments, transfers, boroughs]);

  return <div ref={containerRef} className="h-full w-full" />;
}
