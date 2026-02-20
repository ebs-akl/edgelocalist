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
  const listenerRef = useRef<((event: MessageEvent) => void) | null>(null);

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

  const killListener = useCallback(() => {
    if (listenerRef.current) {
      window.removeEventListener("message", listenerRef.current);
      listenerRef.current = null;
      console.log("🔇 Message listener removed");
    }
  }, []);

  const startHandshake = useCallback((): (() => void) => {
    if (!isInIframe()) {
      setSsoReady(true);
      return () => {};
    }

    if (handshakeComplete.current) {
      return () => {};
    }

    const urlPayload = getSsoFromUrl();
    if (urlPayload) {
      console.log("🔑 SSO payload found in URL params");
      handshakeComplete.current = true;
      setSsoPayload(urlPayload);
      setSsoReady(true);
      return () => {};
    }

    const handleMessage = (event: MessageEvent) => {
      if (handshakeComplete.current) return;

      if (isResponseMessage(event.data)) {
        const payload = getPayloadFromEvent(event.data);
        if (payload) {
          console.log("✅ SSO payload captured — killing listener immediately");
          handshakeComplete.current = true;
          // Kill listener IMMEDIATELY so no more messages are processed
          killListener();
          setSsoPayload(payload);
          setSsoReady(true);
          setSsoError(null);
        }
      }
    };

    listenerRef.current = handleMessage;
    window.addEventListener("message", handleMessage);

    const initialDelay = setTimeout(() => {
      if (handshakeComplete.current) return;
      sendRequest();

      const retryTimeout = setTimeout(() => {
        if (handshakeComplete.current) return;
        console.warn("Handshake timeout, retrying...");
        sendRequest();

        const finalTimeout = setTimeout(() => {
          if (!handshakeComplete.current) {
            killListener();
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
      killListener();
      clearTimeout(initialDelay);
      clearTimeout((window as any).__ghlRetryTimeout);
      clearTimeout((window as any).__ghlFinalTimeout);
    };
  }, [isInIframe, sendRequest, killListener]);

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
