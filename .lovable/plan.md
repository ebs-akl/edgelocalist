# Fix LocaList SSO Decryption ("Malformed UTF-8 data")

## Problem
`localist-sso-verify` only attempts decryption with `GHL_SSO_KEY_LOCALIST`. Every recent SSO attempt fails with `Malformed UTF-8 data` — meaning AES decrypts to garbage bytes (wrong key). The Alomar sibling app solves this by trying **all configured GHL app keys** as fallbacks, and it works.

## Fix

### 1. Edit `supabase/functions/localist-sso-verify/index.ts`
Replace the single-key array with a candidate-key loop that tries every configured GHL SSO secret until one yields valid JSON:

```ts
function getCandidateKeys(): Array<{ name: string; key: string }> {
  const candidates = [
    { name: "GHL_SSO_KEY_LOCALIST", key: Deno.env.get("GHL_SSO_KEY_LOCALIST") },
    { name: "GHL_SSO_KEY_ALOMAR",   key: Deno.env.get("GHL_SSO_KEY_ALOMAR") },
    { name: "GHL_SSO_KEY_COOKY",    key: Deno.env.get("GHL_SSO_KEY_COOKY") },
    { name: "GHL_SSO_KEY",          key: Deno.env.get("GHL_SSO_KEY") }, // legacy unsuffixed
  ];
  return candidates.filter((c): c is { name: string; key: string } => !!c.key);
}
```

Update `tryDecryptPayload` to log **which** key+variant succeeded (`✅ Decrypted with GHL_SSO_KEY_ALOMAR variant 2`), and to log all configured key names on failure so we can immediately tell whether the right secret is even present.

Keep the existing payload-variant logic (base64url → base64, decodeURIComponent, whitespace strip) unchanged.

### 2. Verify the secret value
After deploying, if logs still show `Decryption failed (tried keys: GHL_SSO_KEY_LOCALIST, GHL_SSO_KEY_ALOMAR, ...)`, the actual shared secret in GHL Marketplace doesn't match any stored secret. In that case:
- Open GHL Marketplace → LocaList app → SSO → copy the **Shared Secret**
- Update Supabase secret `GHL_SSO_KEY_LOCALIST` to match (per memory rule: per-app suffixed secrets, never touch `GHL_SSO_KEY`)

### 3. Don't touch
- The HMAC/`GHL_SSO_KEY` rule from memory remains: we **add** suffixed candidates, we don't rename or delete `GHL_SSO_KEY`.
- Client-side `useGhlSso.ts` and `is-ghl-iframe.ts` are working correctly (logs show payloads of length 684 arriving at the function).

## Expected outcome
- Next SSO handshake either succeeds via a fallback key (proving the wrong secret was being used) **or** the failure log explicitly names every key tried, letting us pinpoint the GHL Marketplace secret to copy over.
- No change to the iframe handshake, magic-link flow, rep provisioning, or RLS.
