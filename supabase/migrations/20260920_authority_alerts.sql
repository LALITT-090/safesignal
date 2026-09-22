CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id uuid,
  alert_type text,
  title text,
  explanation text,
  severity text DEFAULT 'medium',
  status text DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS pattern_group_id text,
  ADD COLUMN IF NOT EXISTS risk_score numeric,
  ADD COLUMN IF NOT EXISTS manipulation_score numeric,
  ADD COLUMN IF NOT EXISTS report_count integer,
  ADD COLUMN IF NOT EXISTS independent_reporter_signals integer,
  ADD COLUMN IF NOT EXISTS activity_change_percent numeric,
  ADD COLUMN IF NOT EXISTS category_summary jsonb,
  ADD COLUMN IF NOT EXISTS general_location text,
  ADD COLUMN IF NOT EXISTS requires_human_review boolean,
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.alerts) = 0 THEN
    EXECUTE 'ALTER TABLE public.alerts ALTER COLUMN pattern_group_id SET NOT NULL';
    EXECUTE 'ALTER TABLE public.alerts ALTER COLUMN title SET NOT NULL';
    EXECUTE 'ALTER TABLE public.alerts ALTER COLUMN explanation SET NOT NULL';
    EXECUTE 'ALTER TABLE public.alerts ALTER COLUMN severity SET DEFAULT ''elevated''';
    EXECUTE 'ALTER TABLE public.alerts ALTER COLUMN severity SET NOT NULL';
    EXECUTE 'ALTER TABLE public.alerts ALTER COLUMN risk_score SET DEFAULT 0';
    EXECUTE 'ALTER TABLE public.alerts ALTER COLUMN risk_score SET NOT NULL';
    EXECUTE 'ALTER TABLE public.alerts ALTER COLUMN report_count SET DEFAULT 1';
    EXECUTE 'ALTER TABLE public.alerts ALTER COLUMN report_count SET NOT NULL';
    EXECUTE 'ALTER TABLE public.alerts ALTER COLUMN independent_reporter_signals SET DEFAULT 0';
    EXECUTE 'ALTER TABLE public.alerts ALTER COLUMN independent_reporter_signals SET NOT NULL';
    EXECUTE 'ALTER TABLE public.alerts ALTER COLUMN status SET DEFAULT ''new''';
    EXECUTE 'ALTER TABLE public.alerts ALTER COLUMN status SET NOT NULL';
    EXECUTE 'ALTER TABLE public.alerts ALTER COLUMN requires_human_review SET DEFAULT true';
    EXECUTE 'ALTER TABLE public.alerts ALTER COLUMN requires_human_review SET NOT NULL';
    EXECUTE 'ALTER TABLE public.alerts ALTER COLUMN created_at SET DEFAULT now()';
    EXECUTE 'ALTER TABLE public.alerts ALTER COLUMN created_at SET NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.alerts) = 0 THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'alerts_severity_safe_signal_check'
    ) THEN
      ALTER TABLE public.alerts
        ADD CONSTRAINT alerts_severity_safe_signal_check
        CHECK (severity IN ('elevated', 'high'));
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'alerts_risk_score_safe_signal_check'
    ) THEN
      ALTER TABLE public.alerts
        ADD CONSTRAINT alerts_risk_score_safe_signal_check
        CHECK (risk_score >= 0 AND risk_score <= 100);
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'alerts_report_count_safe_signal_check'
    ) THEN
      ALTER TABLE public.alerts
        ADD CONSTRAINT alerts_report_count_safe_signal_check
        CHECK (report_count > 0);
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'alerts_independent_reporter_signals_safe_signal_check'
    ) THEN
      ALTER TABLE public.alerts
        ADD CONSTRAINT alerts_independent_reporter_signals_safe_signal_check
        CHECK (independent_reporter_signals >= 0);
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'alerts_status_safe_signal_check'
    ) THEN
      ALTER TABLE public.alerts
        ADD CONSTRAINT alerts_status_safe_signal_check
        CHECK (status IN ('new', 'acknowledged', 'resolved'));
    END IF;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_pattern_group_active
  ON public.alerts (pattern_group_id)
  WHERE pattern_group_id IS NOT NULL AND status IN ('new', 'acknowledged');

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'alerts'
      AND policyname = 'authority_alerts_select'
  ) THEN
    CREATE POLICY "authority_alerts_select"
      ON public.alerts
      FOR SELECT
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'alerts'
      AND policyname = 'authority_alerts_insert'
  ) THEN
    CREATE POLICY "authority_alerts_insert"
      ON public.alerts
      FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'alerts'
      AND policyname = 'authority_alerts_update'
  ) THEN
    CREATE POLICY "authority_alerts_update"
      ON public.alerts
      FOR UPDATE
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'alerts'
      AND policyname = 'authority_alerts_delete'
  ) THEN
    CREATE POLICY "authority_alerts_delete"
      ON public.alerts
      FOR DELETE
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;
