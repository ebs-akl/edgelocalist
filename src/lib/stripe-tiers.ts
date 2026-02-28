/** Stripe product/price mapping for subscription tiers */
export const TIERS = {
  standalone: {
    name: "Standalone",
    price_id: "price_1T5hH9AecJc70Cb5oJxNOmJJ",
    product_id: "prod_U3ouP5GYR2UtCT",
    price: 9,
  },
  snack_pack: {
    name: "Snack Pack",
    price_id: "price_1T5hHTAecJc70Cb5QhH0FRzX",
    product_id: "prod_U3ovoEBZGIHGd6",
    price: 16,
  },
} as const;

export type TierKey = keyof typeof TIERS;

/** Resolve a Stripe product ID to a tier key */
export function tierFromProductId(productId: string | null): TierKey | null {
  if (!productId) return null;
  for (const [key, tier] of Object.entries(TIERS)) {
    if (tier.product_id === productId) return key as TierKey;
  }
  return null;
}
