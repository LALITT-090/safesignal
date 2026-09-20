export function getAnonymousToken(): string {
  const storageKey = "safesignal_anonymous_token";

  if (typeof window !== "undefined" && "localStorage" in window) {
    const existing = window.localStorage.getItem(storageKey);
    if (existing && existing.trim().length > 0) {
      return existing;
    }
  }

  const generated =
    typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `anon-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  if (typeof window !== "undefined" && "localStorage" in window) {
    window.localStorage.setItem(storageKey, generated);
  }

  return generated;
}
