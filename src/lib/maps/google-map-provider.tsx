"use client";
import { APIProvider } from "@vis.gl/react-google-maps";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { debugLog } from "@/lib/debug";
const Enabled = createContext(false);
export function GoogleMapProvider({
  children,
  enabled,
}: {
  children: ReactNode;
  enabled: boolean;
}) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  // Presence only: never log the key itself. Once per mount, not per render.
  const logged = useRef(false);
  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    debugLog("maps", "provider init", { enabled, hasKey: !!key });
  }, [enabled, key]);
  if (!enabled || !key)
    return <Enabled.Provider value={false}>{children}</Enabled.Provider>;
  // Google loads once per document. Omit language so browser preference remains stable across locale navigation.
  return (
    <Enabled.Provider value>
      <APIProvider apiKey={key} version="weekly" disableUsageAttribution>
        {children}
      </APIProvider>
    </Enabled.Provider>
  );
}
export const useMapsEnabled = () => useContext(Enabled);
