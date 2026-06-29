const PRICES = {
  starter: "price_1TnnEeDs8qOzmPh3laJdY04H",
  team: "price_1TnnEeDs8qOzmPh30mTwcvMX",
  scale: "price_1TnnEeDs8qOzmPh3eYRPYsQR",
} as const;

export type PlanTier = keyof typeof PRICES;

export function getPriceId(tier: PlanTier): string {
  return PRICES[tier];
}

export function getTierFromPriceId(priceId: string): PlanTier | null {
  const entry = Object.entries(PRICES).find(([, id]) => id === priceId);
  return (entry?.[0] as PlanTier) || null;
}

export const PLAN_LABELS: Record<PlanTier, { name: string; price: string; features: string[] }> = {
  starter: {
    name: "Starter",
    price: "$29/mo",
    features: ["1 repository", "1 tone", "Basic changelog", "Manual commit input"],
  },
  team: {
    name: "Team",
    price: "$99/mo",
    features: ["5 repositories", "3 tones", "Multi-channel publish", "GitHub auto-fetch", "Email changelog"],
  },
  scale: {
    name: "Scale",
    price: "$299/mo",
    features: ["Unlimited repos", "Custom branding", "API access", "Priority support", "SSO"],
  },
};