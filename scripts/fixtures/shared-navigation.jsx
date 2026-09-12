import React, { useSyncExternalStore } from "react";
const subscribe = (callback) => {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
};
export function useSearchParams() {
  return new URLSearchParams(
    useSyncExternalStore(subscribe, () => window.location.search),
  );
}
export function usePathname() {
  return window.location.pathname;
}
export const useRouter = () => ({
  push: (url) => {
    history.pushState({}, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  },
  replace: (url) => {
    history.replaceState({}, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  },
});
export function Link({ href, children, scroll, ...props }) {
  void scroll;
  return (
    <a
      href={href}
      {...props}
      onClick={(e) => {
        e.preventDefault();
        history.pushState({}, "", href);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }}
    >
      {children}
    </a>
  );
}
