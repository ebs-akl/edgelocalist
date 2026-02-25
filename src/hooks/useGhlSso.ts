import { useEffect, useState, useCallback, useRef } from "react";

/**
 * GHL Custom Page SSO handshake hook.
 * Posts REQUEST_USER_DATA to parent/top frames, captures the encrypted payload.
 * Hardened to accept multiple GHL message formats.
 */

const SSO_URL_KEYS = ["payload", "sso", "session", "token", "userData"];
const BASE64_LIKE_RE = /^[A-Za-z0-9+/=_-]+$/;

function normalizeSsoCandidate(value: string | null | undefined): string | null {
  if (!value) return null;

  let normalized = value.trim();
  if (!normalized) return null;

  try {
    if (/%[0-9A-Fa-f]{2}/.test(normalized)) {
      normalized = decodeURIComponent(normalized);
    }
  } catch {
    // noop
  }

  normalized = normalized.replace(/\s+/g, "");
  normalized = normalized.replace(/-/g, "+").replace(/_/g, "/");

  if (!BASE64_LIKE_RE.test(normalized) || normalized.length < 20) {
    return null;
  }

  const remainder = normalized.length % 4;
  if (remainder !== 0) {
    normalized = normalized.padEnd(normalized.length + (4 - remainder), "=");
  }

  return normalized;
}

function getSsoFromUrl(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    for (const key of SSO_URL_KEYS) {
      const val = normalizeSsoCandidate(params.get(key));
      if (val) return val;
    }

    // Also check hash params (some GHL versions use hash)
    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      for (const key of SSO_URL_KEYS) {
        const val = normalizeSsoCandidate(hashParams.get(key));
        if (val) return val;
      }
    }
  } catch {}
  return null;
}

/**
 * Extract a payload from ANY incoming postMessage event.
 * GHL has shipped multiple message formats over time, so we cast a wide net.
 */
function extractPayloadFromMessage(data: any): string | null {
  if (!data) return null;

  // If the message itself is a long string, it might BE the payload
  if (typeof data === "string" && data.length > 20) {
    try {
      const parsed = JSON.parse(data);
      return extractPayloadFromMessage(parsed);
    } catch {
      return normalizeSsoCandidate(data);
    }
  }

  if (typeof data !== "object") return null;

  // Standard GHL response format
  const payloadKeys = [
    "payload", "ssoPayload", "userData", "userPayload",
    "sso_payload", "encryptedPayload", "encrypted_payload",
    "token", "ssoToken", "data"
  ];

  for (const key of payloadKeys) {
    const val = data[key];
    if (typeof val === "string" && val.length > 20) {
      const normalized = normalizeSsoCandidate(val);
      if (normalized) return normalized;
    }
    // Nested object with payload
    if (val && typeof val === "object" && val.payload && typeof val.payload === "string" && val.payload.length > 20) {
      const nested = normalizeSsoCandidate(val.payload);
      if (nested) return nested;
    }
  }

  return null;
}

export function useGhlSso() {
  const [ssoPayload, setSsoPayload] = useState<string | null>(null);
  const [ssoReady, setSsoReady] = useState(false);
  const [ssoError, setSsoError] = useState<string | null>(null);
  const handshakeComplete = useRef(false);
  const listenerRef = useRef<((event: MessageEvent) => void) | null>(null);
  const messageCount = useRef(0);

  const isInIframe = useCallback(() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }, []);

  const sendRequest = useCallback(() => {
    // Send multiple message formats GHL might expect
    const messages = [
      { message: "REQUEST_USER_DATA" },
      { type: "REQUEST_USER_DATA" },
      { action: "REQUEST_USER_DATA" },
      "REQUEST_USER_DATA",
    ];
    for (const msg of messages) {
      try { window.parent.postMessage(msg, "*"); } catch {}
      try {
        if (window.top && window.top !== window.parent) {
          window.top.postMessage(msg, "*");
        }
      } catch {}
    }
    console.log("📤 Sent REQUEST_USER_DATA (all formats)");
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

      messageCount.current++;
      // Log ALL messages for debugging (first 5 only to avoid spam)
      if (messageCount.current <= 5) {
        console.log(`📨 Message #${messageCount.current} from ${event.origin}:`,
          typeof event.data === "string"
            ? event.data.substring(0, 100)
            : JSON.stringify(event.data)?.substring(0, 200)
        );
      }

      const payload = extractPayloadFromMessage(event.data);
      if (payload) {
        console.log("✅ SSO payload captured — killing listener immediately");
        handshakeComplete.current = true;
        killListener();
        setSsoPayload(payload);
        setSsoReady(true);
        setSsoError(null);
      }
    };

    listenerRef.current = handleMessage;
    window.addEventListener("message", handleMessage);

    // Send immediately, then retry at increasing intervals
    sendRequest();

    const retry1 = setTimeout(() => {
      if (handshakeComplete.current) return;
      console.log("🔄 Retry 1...");
      sendRequest();
    }, 1500);

    const retry2 = setTimeout(() => {
      if (handshakeComplete.current) return;
      console.log("🔄 Retry 2...");
      sendRequest();
    }, 4000);

    const retry3 = setTimeout(() => {
      if (handshakeComplete.current) return;
      console.log("🔄 Retry 3...");
      sendRequest();
    }, 7000);

    const finalTimeout = setTimeout(() => {
      if (!handshakeComplete.current) {
        killListener();
        console.error(`❌ SSO handshake timed out after ${messageCount.current} messages received`);
        setSsoError(
          `SSO handshake timed out (${messageCount.current} messages received). ` +
          "The HighLevel connection could not be established."
        );
        setSsoReady(true);
      }
    }, 10000); // Extended to 10s

    return () => {
      killListener();
      clearTimeout(retry1);
      clearTimeout(retry2);
      clearTimeout(retry3);
      clearTimeout(finalTimeout);
    };
  }, [isInIframe, sendRequest, killListener]);

  const retry = useCallback(() => {
    handshakeComplete.current = false;
    messageCount.current = 0;
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
