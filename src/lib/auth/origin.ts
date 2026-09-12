/** Shared by browser auth and server callbacks; never trust the incoming host. */
export function getAuthOrigin() {
  return process.env.NODE_ENV === "production"
    ? "https://tripify-agent.vercel.app"
    : "http://localhost:3000";
}

export function authURL(path: string) {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    throw new Error("Auth destinations must be local paths");
  }
  return new URL(path, getAuthOrigin()).toString();
}
