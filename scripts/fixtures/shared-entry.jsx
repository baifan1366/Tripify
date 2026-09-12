import React from "react";
import { createRoot } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { TripWorkspace } from "../../src/components/trip/workspace/trip-workspace";
import { Provider } from "./shared-provider";
import "../../src/components/mvp/mvp.css";
import "../../src/components/app-shell/app-shell.css";
const locale = new URLSearchParams(location.search).get("locale") || "en";
const messages = window.testMessages[locale];
createRoot(document.getElementById("root")).render(
  <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
    <Provider>
      {(trip) => (
        <div
          className="mvp-shell app-shell trip-app-theme"
          style={{ gridTemplateColumns: "minmax(0, 1fr)" }}
        >
          <div className="mvp-body">
            <TripWorkspace trip={trip} />
          </div>
        </div>
      )}
    </Provider>
  </NextIntlClientProvider>,
);
