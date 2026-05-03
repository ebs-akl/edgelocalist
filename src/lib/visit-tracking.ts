// Lightweight first-party cookie tracking for visits / re-visits.
// All cookies are first-party, SameSite=Lax, and only set after the user
// has accepted the cookie consent banner (consent === "accepted").

const YEAR = 60 * 60 * 24 * 365;
const SESSION_MIN = 30; // a "session" ends after 30 idle minutes

function readCookie(name: string): string | null {
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(name + "="));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function writeCookie(name: string, value: string, maxAgeSeconds = YEAR) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

function hasConsent(): boolean {
  return readCookie("cookie_consent") === "accepted";
}

export function trackVisit() {
  if (typeof document === "undefined") return;
  if (!hasConsent()) return;

  const now = new Date();
  const nowIso = now.toISOString();

  const firstVisit = readCookie("localist_first_visit");
  const lastVisit = readCookie("localist_last_visit");
  const session = readCookie("localist_session");
  const countRaw = readCookie("localist_visit_count");
  const count = countRaw ? parseInt(countRaw, 10) || 0 : 0;

  if (!firstVisit) {
    writeCookie("localist_first_visit", nowIso);
    writeCookie("localist_referrer", document.referrer || "(direct)");
    writeCookie("localist_landing_path", window.location.pathname + window.location.search);
  }

  const sessionExpired =
    !session ||
    (lastVisit &&
      now.getTime() - new Date(lastVisit).getTime() > SESSION_MIN * 60 * 1000);

  if (sessionExpired) {
    writeCookie("localist_visit_count", String(count + 1));
    writeCookie("localist_session", nowIso, SESSION_MIN * 60);
    if (firstVisit) writeCookie("localist_returning", "1");
  } else {
    writeCookie("localist_session", session!, SESSION_MIN * 60);
  }

  writeCookie("localist_last_visit", nowIso);
}

export function getVisitInfo() {
  return {
    firstVisit: readCookie("localist_first_visit"),
    lastVisit: readCookie("localist_last_visit"),
    visitCount: parseInt(readCookie("localist_visit_count") || "0", 10),
    returning: readCookie("localist_returning") === "1",
    referrer: readCookie("localist_referrer"),
    landingPath: readCookie("localist_landing_path"),
  };
}
