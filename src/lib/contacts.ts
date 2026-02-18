export interface LocalistContact {
  id: string;
  rep_id: string;
  contact_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number | null;
  longitude: number | null;
  lifetime_value: number | null;
  last_order_date: string | null;
  source: 'csv' | 'ghl';
  updated_at: string;
  // Added by nearby_contacts RPC
  distance_miles?: number;
}

export interface NearbyContact {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lifetime_value: number | null;
  last_order_date: string | null;
  distance_miles: number;
}

export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits;
}

export function formatPhoneDisplay(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  return d;
}

export function formatCurrency(n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function stripAptFromAddress(address: string): string {
  return address
    .replace(/\s*(apt|unit|suite|ste|#|bldg|floor|fl)\s*[a-z0-9-]+/gi, "")
    .trim();
}

export function isPOBox(address: string): boolean {
  return /^\s*p\.?\s*o\.?\s*box/i.test(address);
}
