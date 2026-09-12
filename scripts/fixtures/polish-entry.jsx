import React, { useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { MvpView } from "../../src/components/mvp/mvp-view";
import { MvpShell } from "../../src/components/mvp/mvp-shell";
import { Provider } from "./shared-provider";
const subscribe = (callback) => {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
};
function App() {
  const path = useSyncExternalStore(subscribe, () => location.pathname);
  return (
    <MvpShell>
      <MvpView path={path.split("/").filter(Boolean).slice(1)} />
    </MvpShell>
  );
}
const locale = new URLSearchParams(location.search).get("locale") || "en";
createRoot(document.getElementById("root")).render(
  <NextIntlClientProvider
    locale={locale}
    messages={window.testMessages[locale]}
    timeZone="UTC"
  >
    <Provider>{() => <App />}</Provider>
  </NextIntlClientProvider>,
);
