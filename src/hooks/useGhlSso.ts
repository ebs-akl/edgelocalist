import { useEffect, useState, useCallback, useRef } from "react";

/**
 * GHL Custom Page SSO handshake hook.
 * Posts REQUEST_USER_DATA to parent/top frames, captures the encrypted payload.
 * Uses a `handshakeComplete` ref to prevent duplicate processing.
 */

const SSO_URL_KEYS = ["payload", "sso", "session"];

function getSsoFromUrl(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    for (const key of SSO_URL_KEYS) {
      const val = params.get(key);
      if (val && val.length > 20) return val;
    }
  } catch {}
  return null;
}

function isResponseMessage(data: any): boolean {
  if (!data || typeof data !== "object") return false;
  const tag = data.message || data.type || data.action;
  return tag === "REQUEST_USER_DATA_RESPONSE";
}

function getPayloadFromEvent(data: any): string | null {
  if (!data || typeof data !== "object") return null;
  return data.payload || data.ssoPayload || data.userData || null;
}

export function useGhlSso() {
  const [ssoPayload, setSsoPayload] = useState<string | null>(null);
  const [ssoReady, setSsoReady] = useState(false);
  const [ssoError, setSsoError] = useState<string | null>(null);
  const handshakeComplete = useRef(false);

  const isInIframe = useCallback(() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }, []);

  const sendRequest = useCallback(() => {
    const msg = { message: "REQUEST_USER_DATA" };
    window.parent.postMessage(msg, "*");
    try {
      if (window.top && window.top !== window.parent) {
        window.top.postMessage(msg, "*");
      }
    } catch {}
  }, []);

  const startHandshake = useCallback((): (() => void) => {
    if (!isInIframe()) {
      setSsoReady(true);
      return () => {};
    }

    // Already completed — don't restart
    if (handshakeComplete.current) {
      return () => {};
    }

    // URL parameter fallback
    const urlPayload = getSsoFromUrl();
    if (urlPayload) {
      console.log("🔑 SSO payload found in URL params");
      handshakeComplete.current = true;
      setSsoPayload(urlPayload);
      setSsoReady(true);
      return () => {};
    }

    const handleMessage = (event: MessageEvent) => {
      // Ignore if we already have a payload
      if (handshakeComplete.current) return;

      console.log("📨 RAW MESSAGE RECEIVED:", event.data);

      if (isResponseMessage(event.data)) {
        const payload = getPayloadFromEvent(event.data);
        if (payload) {
          console.log("✅ SSO payload captured, handshake complete");
          handshakeComplete.current = true;
          setSsoPayload(payload);
          setSsoReady(true);
          setSsoError(null);
        }
      }
    };

    window.addEventListener("message", handleMessage);

    // Wait 500ms then first attempt
    const initialDelay = setTimeout(() => {
      if (handshakeComplete.current) return;
      sendRequest();

      const retryTimeout = setTimeout(() => {
        if (handshakeComplete.current) return;
        console.warn("Handshake timeout, retrying...");
        sendRequest();

        const finalTimeout = setTimeout(() => {
          if (!handshakeComplete.current) {
            setSsoError("SSO handshake timed out. The HighLevel connection could not be established.");
            setSsoReady(true);
          }
        }, 3000);
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
  }, [isInIframe, sendRequest]);

  const retry = useCallback(() => {
    handshakeComplete.current = false;
    setSsoPayload(null);
    setSsoReady(false);
    setSsoError(null);
    startHandshake();
  }, [startHandshake]);

  useEffect(() => {
    const cleanup = startHandshake();
    return cleanup;
  }, [startHandshake]);

  return { ssoPayload, ssoReady, ssoError, isInIframe: isInIframe(), retry };
}
