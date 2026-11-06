import MapView from "@/components/MapView";
import boroughs from "@/data/boroughs.json";
import subwayMap from "@/data/map.json";
import proposed from "@/data/proposed.json";

export const metadata = {
  title: "Current Subway Map · NYC Subway Editor",
};

// Server shell: hands the bundled data to the client MapView, which merges in
// any proposed lines the user switches on and builds the network to draw.
export default function MapPage() {
  return <MapView baseMap={subwayMap} proposals={proposed} boroughs={boroughs} />;
}
