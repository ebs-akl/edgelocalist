import { useEffect, useState, useCallback, useRef } from "react";

/**
 * GHL Custom Page SSO handshake hook.
 * Implements a "patient" handshake with retry logic:
 * 1. Wait 500ms after load before first REQUEST_USER_DATA
 * 2. If no response in 3s, retry once
 * 3. Final timeout after another 3s
 */
export function useGhlSso() {
  const [ssoPayload, setSsoPayload] = useState<string | null>(null);
  const [ssoReady, setSsoReady] = useState(false);
  const [ssoError, setSsoError] = useState<string | null>(null);
  const receivedRef = useRef(false);

  const isInIframe = useCallback(() => {
    try {
      return window.self !== window.top;
    } catch {
      return true; // cross-origin = definitely in iframe
    }
  }, []);

  const retry = useCallback(() => {
    receivedRef.current = false;
    setSsoPayload(null);
    setSsoReady(false);
    setSsoError(null);
    // Re-trigger the effect by forcing a state change
    startHandshake();
  }, []);

  const startHandshake = useCallback(() => {
    if (!isInIframe()) {
      setSsoReady(true);
      return;
    }

    receivedRef.current = false;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.message === "REQUEST_USER_DATA_RESPONSE" && event.data?.payload) {
        receivedRef.current = true;
        setSsoPayload(event.data.payload);
        setSsoReady(true);
        setSsoError(null);
      }
    };

    window.addEventListener("message", handleMessage);

    // Wait 500ms before first attempt
    const initialDelay = setTimeout(() => {
      if (receivedRef.current) return;
      window.parent.postMessage({ message: "REQUEST_USER_DATA" }, "*");

      // If no response in 3s, retry once
      const retryTimeout = setTimeout(() => {
        if (receivedRef.current) return;
        console.warn("Handshake timeout, retrying...");
        window.parent.postMessage({ message: "REQUEST_USER_DATA" }, "*");

        // Final timeout after another 3s
        const finalTimeout = setTimeout(() => {
          if (!receivedRef.current) {
            setSsoError("SSO handshake timed out. The HighLevel connection could not be established.");
            setSsoReady(true); // allow error UI to render
          }
        }, 3000);

        // Store for cleanup
        (window as any).__ghlFinalTimeout = finalTimeout;
      }, 3000);

      (window as any).__ghlRetryTimeout = retryTimeout;
    }, 500);

    (window as any).__ghlInitialDelay = initialDelay;

    return () => {
      window.removeEventListener("message", handleMessage);
      clearTimeout(initialDelay);
      clearTimeout((window as any).__ghlRetryTimeout);
      clearTimeout((window as any).__ghlFinalTimeout);
    };
  }, [isInIframe]);

  useEffect(() => {
    const cleanup = startHandshake();
    return cleanup;
  }, [startHandshake]);

  return { ssoPayload, ssoReady, ssoError, isInIframe: isInIframe(), retry };
}
