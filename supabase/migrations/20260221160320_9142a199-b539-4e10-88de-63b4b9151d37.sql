
-- Rate limiting table for SMS sends
CREATE TABLE public.sms_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id TEXT NOT NULL,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT date_trunc('hour', now()),
  send_count INTEGER NOT NULL DEFAULT 0,
  daily_start DATE NOT NULL DEFAULT CURRENT_DATE,
  daily_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(location_id, window_start)
);

-- Enable RLS
ALTER TABLE public.sms_rate_limits ENABLE ROW LEVEL SECURITY;

-- No public access - only service role (edge functions) can access this table
-- RLS is enabled with no permissive policies = deny all for anon/authenticated
