
CREATE OR REPLACE FUNCTION public.increment_sms_rate_limit(
  p_location_id TEXT,
  p_window_start TIMESTAMPTZ,
  p_count INTEGER,
  p_today TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.sms_rate_limits
  SET
    send_count = send_count + p_count,
    daily_count = CASE WHEN daily_start = p_today::date THEN daily_count + p_count ELSE p_count END,
    daily_start = p_today::date
  WHERE location_id = p_location_id AND window_start = p_window_start;
END;
$$;
