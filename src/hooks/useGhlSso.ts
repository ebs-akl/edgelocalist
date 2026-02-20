import { useEffect, useState, useCallback } from "react";

/**
 * GHL Custom Page SSO handshake hook.
 * Sends REQUEST_USER_DATA to the parent GHL iframe and waits for
 * the encrypted SSO payload response.
 */
export function useGhlSso() {
  const [ssoPayload, setSsoPayload] = useState<string | null>(null);
  const [ssoReady, setSsoReady] = useState(false);
  const [ssoError, setSsoError] = useState<string | null>(null);

  const isInIframe = useCallback(() => {
    try {
      return window.self !== window.top;
    } catch {
      return true; // cross-origin = definitely in iframe
    }
  }, []);

  useEffect(() => {
    // Only run the handshake when inside an iframe
    if (!isInIframe()) {
      setSsoReady(true); // not in iframe, skip SSO
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout>;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.message === "REQUEST_USER_DATA_RESPONSE" && event.data?.payload) {
        setSsoPayload(event.data.payload);
        setSsoReady(true);
        setSsoError(null);
        clearTimeout(timeoutId);
      }
    };

    window.addEventListener("message", handleMessage);

    // Request user data from GHL parent
    window.parent.postMessage({ message: "REQUEST_USER_DATA" }, "*");

    // Timeout after 10s
    timeoutId = setTimeout(() => {
      if (!ssoPayload) {
        setSsoError("SSO handshake timed out");
        setSsoReady(true); // allow fallback
      }
    }, 10000);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearTimeout(timeoutId);
    };
  }, [isInIframe]);

  return { ssoPayload, ssoReady, ssoError, isInIframe: isInIframe() };
}
