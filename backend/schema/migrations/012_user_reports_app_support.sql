-- Extend user_reports for Help & Support submissions from the mobile app (no separate app_feedback table).
-- App rows: report_source = 'app_support', reported_user_id IS NULL, message in description, category in support_*.

ALTER TABLE user_reports
  ADD COLUMN IF NOT EXISTS report_source VARCHAR(20) NOT NULL DEFAULT 'user_vs_user',
  ADD COLUMN IF NOT EXISTS support_category VARCHAR(30),
  ADD COLUMN IF NOT EXISTS support_subject VARCHAR(200),
  ADD COLUMN IF NOT EXISTS email_delivered BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_error TEXT;

COMMENT ON COLUMN user_reports.report_source IS 'user_vs_user = report another user; app_support = Help & Support from mobile';
COMMENT ON COLUMN user_reports.support_category IS 'For app_support: bug_report | feedback | support';
COMMENT ON COLUMN user_reports.support_subject IS 'For app_support: user-visible subject line';
COMMENT ON COLUMN user_reports.email_delivered IS 'For app_support: whether SendGrid delivery to SENDGRID_TO_EMAIL succeeded';

ALTER TABLE user_reports DROP CONSTRAINT IF EXISTS user_reports_source_target_ck;

ALTER TABLE user_reports ALTER COLUMN reported_user_id DROP NOT NULL;

ALTER TABLE user_reports ADD CONSTRAINT user_reports_source_target_ck CHECK (
  (report_source = 'user_vs_user' AND reported_user_id IS NOT NULL)
  OR
  (report_source = 'app_support' AND reported_user_id IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_user_reports_report_source ON user_reports(report_source);
