const PREVIEW_HOST_MARKERS = ["lovableproject.com", "id-preview--", "localhost"];

export function isGhlIframeHost(hostname: string) {
  return !PREVIEW_HOST_MARKERS.some((marker) => hostname.includes(marker));
}

export function isRunningInGhlIframe() {
  try {
    if (window.self === window.top) return false;
    return isGhlIframeHost(window.location.hostname);
  } catch {
    return true;
  }
}