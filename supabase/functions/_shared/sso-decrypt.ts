import CryptoJS from "npm:crypto-js";

/**
 * Decrypt a GHL SSO payload, trying all configured candidate keys and
 * common payload normalization variants. Returns the locationId, or null.
 *
 * IMPORTANT: GHL Marketplace apps each have their OWN shared secret. In this
 * Supabase project we host multiple apps (LocaList, ALOMAR, COOKY) so we MUST
 * try every configured *_LOCALIST/_ALOMAR/_COOKY/legacy slot — the SSO verify
 * function does the same. If only one slot is checked, the wrong-app key will
 * always fail with "Cryptographic verification failed".
 */
function getCandidateKeys(): Array<{ name: string; key: string }> {
  const candidates = [
    { name: "GHL_SSO_KEY_LOCALIST", key: Deno.env.get("GHL_SSO_KEY_LOCALIST") },
    { name: "GHL_SSO_KEY_ALOMAR", key: Deno.env.get("GHL_SSO_KEY_ALOMAR") },
    { name: "GHL_SSO_KEY_COOKY", key: Deno.env.get("GHL_SSO_KEY_COOKY") },
    { name: "GHL_SSO_KEY", key: Deno.env.get("GHL_SSO_KEY") },
    { name: "VITE_GHL_SHARED_SECRET", key: Deno.env.get("VITE_GHL_SHARED_SECRET") },
  ];
  return candidates.filter((c): c is { name: string; key: string } => !!c.key && c.key.length > 0);
}

function getPayloadVariants(payload: string): string[] {
  const variants = new Set<string>();
  const add = (v: string | null | undefined) => { if (v && v.trim()) variants.add(v.trim()); };
  add(payload);
  add(payload.replace(/ /g, "+"));
  add(payload.replace(/-/g, "+").replace(/_/g, "/"));
  add(payload.replace(/\s+/g, ""));
  add(payload.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/"));
  try {
    const decoded = decodeURIComponent(payload);
    add(decoded);
    add(decoded.replace(/ /g, "+"));
    add(decoded.replace(/-/g, "+").replace(/_/g, "/"));
    add(decoded.replace(/\s+/g, ""));
    add(decoded.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/"));
  } catch { /* noop */ }
  return Array.from(variants);
}

export function decryptSsoPayloadFull(
  ssoPayload: string
): { locationId: string; companyId: string | null } | null {
  const keys = getCandidateKeys();
  if (keys.length === 0) {
    console.error("No GHL SSO keys configured");
    return null;
  }
  const variants = getPayloadVariants(ssoPayload);
  for (const { name, key } of keys) {
    for (const variant of variants) {
      try {
        const bytes = CryptoJS.AES.decrypt(variant, key);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        if (decrypted && decrypted.trim().startsWith("{")) {
          const data = JSON.parse(decrypted);
          const loc = data.activeLocation ?? data.locationId ?? data.location_id ?? null;
          const co =
            data.companyId ??
            data.company_id ??
            (data.company && typeof data.company === "object" ? data.company.id : null) ??
            null;
          if (loc) {
            console.log(`✅ SSO decrypted with ${name}, locationId=${loc}`);
            return { locationId: String(loc), companyId: co ? String(co) : null };
          }
        }
      } catch { /* try next */ }
    }
  }
  console.error("SSO decryption failed across all candidate keys");
  return null;
}

export function decryptSsoPayload(ssoPayload: string): string | null {
  return decryptSsoPayloadFull(ssoPayload)?.locationId ?? null;
}
