import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { Provider } from "./map-provider";
import { GoogleMapProvider } from "../../src/lib/maps/google-map-provider";
import { useRoutes } from "../../src/lib/maps/use-routes";
import { MapPanel } from "../../src/components/trip/map/map-panel";
import { DayTimeline } from "../../src/components/trip/journey/day-timeline";
import { dayActivities } from "../../src/lib/maps/schedule";
import "../../src/components/mvp/mvp.css";
import "../../src/components/trip/workspace/workspace.css";
const locale = new URLSearchParams(location.search).get("locale") || "en";
function Workspace({ trip }) {
  const [day, setDay] = useState(1),
    [selected, setSelected] = useState("a"),
    [hovered, setHovered] = useState(null);
  const routing = useRoutes(trip, day);
  const items = dayActivities(trip.activities, day);
  return (
    <GoogleMapProvider enabled>
      <div className="fixture-workspace">
        <section className="fixture-map" style={{ height: 550 }}>
          <MapPanel
            trip={trip}
            day={day}
            onDayChange={setDay}
            onFullscreen={() => {}}
            items={items}
            selected={items.find((a) => a.id === selected)}
            onSelect={setSelected}
            hovered={hovered}
            onHover={setHovered}
            routing={routing}
            routes={routing.segments}
          />
        </section>
        <section
          className="fixture-planner dock-panel"
          data-state="open"
          data-active="true"
        >
          <DayTimeline
            trip={trip}
            day={day}
            items={items}
            selected={selected}
            onSelect={setSelected}
            hovered={hovered}
            onHover={setHovered}
            routes={routing.segments}
          />
        </section>
      </div>
    </GoogleMapProvider>
  );
}
createRoot(document.getElementById("root")).render(
  <NextIntlClientProvider
    locale={locale}
    messages={window.testMessages[locale]}
    timeZone="UTC"
  >
    <div className="trip-app-theme">
      <Provider>{(trip) => <Workspace trip={trip} />}</Provider>
    </div>
  </NextIntlClientProvider>,
);
