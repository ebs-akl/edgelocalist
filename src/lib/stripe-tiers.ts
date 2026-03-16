/** Stripe product/price mapping for subscription tiers */

export type TierKey = "LOCALIST" | "SNACK PACK" | "EDGE BASIC";

export const TIERS: Record<TierKey, { name: string; price_id: string; product_id: string; price: number }> = {
  "LOCALIST": {
    name: "AKL LocaList",
    price_id: "price_1T5hH9AecJc70Cb5oJxNOmJJ",
    product_id: "prod_U3ouP5GYR2UtCT",
    price: 9,
  },
  "SNACK PACK": {
    name: "AKL Snack Pack",
    price_id: "price_1T5hHTAecJc70Cb5QhH0FRzX",
    product_id: "prod_U3ovoEBZGIHGd6",
    price: 16,
  },
  "EDGE BASIC": {
    name: "EdgeDMS",
    price_id: "price_1SW5i4AecJc70Cb5GBytGbCf",
    product_id: "prod_TT1lDpEK83RxB1",
    price: 97,
  },
};

/**
 * Legacy / sibling product IDs that grant LocaList access.
 * Maps legacy Stripe product IDs → the TierKey they should resolve to.
 */
const LEGACY_PRODUCT_MAP: Record<string, TierKey> = {
  "prod_TwBX6C6vQeILKX": "SNACK PACK",   // Alomar Standalone → treat as Snack Pack level
  "prod_U1kerkyaichRMD": "LOCALIST",       // Legacy Edge LocaList product
};

/** Resolve a Stripe product ID to a tier key */
export function tierFromProductId(productId: string | null): TierKey | null {
  if (!productId) return null;
  // Check current tiers first
  for (const [key, tier] of Object.entries(TIERS)) {
    if (tier.product_id === productId) return key as TierKey;
  }
  // Check legacy/sibling products
  return LEGACY_PRODUCT_MAP[productId] ?? null;
}
