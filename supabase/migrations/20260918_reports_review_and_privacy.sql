ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS location_label text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_by text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE public.reports
  ALTER COLUMN description DROP NOT NULL;

ALTER TABLE public.reports
  ALTER COLUMN status SET DEFAULT 'submitted';

CREATE INDEX IF NOT EXISTS idx_reports_status
  ON public.reports (status);
