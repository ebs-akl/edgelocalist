UPDATE public.localist_contacts SET geocode_failed_at = now()
WHERE latitude IS NULL AND geocode_failed_at IS NULL
  AND (address ~* '^\s*(p\.?\s*o\.?\s*box|post office box|box\s)' OR address ~ '^\s*#');