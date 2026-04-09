-- logApiRequest uses `${method} ${req.path}`; nested UUID routes exceed VARCHAR(100).
ALTER TABLE analytics_events
  ALTER COLUMN event_name TYPE VARCHAR(512);
