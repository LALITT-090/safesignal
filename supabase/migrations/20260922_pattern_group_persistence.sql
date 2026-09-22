-- Canonical SafeSignal Pattern Group persistence.
-- pattern_scores and pattern_reports are legacy remote tables and are intentionally untouched.
-- The alerts.pattern_group_id foreign key is deferred until existing alert IDs are reconciled.

CREATE TABLE IF NOT EXISTS public.pattern_groups (
  pattern_group_id text PRIMARY KEY,
  location_name text,
  area_name text,
  city text,
  latitude numeric,
  longitude numeric,
  safety_risk_score numeric NOT NULL DEFAULT 0,
  manipulation_score numeric NOT NULL DEFAULT 0,
  recent_count integer NOT NULL DEFAULT 0,
  previous_count integer NOT NULL DEFAULT 0,
  activity_change_percent numeric,
  activity_direction text NOT NULL DEFAULT 'stable',
  independent_reporter_signals integer NOT NULL DEFAULT 0,
  report_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  requires_human_review boolean NOT NULL DEFAULT false,
  location_similarity integer NOT NULL DEFAULT 0,
  time_similarity integer NOT NULL DEFAULT 0,
  category_similarity integer NOT NULL DEFAULT 0,
  behaviour_similarity integer NOT NULL DEFAULT 0,
  corroboration_score integer NOT NULL DEFAULT 0,
  reporter_diversity integer NOT NULL DEFAULT 0,
  connection_explanation jsonb NOT NULL DEFAULT '[]'::jsonb,
  suspicious boolean NOT NULL DEFAULT false,
  suspicious_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pattern_groups_id_format_check CHECK (pattern_group_id ~ '^PG-[A-F0-9]{6}$'),
  CONSTRAINT pattern_groups_risk_score_check CHECK (safety_risk_score >= 0 AND safety_risk_score <= 100),
  CONSTRAINT pattern_groups_manipulation_score_check CHECK (manipulation_score >= 0 AND manipulation_score <= 100),
  CONSTRAINT pattern_groups_counts_check CHECK (
    recent_count >= 0 AND previous_count >= 0 AND independent_reporter_signals >= 0 AND report_count >= 0
  ),
  CONSTRAINT pattern_groups_activity_direction_check CHECK (activity_direction IN ('rising', 'stable', 'declining', 'new')),
  CONSTRAINT pattern_groups_status_check CHECK (status IN ('active', 'deferred', 'resolved', 'stale'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_report_id_unique
  ON public.reports (report_id);

CREATE TABLE IF NOT EXISTS public.pattern_group_reports (
  pattern_group_id text NOT NULL,
  report_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pattern_group_id, report_id),
  CONSTRAINT pattern_group_reports_pattern_group_fk
    FOREIGN KEY (pattern_group_id)
    REFERENCES public.pattern_groups(pattern_group_id)
    ON DELETE CASCADE,
  CONSTRAINT pattern_group_reports_report_fk
    FOREIGN KEY (report_id)
    REFERENCES public.reports(report_id)
    ON DELETE CASCADE
);

ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS pattern_group_unresolved boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_pattern_groups_status
  ON public.pattern_groups (status);

CREATE INDEX IF NOT EXISTS idx_pattern_groups_requires_human_review
  ON public.pattern_groups (requires_human_review);

CREATE INDEX IF NOT EXISTS idx_pattern_groups_updated_at
  ON public.pattern_groups (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_pattern_group_reports_pattern_group_id
  ON public.pattern_group_reports (pattern_group_id);

CREATE INDEX IF NOT EXISTS idx_pattern_group_reports_report_id
  ON public.pattern_group_reports (report_id);

CREATE INDEX IF NOT EXISTS idx_alerts_pattern_group_id
  ON public.alerts (pattern_group_id);

ALTER TABLE public.pattern_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pattern_group_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pattern_groups'
      AND policyname = 'authority_pattern_groups_select'
  ) THEN
    CREATE POLICY "authority_pattern_groups_select"
      ON public.pattern_groups FOR SELECT
      USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pattern_group_reports'
      AND policyname = 'authority_pattern_group_reports_select'
  ) THEN
    CREATE POLICY "authority_pattern_group_reports_select"
      ON public.pattern_group_reports FOR SELECT
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Inserts/updates are performed by the server-side service-role analysis path.
-- No client write policies are created.
