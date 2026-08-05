
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS reviewed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL;
