import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
const Context = createContext(null);
class LatLng {
  constructor(value) {
    this.value = value;
  }
  lat() {
    return this.value.lat;
  }
  lng() {
    return this.value.lng;
  }
  toJSON() {
    return this.value;
  }
}
class Bounds {
  constructor() {
    this.points = [];
  }
  extend(p) {
    this.points.push(p);
  }
  isEmpty() {
    return !this.points.length;
  }
  getNorthEast() {
    return new LatLng({
      lat: Math.max(...this.points.map((p) => p.lat)),
      lng: Math.max(...this.points.map((p) => p.lng)),
    });
  }
  getSouthWest() {
    return new LatLng({
      lat: Math.min(...this.points.map((p) => p.lat)),
      lng: Math.min(...this.points.map((p) => p.lng)),
    });
  }
  getCenter() {
    return this.getNorthEast();
  }
}
const placesById = {
  market: {
    id: "market",
    displayName: "Nishiki Market",
    location: new LatLng({ lat: 35.005, lng: 135.765 }),
    formattedAddress: "Kyoto, Japan",
    rating: 4.4,
    primaryTypeDisplayName: "Market",
    regularOpeningHours: {
      weekdayDescriptions: ["Tuesday: 09:00 – 18:00"],
      periods: [
        {
          open: { day: 2, hour: 9, minute: 0 },
          close: { day: 2, hour: 18, minute: 0 },
        },
      ],
    },
    googleMapsURI: "https://maps.google.com/?q=Nishiki+Market",
  },
};
class Place {
  constructor({ id }) {
    Object.assign(this, placesById[id] || placesById.market);
  }
  async fetchFields() {
    if (window.failPlaces) throw Error("Places unavailable");
    return { place: this };
  }
  static async searchByText({ textQuery }) {
    window.placeSearches = (window.placeSearches || 0) + 1;
    if (window.failPlaces) throw Error("Places unavailable");
    return {
      places: textQuery.includes("nothing")
        ? []
        : [new Place({ id: "market" })],
    };
  }
}
const library = { Place };
window.google = {
  maps: {
    LatLngBounds: Bounds,
    TransitLayer: class {
      setMap(map) {
        window.transitVisible = !!map;
      }
    },
    event: {
      addListener: (map, name, callback) => map.addListener(name, callback),
      trigger: (map, name) => map.emit(name),
    },
  },
};
export const APILoadingStatus = {
  LOADED: "LOADED",
  FAILED: "FAILED",
  AUTH_FAILURE: "AUTH_FAILURE",
};
export function useApiLoadingStatus() {
  return "LOADED";
}
export function useMapsLibrary() {
  return library;
}
export function useMap() {
  return useContext(Context);
}
export function APIProvider({ children }) {
  return children;
}
export function Map({ children }) {
  const element = useRef(null);
  const [api] = useState(() => {
    const listeners = {};
    return {
      getDiv: () => element.current,
      getBounds: () => ({ north: 36, south: 34, east: 136, west: 134 }),
      getCenter: () => new LatLng({ lat: 35, lng: 135 }),
      getZoom: () => 13,
      getMapTypeId: () => "roadmap",
      moveCamera: (p) => {
        window.lastCamera = p;
      },
      panTo: (p) => {
        window.lastCamera = { center: p };
      },
      addListener: (name, cb) => {
        (listeners[name] ??= new Set()).add(cb);
        return { remove: () => listeners[name].delete(cb) };
      },
      emit: (name, event) => {
        for (const cb of listeners[name] || []) cb(event);
      },
    };
  });
  useEffect(() => {
    window.testMap = api;
    const timer = setTimeout(() => api.emit("tilesloaded"), 50);
    return () => clearTimeout(timer);
  }, [api]);
  return (
    <Context.Provider value={api}>
      <div
        ref={element}
        style={{
          position: "relative",
          height: "100%",
          minHeight: 400,
          background: "#edf2f5",
        }}
      >
        <span
          style={{ position: "absolute", bottom: 0, right: 0, fontSize: 10 }}
        >
          Isolated Google SDK fixture
        </span>
        {children}
      </div>
    </Context.Provider>
  );
}
export function AdvancedMarker({ children, position, zIndex }) {
  const lat =
    typeof position?.lat === "function" ? position.lat() : position?.lat;
  return (
    <div
      style={{
        position: "absolute",
        left: `${25 + (((lat || 0) * 1000) % 50)}%`,
        top: zIndex >= 10 ? "55%" : "75%",
        zIndex,
      }}
    >
      {children}
    </div>
  );
}
export function Polyline() {
  return null;
}
