ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS anonymous_token text;

CREATE INDEX IF NOT EXISTS idx_reports_anonymous_token
  ON public.reports (anonymous_token);
