-- 008_event_settings.sql
-- Add event_settings column to sessions for auto event slot management
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS event_settings JSONB NOT NULL DEFAULT '{"auto_enabled": true, "slots": []}';

-- Prevent duplicate event_log rows for the same slot (race condition guard)
CREATE UNIQUE INDEX IF NOT EXISTS event_logs_unique_slot
  ON event_logs (session_id, (payload->>'slotId'))
  WHERE payload->>'slotId' IS NOT NULL;
